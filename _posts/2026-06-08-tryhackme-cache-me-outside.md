---
layout: post
title: "TryHackMe - Cache Me Outside Walkthrough"
category: TryHackMe
difficulty: Medium
tags: [thm, OSINT]
thumbnail: crosshair
---

# TryHackMe — Cache Me Outside

**Room:** Cache Me Outside  
**Category:** OSINT  
**Difficulty:** Medium  
**Platform:** TryHackMe  
**Author Writeup:** n4itr0-07  

---

## Overview

Cache Me Outside is a passive OSINT (Open Source Intelligence) challenge on TryHackMe. The objective is to reconstruct the identity of a retired hacker using only publicly available information scattered across multiple platforms. No exploitation, no brute forcing, and no active scanning against live systems is required, with one exception noted below. The entire investigation is built on a single starting artefact: a leaked conversation screenshot.

![Chat](/assets/img/cache-me-outside/conservation.png)
---

## Objectives

1. What is the retired hacker's full name?
2. What email address did he accidentally expose?
3. What is his phone number?
4. In which city is he located?
5. What is the name of the tram station where he got off on the 7th of May, 2026?

---

## Tools Used

| Tool | Purpose |
|---|---|
| Browser (Any) | Profile enumeration and platform browsing |
| Komoot (komoot.com) | Initial profile pivot point |
| GitHub | Commit metadata extraction |
| cURL | Fetching raw `.patch` files from GitHub |
| Google Reverse Image Search | Billboard geolocation |
| Threads (threads.com) | Social media post and photo analysis |
| Google Maps | Tram station identification |
| Email client | Out-of-office reply retrieval (active OSINT) |

---

## Step 1 — Initial Pivot: Komoot Profile

**Starting Point:** The leaked conversation screenshot (provided in the room).

The screenshot shows a Discord-style conversation between two users. One of them, going by the handle `JJ ^_^`, mentions transitioning away from hacking and taking up hiking and cycling. In the same message, they share a link to their Komoot profile:

```
https://www.komoot.com/user/5667624959835
```

Visiting this URL reveals a public profile. The profile displays a real display name, a bio written in first person confirming the subject is an ex-hacker now focused on outdoor activity, and a linked external website pointing directly to a GitHub account.

![Komoot profile showing display name, bio, and GitHub link](/assets/img/cache-me-outside/komoot.png)

**Answer 1:** `[REDACTED]`

---

## Step 2 — GitHub Commit Metadata: The .patch Technique

**Pivot:** GitHub account linked in the Komoot profile bio (`github.com/jiml33t`).

The GitHub profile confirms the same identity. It has one public repository, a profile README repository (the special `username/username` repo that GitHub renders on the profile page). The bio on GitHub adds further context: the subject describes himself as an ex-hacker who is now starting a security consulting firm and is an avid runner.

![GitHub profile page showing bio, organisation, and single repository](/assets/img/cache-me-outside/github.png)

The repository itself contains nothing sensitive on the surface. However, the room name *Cache Me Outside* is a deliberate hint toward cached or archived data. GitHub exposes raw `.patch` files for every commit, and these files include the full Git commit header, including the `From:` field, which reflects the **local Git configuration email** (`user.email` in `.gitconfig`) at the time the commit was made, not necessarily the email registered to the GitHub account.

The technique works as follows:

**Step 1 — Retrieve the commit SHA via the GitHub API:**

```bash
curl -s "https://api.github.com/repos/jiml33t/jiml33t/commits?per_page=1" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['sha'])"
```

**Step 2 — Fetch the raw `.patch` file for that commit:**

```bash
curl -sL "https://github.com/jiml33t/jiml33t/commit/<SHA>.patch" | head -10
```

The output of the patch file header looks like this:

```bash
From 7b2c8e0a540c36f2e09da5945066020621d6a059 Mon Sep 17 00:00:00 2001
From: jimleepro1-cell <[REDACTED]@gmail.com>
Date: Thu, 16 Apr 2026 03:27:19 -0400
Subject: [PATCH] Initial commit
```

![Raw .patch file output in browser showing From header with leaked email](/assets/img/cache-me-outside/email.png)

The `From:` line reveals both an older username (`jimleepro1-cell`) and, critically, the real email address that was configured in the subject's local Git client at the time of the commit. This is the accidentally exposed email address the room asks for.

**Why this works:** Git embeds the committer's locally configured email into every commit object. GitHub serves `.patch` files without any authentication requirement. Even if a repository is later deleted, these files are frequently cached by Wayback Machine or archive services.


**Answer 2:** `[REDACTED]@gmail.com`

---

## Step 3 — Out-of-Office Auto-Reply: Active OSINT

**Pivot:** The email address recovered from the `.patch` file.

This step is the only active OSINT technique in the room, as noted in the room's own disclaimer. Sending a message to the recovered email address triggers an automated out-of-office reply. Jim Lee had configured an auto-responder, which returns a message containing his phone number along with context about his current availability.

![Out-of-office auto-reply email containing phone number and 0x4A4C easter egg](/assets/img/cache-me-outside/email-reply.png)

The country code in the phone number is `+40`, which corresponds to Romania a detail that becomes significant in the next step.


**Answer 3:** `[REDACTED]`

---

## Step 4 — Geolocation via Reverse Image Search

**Pivot:** The older GitHub username `jimleepro1-cell` recovered from the `.patch` file, used to locate a Threads account.

Searching for the username `jiml33t` on Threads (threads.com) leads to the profile `@jiml33t`, displayed under the name JimLee. The profile was also reachable via the linked Instagram icon visible on the Threads profile page, navigating from `instagram.com/jiml33t` through to `threads.com/@jiml33t`.

![Thread](/assets/img/cache-me-outside/thread.png)

The Threads profile contains a single post dated **05/07/26** (May 7, 2026) with the caption:

> "Just finished my last run before the big day, hopping on the tram for my well-deserved coffee at my favourite French supermarket."

The post includes a street-level photo. The image shows a road, trees, and a visible billboard in the background with Romanian-language text. Performing a **Google Reverse Image Search** on the photo, combined with manually reading and searching the text on the billboard, identifies a specific Romanian company whose address is publicly listed on their own website.

That company is located in **[REDACTED]**, Romania, with their site describing their address as being at the end of a specific tram line consistent with the tram mentioned in the caption.

**Answer 4:** `[REDACTED]`

---

## Step 5 — Tram Station Identification via Google Maps

**Pivot:** The confirmed city and street from Step 4.

With the city and general street area identified, the final question requires finding the specific tram station where Jim Lee boarded on May 7, 2026.

The caption provides two further constraints:

- He boarded a **tram** near the location shown in the photo.
- He was heading to a **French supermarket** for coffee.

Opening Google Maps and navigating to the street identified in Step 4 reveals the local tram network in that area. Looking at the tram line that serves this street, the terminus station is visible on the map. Cross-referencing with the nearby presence of a French retail supermarket chain (Auchan) confirms the exact stop.

The tram station name is the answer to the final question.

**Answer 5:** `[REDACTED]`

---

## Full Investigation Chain

```yaml
Leaked conversation screenshot
        |
        v
Komoot profile (komoot.com/user/5667624959835)
        |
        +--> Full name [Answer 1]
        |
        v
GitHub profile (github.com/jiml33t)
        |
        v
Commit .patch file (raw metadata)
        |
        +--> Leaked email address [Answer 2]
        |
        v
Email out-of-office auto-reply
        |
        +--> Phone number [Answer 3]
        |
        v
Threads profile (@jiml33t) via username pivot
        |
        v
Street photo + Reverse image search + Billboard text
        |
        +--> City [Answer 4]
        |
        v
Google Maps + Tram network + French supermarket cross-reference
        |
        +--> Tram station name [Answer 5]
```

---

## Key Takeaways

**Git `.patch` files leak email.** GitHub serves raw commit patch files without authentication. The `From:` header reflects the local `.gitconfig` email at commit time, not the registered GitHub account email, and persists even after repository deletion if cached.

**Out-of-office replies are an OSINT goldmine.** One email to a leaked address can return a phone number, job title, or operational schedules at zero cost.

**Background text in photos geolocates precisely.** A single billboard was enough to identify a city, street, and tram line. Overlooked background details are often the most identifying elements in an image.

**Username reuse chains platforms.** One handle across Komoot, GitHub, Instagram, and Threads turned four separate profiles into a single unified identity.

**OpSec failures compound.** No individual leak here was catastrophic in isolation. Combined, they produced a complete real-world profile across five data points.