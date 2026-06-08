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
    const langClass = code ? [...code.classList].find(c => c.startsWith('language-')) : null;
    const lang = langClass ? langClass.replace('language-', '') : 'code';

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
  });

  // ─── Copy Button Handler ──────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const code = btn.closest('.code-block').querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.innerText).then(() => {
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

  // ─── Mobile Sidebar Toggle ────────────────────────────────────
  const hamburger = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
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
});
