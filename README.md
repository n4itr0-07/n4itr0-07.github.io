# n4itr0-07.github.io

Personal cybersecurity blog and CTF writeup wiki. Built with Jekyll and deployed on GitHub Pages.

## Adding a new writeup

Create a new file in `_posts/` with the format `YYYY-MM-DD-title.md` and add the front matter:

```yaml
---
layout: post
title: "Platform - Machine Name"
date: YYYY-MM-DD
category: TryHackMe  # or HackTheBox
difficulty: Easy  # Easy, Medium, Hard, Insane
tags: [tag1, tag2, tag3]
excerpt: "Brief description"
thumbnail: terminal  # crosshair, cube, shield, terminal, flag
---

Your writeup content here...
```

## Local development

```bash
bundle install
bundle exec jekyll serve
```

Visit `http://localhost:4000`