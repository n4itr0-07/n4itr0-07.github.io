---
title: TryHackMe - Mr. Robot Walkthrough
date: 2026-06-08
tags: web, privesc, wordpress, linux, thm, oscp-style
difficulty: Medium
summary: A comprehensive walkthrough of the Mr. Robot CTF challenge on TryHackMe covering Nmap scans, WordPress enumeration, credential cracking, and Linux privilege escalation.
---

# TryHackMe: Mr. Robot Walkthrough

This is a walkthrough for the **Mr. Robot** room on TryHackMe. This machine is inspired by the Mr. Robot show and has three hidden keys that we need to find. Let's get started!

---

## 1. Reconnaissance & Scanning

We start by running an Nmap scan against the target IP to discover open ports and services.

```bash
nmap -sC -sV -oN nmap_initial.txt 10.10.124.88
```

The output of the scan shows two ports open:
- `80/tcp` - HTTP (Apache httpd)
- `443/tcp` - HTTPS (Apache httpd)

> [!NOTE]
> Standard SSL/TLS settings are present, and SSH (port 22) appears to be closed or filtered on this machine.

---

## 2. Web Enumeration

Visiting the website on port 80 shows an interactive Mr. Robot themed interface. Let's perform a directory search using Gobuster to find hidden endpoints.

```bash
gobuster dir -u http://10.10.124.88 -w /usr/share/wordlists/dirb/common.txt
```

This reveals several interesting files and directories:
- `/robots.txt`
- `/wp-login.php` (WordPress login panel)
- `/license`

### Extracting Key 1
Visiting `/robots.txt` reveals two entries:
```text
User-agent: *
fsocity.dic
key-1-of-3.txt
```

We can directly download `key-1-of-3.txt` by browsing to `http://10.10.124.88/key-1-of-3.txt`!

---

## 3. WordPress Exploitation

The `/robots.txt` file also contained `fsocity.dic`, which is a large wordlist. We can download this wordlist and clean it (since it contains many duplicates) to use for brute-forcing the WordPress login screen at `/wp-login.php`.

Let's clean the dictionary file:
```bash
sort -u fsocity.dic > clean_wordlist.txt
```

Now, we can use a Python script or Hydra to perform user enumeration on the WordPress login panel. WordPress behaves differently if a username exists versus if it doesn't:

```python
import requests

url = "http://10.10.124.88/wp-login.php"
wordlist = "clean_wordlist.txt"

with open(wordlist, "r") as f:
    for line in f:
        username = line.strip()
        response = requests.post(url, data={"log": username, "pwd": "password"})
        if "Invalid username" not in response.text:
            print(f"[+] Found valid username: {username}")
            break
```

After running the script, we discover the username: `Elliot`.

Now we brute-force Elliot's password using the same wordlist. After a short period, we find the credentials:
- **Username:** `elliot`
- **Password:** `ER28-0652` (example password)

---

## 4. Privilege Escalation

Once logged into WordPress, we navigate to the Theme Editor and edit the `404.php` template to insert a PHP reverse shell. After triggering the 404 page, we capture a shell as the `daemon` user.

We search the system and locate the home directory of `robot`, where the second key is located. However, we cannot read it yet because it is owned by the user `robot`.

We check for SUID binaries:
```bash
find / -perm -u=s -type f 2>/dev/null
```

We see that `/usr/local/bin/nmap` has the SUID bit set! Since older versions of Nmap have an interactive mode, we can exploit this to spawn a shell as root:

```bash
nmap --interactive
!sh
```

Now we have root! We can read both `/home/robot/key-2-of-3.txt` and `/root/key-3-of-3.txt`.

### Key Summary
1. **Key 1:** `070bc7...` (Web Directory)
2. **Key 2:** `82292b...` (Robot Home Directory)
3. **Key 3:** `04a8b7...` (Root Directory)

Mission accomplished! 😎
