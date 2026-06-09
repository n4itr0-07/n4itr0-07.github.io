document.addEventListener('DOMContentLoaded', () => {
  // ─── Theme Toggle ─────────────────────────────────────────────
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const updateIcons = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      const sun = toggle.querySelector('.icon-sun');
      const moon = toggle.querySelector('.icon-moon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'block' : 'none';
        moon.style.display = theme === 'dark' ? 'none' : 'block';
      }
    };
    updateIcons();
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcons();
    });
  }

  // ─── Code Block Enhancement ───────────────────────────────────
  document.querySelectorAll('div.highlight').forEach(block => {
    const code = block.querySelector('code');
    
    // Find language class by checking code element, pre element, the block, or the block's parent wrapper
    let lang = 'code';
    const elementsToCheck = [
      code,
      block.querySelector('pre'),
      block,
      block.parentElement
    ];
    for (const el of elementsToCheck) {
      if (el) {
        const found = [...el.classList].find(c => c.startsWith('language-'));
        if (found) {
          lang = found.replace('language-', '');
          break;
        }
      }
    }

    if (lang === 'plaintext') {
      lang = 'text';
    }

    if (code && ['bash', 'sh', 'shell', 'cmd'].includes(lang)) {
      const updatedHTML = code.innerHTML.replace(/(^|\n)([\w.-]+@[\w.-]+[:~][\w/.-]*\s*[\$#]\s*|[\$#]\s+)/g, '$1<span class="shell-prompt">$2</span>');
      code.innerHTML = updatedHTML;
    }

    const langColors = {
      bash: '#22c55e', shell: '#22c55e', sh: '#22c55e',
      python: '#3b82f6', py: '#3b82f6',
      javascript: '#f59e0b', js: '#f59e0b',
      html: '#f97316', css: '#a855f7',
      sql: '#06b6d4', ruby: '#ef4444',
      text: '#6b6b72', cmd: '#3b82f6',
    };
    const color = langColors[lang] || '#6b6b72';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const header = document.createElement('div');
    header.className = 'code-header';
    header.innerHTML = `
      <div class="mac-dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <span class="code-lang" style="color: ${color}">${lang.toUpperCase()}</span>
      <button class="copy-btn" aria-label="Copy code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy
      </button>
    `;

    block.parentNode.insertBefore(wrapper, block);
    wrapper.appendChild(header);
    wrapper.appendChild(block);

    if (code) {
      const codeLines = code.innerText.trim().split('\n').length;
      if (codeLines > 15) {
        wrapper.classList.add('collapsible', 'collapsed');
        
        const toggleBar = document.createElement('div');
        toggleBar.className = 'code-collapse-toggle';
        toggleBar.innerHTML = `<button class="collapse-btn" aria-label="Show more lines of code">Show More</button>`;
        
        const btn = toggleBar.querySelector('.collapse-btn');
        btn.addEventListener('click', () => {
          const isCollapsed = wrapper.classList.toggle('collapsed');
          btn.textContent = isCollapsed ? 'Show More' : 'Show Less';
          btn.setAttribute('aria-label', isCollapsed ? 'Show more lines of code' : 'Show fewer lines of code');
          if (isCollapsed) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
        
        wrapper.appendChild(toggleBar);
      }
    }
  });

  // ─── Copy Button Handler ──────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const code = btn.closest('.code-block').querySelector('code');
    if (!code) return;
    let textToCopy = '';
    if (code.querySelector('.shell-prompt')) {
      const clone = code.cloneNode(true);
      clone.querySelectorAll('.shell-prompt').forEach(el => el.remove());
      textToCopy = clone.innerText;
    } else {
      textToCopy = code.innerText;
    }
    
    textToCopy = textToCopy.replace(/\r\n/g, '\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      btn.style.color = '#22c55e';
      btn.style.borderColor = '#22c55e';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  });

  // ─── Post Card Click Handler ──────────────────────────────────
  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('button')) return;
      const link = card.querySelector('.card-title a');
      if (link) link.click();
    });
  });

  // ─── Mobile Sidebar Toggle ────────────────────────────────────
  const hamburger = document.querySelector('.mobile-menu-btn');

  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.mobile-overlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    });
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      });
    }
  }

  // ─── Smooth Scroll for Anchor Links ───────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      if (anchor.hasAttribute('data-tag-filter')) return; // Let hashchange handle it
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, null, targetId);
      }
    });
  });

  // ─── Active Nav Highlight on Scroll ───────────────────────────
  const sections = document.querySelectorAll('section[id], h2[id], h3[id]');
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-item a');

  if (sections.length > 0 && navLinks.length > 0) {
    const observerOptions = {
      rootMargin: '-20% 0px -80% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('#' + id)) {
              link.parentElement.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }

  // ─── Global Search Logic ──────────────────────────────────────
  const searchInput = document.getElementById('global-search-input');
  const searchResults = document.getElementById('global-search-results');
  let searchIndex = null;

  if (searchInput && searchResults) {
    const fetchSearchIndex = async () => {
      if (searchIndex) return;
      try {
        const response = await fetch('/search.json');
        if (response.ok) {
          searchIndex = await response.json();
        }
      } catch (err) {
        console.error('Failed to fetch search index:', err);
      }
    };

    searchInput.addEventListener('focus', fetchSearchIndex);

    searchInput.addEventListener('input', async () => {
      await fetchSearchIndex();
      const query = searchInput.value.toLowerCase().trim();
      
      if (!query) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
      }

      if (!searchIndex) return;

      const filtered = searchIndex.filter(post => {
        return (
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query) ||
          post.category.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
        );
      });

      searchResults.classList.add('active');

      if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No writeups found.</div>';
        return;
      }

      searchResults.innerHTML = filtered.map(post => `
        <a href="${post.url}" class="search-result-item">
          <span class="search-result-title">${post.title}</span>
          <span class="search-result-meta">
            <span>${post.category}</span>
            <span>${post.date}</span>
          </span>
        </a>
      `).join('');
    });

    // Keyboard shortcuts for search
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.blur();
          searchResults.classList.remove('active');
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  }

  // ─── Multi-Select Tag Filtering (Tags Page) ───────────────────
  const tagChips = document.querySelectorAll('[data-tag-filter]');
  const tagGroups = document.querySelectorAll('.tag-section-group');

  if (tagChips.length > 0 && tagGroups.length > 0) {
    let selectedTags = [];

    const updateTagFilter = () => {
      // 1. Update visual active states of chips
      tagChips.forEach(chip => {
        const tag = chip.getAttribute('data-tag-filter');
        if (tag === 'all') {
          chip.classList.toggle('active', selectedTags.length === 0);
        } else {
          chip.classList.toggle('active', selectedTags.includes(tag));
        }
      });

      // 2. Filter posts and hide empty sections
      tagGroups.forEach(group => {
        let visibleCount = 0;
        const cards = group.querySelectorAll('.post-card');

        cards.forEach(card => {
          const cardTagsAttr = card.getAttribute('data-tags');
          const cardTags = cardTagsAttr ? cardTagsAttr.split(',') : [];
          
          // Post must contain ALL selected tags
          const matches = selectedTags.every(tag => cardTags.includes(tag));

          if (matches) {
            card.style.display = 'grid';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        // Hide whole section if no posts match the query
        if (visibleCount > 0) {
          group.style.display = 'block';
        } else {
          group.style.display = 'none';
        }
      });
    };

    const parseHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash || hash === 'all') {
        selectedTags = [];
      } else {
        selectedTags = hash.split('+').filter(t => t.length > 0);
      }
      updateTagFilter();
    };

    tagChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const tag = chip.getAttribute('data-tag-filter');
        
        if (tag === 'all') {
          selectedTags = [];
        } else {
          if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
          } else {
            selectedTags.push(tag);
          }
        }

        // Update URL hash without reload
        if (selectedTags.length > 0) {
          history.replaceState(null, null, '#' + selectedTags.join('+'));
        } else {
          history.replaceState(null, null, '#all');
        }

        updateTagFilter();
      });
    });

    // Handle hash change and page load
    window.addEventListener('hashchange', parseHash);
    parseHash();
  }

  // ─── Reading Progress Bar ──────────────────────────────────────
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    if (document.querySelector('.post-page')) {
      const updateProgressBar = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
      };
      window.addEventListener('scroll', updateProgressBar, { passive: true });
      window.addEventListener('resize', updateProgressBar, { passive: true });
      updateProgressBar();
    } else {
      progressBar.style.display = 'none';
    }
  }

  // ─── Table of Contents (TOC) ───────────────────────────────────
  const tocList = document.getElementById('post-toc-list');
  const tocSidebar = document.querySelector('.post-toc-sidebar');
  const postPage = document.querySelector('.post-page');
  
  if (tocList && postPage) {
    const headers = Array.from(postPage.querySelectorAll('.post-content h2, .post-content h3'));
    
    if (headers.length < 2) {
      if (tocSidebar) tocSidebar.style.display = 'none';
    } else {
      headers.forEach((header, index) => {
        if (!header.id) {
          header.id = header.textContent.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        }
        
        const li = document.createElement('li');
        li.className = `post-toc-item level-${header.tagName.toLowerCase() === 'h3' ? '3' : '2'}`;
        
        // Add step checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'toc-step-check';
        checkbox.setAttribute('aria-label', `Mark ${header.textContent.trim()} as completed`);
        
        // Load state
        const storageKey = `${window.location.pathname}-toc-${index}`;
        const isCompleted = localStorage.getItem(storageKey) === 'true';
        checkbox.checked = isCompleted;
        if (isCompleted) {
          li.classList.add('completed');
        }
        
        checkbox.addEventListener('change', () => {
          localStorage.setItem(storageKey, checkbox.checked);
          li.classList.toggle('completed', checkbox.checked);
        });
        
        const a = document.createElement('a');
        a.href = `#${header.id}`;
        a.className = 'post-toc-link';
        a.textContent = header.textContent.replace(/^~\s*/, '').replace(/#+/, '').trim();
        
        li.appendChild(checkbox);
        li.appendChild(a);
        tocList.appendChild(li);
      });
      
      const tocItems = tocList.querySelectorAll('.post-toc-item');
      const observerOptions = {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
      };
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const activeId = entry.target.id;
            tocItems.forEach(item => {
              const link = item.querySelector('a');
              if (link && link.getAttribute('href') === `#${activeId}`) {
                item.classList.add('active');
                if (tocSidebar) {
                  const itemTop = item.offsetTop;
                  const sidebarHeight = tocSidebar.offsetHeight;
                  if (itemTop > tocSidebar.scrollTop + sidebarHeight || itemTop < tocSidebar.scrollTop) {
                    tocSidebar.scrollTop = itemTop - sidebarHeight / 2;
                  }
                }
              } else {
                item.classList.remove('active');
              }
            });
          }
        });
      }, observerOptions);
      
      headers.forEach(header => observer.observe(header));
    }
  }

  // ─── Interactive GFM Checklists ───────────────────────────────
  const gfmCheckboxes = document.querySelectorAll('.post-content input[type="checkbox"]');
  gfmCheckboxes.forEach((checkbox, index) => {
    checkbox.removeAttribute('disabled');
    const storageKey = `${window.location.pathname}-gfm-${index}`;
    
    const isChecked = localStorage.getItem(storageKey) === 'true';
    checkbox.checked = isChecked;
    
    const li = checkbox.closest('li');
    if (li) {
      li.classList.add('task-list-item');
      li.classList.toggle('checked', isChecked);
    }
    
    checkbox.addEventListener('change', () => {
      localStorage.setItem(storageKey, checkbox.checked);
      if (li) {
        li.classList.toggle('checked', checkbox.checked);
      }
    });
  });

  // ─── Radial Back to Top Button ─────────────────────────────────
  const backToTopBtn = document.getElementById('back-to-top');
  const progressFill = document.querySelector('.back-to-top-progress-fill');
  
  if (backToTopBtn) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    
    if (progressFill) {
      progressFill.style.strokeDasharray = circumference;
      progressFill.style.strokeDashoffset = circumference;
    }

    const updateScrollProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (scrollTop > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
      
      if (progressFill && docHeight > 0) {
        const progress = scrollTop / docHeight;
        const offset = circumference - (progress * circumference);
        progressFill.style.strokeDashoffset = offset;
      }
    };
    
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress, { passive: true });
    updateScrollProgress();
  }

  // ─── Homepage Live Feed Filters ────────────────────────────────
  const filterButtons = document.querySelectorAll('[data-filter-difficulty], [data-filter-platform]');
  const postCards = document.querySelectorAll('.posts-feed .post-card');
  
  if (filterButtons.length > 0 && postCards.length > 0) {
    let activeDifficulty = 'all';
    let activePlatform = 'all';
    
    const filterFeed = () => {
      postCards.forEach(card => {
        const diff = card.getAttribute('data-difficulty') || '';
        const plat = card.getAttribute('data-category') || '';
        
        const matchDiff = (activeDifficulty === 'all' || diff === activeDifficulty);
        const matchPlat = (activePlatform === 'all' || plat === activePlatform);
        
        if (matchDiff && matchPlat) {
          card.style.display = 'grid';
        } else {
          card.style.display = 'none';
        }
      });
    };
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.parentElement;
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (btn.hasAttribute('data-filter-difficulty')) {
          activeDifficulty = btn.getAttribute('data-filter-difficulty');
        }
        if (btn.hasAttribute('data-filter-platform')) {
          activePlatform = btn.getAttribute('data-filter-platform');
        }
        
        filterFeed();
      });
    });
  }

  // ─── Visited / Solved Status Indicator ─────────────────────────
  if (document.querySelector('.post-page')) {
    const solvedKey = `solved-${window.location.pathname}`;
    localStorage.setItem(solvedKey, 'true');
  }

  document.querySelectorAll('.post-card').forEach(card => {
    const link = card.querySelector('.card-title a');
    if (link) {
      let path = '';
      try {
        path = new URL(link.href).pathname;
      } catch (e) {
        path = link.getAttribute('href');
      }
      
      const solvedKey = `solved-${path}`;
      if (localStorage.getItem(solvedKey) === 'true') {
        const meta = card.querySelector('.card-meta');
        if (meta && !meta.querySelector('.solved-badge')) {
          const solvedBadge = document.createElement('span');
          solvedBadge.className = 'solved-badge';
          solvedBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg> SOLVED`;
          meta.appendChild(solvedBadge);
        }
      }
    }
  });
});


