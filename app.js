// Cybersecurity Wiki Application Controller
(function() {
    // App State
    const state = {
        writeups: [],
        tags: [],
        currentTheme: 'dark',
        activeCategory: 'all',
        activeTag: null,
        activeWriteup: null
    };

    // DOM Elements
    const elements = {
        app: document.getElementById('app'),
        sidebar: document.getElementById('sidebar'),
        sidebarNav: document.getElementById('sidebarNav'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        menuToggleBtn: document.getElementById('menuToggleBtn'),
        sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        logoLink: document.getElementById('logoLink'),
        breadcrumbs: document.getElementById('breadcrumbs'),
        pageContainer: document.getElementById('pageContainer'),
        
        // Views
        homeView: document.getElementById('homeView'),
        readerView: document.getElementById('readerView'),
        
        // Home View elements
        statTotal: document.getElementById('statTotal'),
        statTHM: document.getElementById('statTHM'),
        statHTB: document.getElementById('statHTB'),
        mainSearchInput: document.getElementById('mainSearchInput'),
        sidebarSearchInput: document.getElementById('sidebarSearchInput'),
        categoryTabs: document.getElementById('categoryTabs'),
        writeupsGrid: document.getElementById('writeupsGrid'),
        tagsCloud: document.getElementById('tagsCloud'),
        activeTagIndicator: document.getElementById('activeTagIndicator'),
        activeTagBadge: document.getElementById('activeTagBadge'),
        clearTagFilterBtn: document.getElementById('clearTagFilterBtn'),
        
        // Reader View elements
        readerCategory: document.getElementById('readerCategory'),
        readerDate: document.getElementById('readerDate'),
        readerDifficulty: document.getElementById('readerDifficulty'),
        readerTitle: document.getElementById('readerTitle'),
        readerTags: document.getElementById('readerTags'),
        markdownContent: document.getElementById('markdownContent'),
        prevPostBtn: document.getElementById('prevPostBtn'),
        prevPostTitle: document.getElementById('prevPostTitle'),
        nextPostBtn: document.getElementById('nextPostBtn'),
        nextPostTitle: document.getElementById('nextPostTitle'),
        
        // TOC Sidebar
        tocSidebar: document.getElementById('tocSidebar'),
        tocList: document.getElementById('tocList'),
        
        // Lightbox
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        lightboxClose: document.getElementById('lightboxClose')
    };

    // Initialize application
    async function init() {
        setupTheme();
        setupEventListeners();
        setupMarkedRenderer();
        
        try {
            await fetchDatabase();
            renderSidebar();
            handleRouting();
        } catch (error) {
            console.error('Initialization failed:', error);
            showError('Failed to load wiki database. Please make sure writeups.json is compiled.');
        }
    }

    // Set up themes (dark by default)
    function setupTheme() {
        const savedTheme = localStorage.getItem('wiki-theme') || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        state.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('wiki-theme', theme);

        // Update Prism theme file dynamically if needed (Optional, Tomorrow Night is dark and readable for code)
        const prismTheme = document.getElementById('prism-theme-link');
        if (prismTheme) {
            if (theme === 'light') {
                // Keep tomorrow-night theme for contrast, or use default light prism theme
                prismTheme.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');
            } else {
                prismTheme.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css');
            }
        }
    }

    // Custom copy text function available globally for terminal boxes
    window.copyTerminalText = function(button) {
        const pre = button.parentElement.nextElementSibling;
        const code = pre.querySelector('code');
        const text = code.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.color = '#10b981';
            button.style.borderColor = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
                button.style.borderColor = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Overriding Marked code block rendering
    function setupMarkedRenderer() {
        if (typeof marked === 'undefined') return;

        const renderer = new marked.Renderer();
        
        // Wrap command/bash code blocks inside a terminal UI
        renderer.code = function(code, language) {
            const cleanLang = (language || '').toLowerCase().trim();
            const terminalLangs = ['bash', 'shell', 'terminal', 'cmd', 'powershell', 'sh'];
            
            if (terminalLangs.includes(cleanLang)) {
                const escapedCode = code
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                const title = cleanLang === 'cmd' ? 'C:\\Windows\\system32\\cmd.exe' : 'n4itr0-07@localhost:~';
                
                return `
                <div class="terminal-block">
                    <div class="terminal-header">
                        <div class="terminal-controls">
                            <div class="terminal-dot close"></div>
                            <div class="terminal-dot minimize"></div>
                            <div class="terminal-dot maximize"></div>
                        </div>
                        <span class="terminal-title">${title}</span>
                        <button class="terminal-copy-btn" onclick="copyTerminalText(this)">Copy</button>
                    </div>
                    <pre class="terminal-body"><code class="language-bash">${escapedCode}</code></pre>
                </div>`;
            }
            
            // Standard marked fallback for non-terminal languages (Python, PHP, etc.)
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<pre><code class="language-${cleanLang}">${escapedCode}</code></pre>`;
        };

        marked.use({ renderer });
    }

    // Attach listeners
    function setupEventListeners() {
        // Theme switch
        elements.themeToggleBtn.addEventListener('click', () => {
            const nextTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
        });

        // Mobile sidebar toggles
        elements.menuToggleBtn.addEventListener('click', () => {
            elements.app.classList.add('sidebar-open');
        });
        
        elements.sidebarCloseBtn.addEventListener('click', () => {
            elements.app.classList.remove('sidebar-open');
        });

        elements.sidebarOverlay.addEventListener('click', () => {
            elements.app.classList.remove('sidebar-open');
        });

        // Search inputs
        elements.mainSearchInput.addEventListener('input', (e) => {
            elements.sidebarSearchInput.value = e.target.value;
            renderHomeList();
        });

        elements.sidebarSearchInput.addEventListener('input', (e) => {
            elements.mainSearchInput.value = e.target.value;
            
            // If we are reading a post, typing in sidebar search should redirect to home view and filter
            if (window.location.hash !== '' && window.location.hash !== '#') {
                window.location.hash = '#';
                // Wait for route change to update input
                setTimeout(() => {
                    elements.mainSearchInput.focus();
                }, 50);
            }
            
            renderHomeList();
        });

        // Category Tab Switchers
        elements.categoryTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab-btn');
            if (!tab) return;

            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');

            state.activeCategory = tab.dataset.category;
            renderHomeList();
        });

        // Tag Indicator close filter
        elements.clearTagFilterBtn.addEventListener('click', () => {
            clearTagFilter();
        });

        // Logo clicks goes to homepage
        elements.logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#';
        });

        // Route change listener
        window.addEventListener('hashchange', handleRouting);

        // Lightbox clicks close
        elements.lightbox.addEventListener('click', () => {
            elements.lightbox.classList.remove('active');
        });
        elements.lightboxClose.addEventListener('click', () => {
            elements.lightbox.classList.remove('active');
        });

        // Table of Contents Scroll spy logic
        elements.pageContainer.addEventListener('scroll', throttle(handleScrollSpy, 100));
    }

    // Fetch catalog database
    async function fetchDatabase() {
        const response = await fetch('writeups.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        state.writeups = data.writeups || [];
        state.tags = data.tags || [];

        updateStats();
    }

    // Display counts in the dashboard hero
    function updateStats() {
        elements.statTotal.textContent = state.writeups.length;
        elements.statTHM.textContent = state.writeups.filter(w => w.categoryId === 'tryhackme').length;
        elements.statHTB.textContent = state.writeups.filter(w => w.categoryId === 'hackthebox').length;
    }

    // Render tree navigation links in left sidebar
    function renderSidebar() {
        if (state.writeups.length === 0) {
            elements.sidebarNav.innerHTML = '<div class="nav-loading">No writeups loaded.</div>';
            return;
        }

        // Group writeups by categoryId
        const groups = {};
        state.writeups.forEach(w => {
            if (!groups[w.categoryId]) {
                groups[w.categoryId] = {
                    name: w.category,
                    items: []
                };
            }
            groups[w.categoryId].items.push(w);
        });

        let navHTML = '';
        for (const catId in groups) {
            const group = groups[catId];
            navHTML += `
            <div class="nav-group">
                <div class="nav-group-title">${group.name}</div>
                <ul class="nav-list">
                    ${group.items.map(item => `
                        <li class="nav-item" data-id="${item.id}" data-category="${item.categoryId}">
                            <a href="#${item.categoryId}/${item.id}" class="nav-item-link">${item.title.replace(`${item.category} - `, '')}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>`;
        }

        elements.sidebarNav.innerHTML = navHTML;
    }

    // Highlight active sidebar item
    function updateSidebarActiveItem(categoryId, writeupId) {
        document.querySelectorAll('.nav-item').forEach(el => {
            const match = el.dataset.id === writeupId && el.dataset.category === categoryId;
            el.classList.toggle('active', match);
        });
    }

    // Render homepage writeups explorer list
    function renderHomeList() {
        const query = elements.mainSearchInput.value.toLowerCase().trim();
        
        // Filter
        let filtered = state.writeups;

        // Category filter
        if (state.activeCategory !== 'all') {
            filtered = filtered.filter(w => w.categoryId === state.activeCategory);
        }

        // Tag filter
        if (state.activeTag) {
            filtered = filtered.filter(w => w.tags.map(t => t.toLowerCase()).includes(state.activeTag));
            elements.activeTagBadge.textContent = state.activeTag;
            elements.activeTagIndicator.style.display = 'inline-flex';
        } else {
            elements.activeTagIndicator.style.display = 'none';
        }

        // Query text filter
        if (query) {
            filtered = filtered.filter(w => 
                w.title.toLowerCase().includes(query) || 
                w.summary.toLowerCase().includes(query) ||
                w.category.toLowerCase().includes(query) ||
                w.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Render Cards Grid
        if (filtered.length === 0) {
            elements.writeupsGrid.innerHTML = `
            <div class="card-no-results">
                <h3>No writeups found</h3>
                <p>Try refining your search text, choosing a different category, or removing filters.</p>
            </div>`;
        } else {
            elements.writeupsGrid.innerHTML = filtered.map(w => `
            <div class="writeup-card" onclick="window.location.hash = '#${w.categoryId}/${w.id}'">
                <div class="card-meta">
                    <span class="card-category">${w.category}</span>
                    <span class="meta-divider">•</span>
                    <span class="card-date">${w.date}</span>
                    <span class="meta-divider">•</span>
                    <span class="card-difficulty ${w.difficulty.toLowerCase()}">${w.difficulty}</span>
                </div>
                <h3 class="card-title">${w.title}</h3>
                <p class="card-summary">${w.summary}</p>
                <div class="card-tags">
                    ${w.tags.map(tag => `<span class="tag-badge" onclick="event.stopPropagation(); filterByTag('${tag.toLowerCase()}')">${tag}</span>`).join('')}
                </div>
            </div>`).join('');
        }

        // Render Tag Cloud
        renderTagCloud();
    }

    // Render tag cloud in the explorer right sidebar
    function renderTagCloud() {
        if (state.tags.length === 0) {
            elements.tagsCloud.innerHTML = '<span class="nav-loading">No tags</span>';
            return;
        }

        elements.tagsCloud.innerHTML = state.tags.map(tag => {
            const isActive = state.activeTag === tag;
            return `<span class="tag-badge ${isActive ? 'active' : ''}" onclick="filterByTag('${tag}')">${tag}</span>`;
        }).join('');
    }

    // Filter list by a tag
    window.filterByTag = function(tag) {
        state.activeTag = tag;
        // If we are currently in reader view, go home first
        if (window.location.hash !== '' && window.location.hash !== '#') {
            window.location.hash = '#';
        }
        renderHomeList();
    };

    function clearTagFilter() {
        state.activeTag = null;
        renderHomeList();
    }

    // Routing controller
    function handleRouting() {
        const hash = window.location.hash;
        
        // Close sidebar drawer on mobile after navigation
        elements.app.classList.remove('sidebar-open');

        // Check if hash has anchor link like #tryhackme/mr-robot#1-reconnaissance
        const hashParts = hash.slice(1).split('#');
        const routePath = hashParts[0] || '';
        const anchorId = hashParts[1] || '';

        // If path is empty, show home
        if (!routePath) {
            showHomeView();
            return;
        }

        const routeSplit = routePath.split('/');
        if (routeSplit.length >= 2) {
            const categoryId = routeSplit[0];
            const writeupId = routeSplit[1];

            // If we are already displaying this writeup, we just want to jump to anchor if present
            if (state.activeWriteup && state.activeWriteup.id === writeupId && state.activeWriteup.categoryId === categoryId) {
                if (anchorId) {
                    scrollToAnchor(anchorId);
                }
                return;
            }

            // Find writeup
            const writeup = state.writeups.find(w => w.id === writeupId && w.categoryId === categoryId);
            if (writeup) {
                loadWriteup(writeup, anchorId);
            } else {
                showError('Writeup not found. It may have been renamed or deleted.');
            }
        } else {
            showHomeView();
        }
    }

    // Display Home panel
    function showHomeView() {
        state.activeWriteup = null;
        
        // Update breadcrumbs
        elements.breadcrumbs.innerHTML = `
            <span class="breadcrumb-item active">Home</span>
        `;
        
        elements.readerView.style.display = 'none';
        elements.tocSidebar.style.display = 'none';
        
        elements.homeView.style.display = 'block';
        
        // Reset navigation active highlights
        updateSidebarActiveItem(null, null);

        // Highlight "All" category tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === state.activeCategory);
        });

        renderHomeList();
        
        // Reset scroll page
        elements.pageContainer.scrollTop = 0;
    }

    // Load a markdown file into reader panel
    async function loadWriteup(writeup, anchorId) {
        state.activeWriteup = writeup;
        elements.homeView.style.display = 'none';
        
        // Show loading state
        elements.readerView.style.display = 'block';
        elements.tocSidebar.style.display = 'block';
        elements.markdownContent.innerHTML = '<div class="card-loading">Loading article content...</div>';
        
        // Update breadcrumbs
        elements.breadcrumbs.innerHTML = `
            <span class="breadcrumb-item"><a href="#" onclick="window.location.hash = '#'; return false;">Home</a></span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item"><a href="#" onclick="filterByCategory('${writeup.categoryId}'); return false;">${writeup.category}</a></span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">${writeup.title.replace(`${writeup.category} - `, '')}</span>
        `;

        updateSidebarActiveItem(writeup.categoryId, writeup.id);

        try {
            const markdownResponse = await fetch(writeup.path);
            if (!markdownResponse.ok) {
                throw new Error(`Failed to load markdown: ${markdownResponse.statusText}`);
            }
            let markdown = await markdownResponse.text();
            
            // Strip front-matter metadata from rendering body
            markdown = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

            // Inject Header Metadata
            elements.readerTitle.textContent = writeup.title;
            elements.readerCategory.textContent = writeup.category;
            elements.readerDate.textContent = writeup.date;
            
            elements.readerDifficulty.textContent = writeup.difficulty;
            elements.readerDifficulty.className = `writeup-difficulty ${writeup.difficulty.toLowerCase()}`;
            
            elements.readerTags.innerHTML = writeup.tags.map(tag => `
                <span class="tag-badge" onclick="filterByTag('${tag.toLowerCase()}')">${tag}</span>
            `).join('');

            // Render Markdown body
            elements.markdownContent.innerHTML = marked.parse(markdown);

            // Execute Prism highlighting on new code blocks
            if (typeof Prism !== 'undefined') {
                Prism.highlightAllUnder(elements.markdownContent);
            }

            // Setup image lightboxes
            setupImageZoom();

            // Build Table of Contents
            buildTOC();

            // Set up Next/Prev page navigation
            setupWriteupFooterNavigation(writeup);

            // Scroll page to top or anchor link
            if (anchorId) {
                // Wait slightly for render complete
                setTimeout(() => scrollToAnchor(anchorId), 100);
            } else {
                elements.pageContainer.scrollTop = 0;
            }

        } catch (error) {
            console.error('Failed to load writeup content:', error);
            showError(`Failed to load writeup content from ${writeup.path}.`);
        }
    }

    // Filter home view directly by clicking category in breadcrumbs
    window.filterByCategory = function(categoryId) {
        state.activeCategory = categoryId;
        window.location.hash = '#';
    };

    // Scroll to specific anchor inside page container
    function scrollToAnchor(id) {
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Build right side Outline links
    function buildTOC() {
        const headings = elements.markdownContent.querySelectorAll('h2, h3');
        
        if (headings.length === 0) {
            elements.tocList.innerHTML = '<li class="toc-item"><span class="nav-loading">No sections</span></li>';
            return;
        }

        const currentHashBase = window.location.hash.split('#')[1] || '';

        const listItems = Array.from(headings).map(heading => {
            // Generate clean anchor id slug if missing
            if (!heading.id) {
                heading.id = heading.textContent
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
            }

            const depth = heading.tagName.toLowerCase() === 'h2' ? 2 : 3;
            
            return `
            <li class="toc-item depth-${depth}">
                <a href="#${currentHashBase}#${heading.id}" class="toc-link" data-target="${heading.id}">${heading.textContent}</a>
            </li>`;
        });

        elements.tocList.innerHTML = listItems.join('');
    }

    // Highlight active heading in TOC on scroll (Scroll spy)
    function handleScrollSpy() {
        if (!state.activeWriteup) return;

        const headings = elements.markdownContent.querySelectorAll('h2, h3');
        if (headings.length === 0) return;

        let activeId = '';
        const scrollContainer = elements.pageContainer;
        const offset = 100; // Trigger slightly before it hits top of container

        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            const top = heading.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
            
            if (scrollContainer.scrollTop >= top - offset) {
                activeId = heading.id;
            }
        }

        // Default to first if not scrolled down enough
        if (!activeId && headings.length > 0) {
            activeId = headings[0].id;
        }

        // Highlight TOC links
        document.querySelectorAll('.toc-link').forEach(link => {
            const target = link.dataset.target;
            link.classList.toggle('active', target === activeId);
        });
    }

    // Footer links for walkthrough navigation
    function setupWriteupFooterNavigation(currentWriteup) {
        // Find position
        const idx = state.writeups.findIndex(w => w.id === currentWriteup.id && w.categoryId === currentWriteup.categoryId);
        
        // Newest are first, so "Next" post is index idx - 1, "Prev" is idx + 1
        const nextWriteup = idx > 0 ? state.writeups[idx - 1] : null;
        const prevWriteup = idx < state.writeups.length - 1 ? state.writeups[idx + 1] : null;

        if (prevWriteup) {
            elements.prevPostBtn.style.visibility = 'visible';
            elements.prevPostBtn.setAttribute('href', `#${prevWriteup.categoryId}/${prevWriteup.id}`);
            elements.prevPostTitle.textContent = prevWriteup.title.replace(`${prevWriteup.category} - `, '');
        } else {
            elements.prevPostBtn.style.visibility = 'hidden';
        }

        if (nextWriteup) {
            elements.nextPostBtn.style.visibility = 'visible';
            elements.nextPostBtn.setAttribute('href', `#${nextWriteup.categoryId}/${nextWriteup.id}`);
            elements.nextPostTitle.textContent = nextWriteup.title.replace(`${nextWriteup.category} - `, '');
        } else {
            elements.nextPostBtn.style.visibility = 'hidden';
        }
    }

    // Clicks on images show full screen
    function setupImageZoom() {
        elements.markdownContent.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', () => {
                elements.lightboxImg.src = img.src;
                elements.lightboxImg.alt = img.alt || 'Walkthrough Screenshot';
                elements.lightbox.classList.add('active');
            });
        });
    }

    // Display error card in main window
    function showError(message) {
        elements.homeView.style.display = 'none';
        elements.tocSidebar.style.display = 'none';
        elements.readerView.style.display = 'block';
        elements.markdownContent.innerHTML = `
        <div class="card-no-results" style="border-color: var(--difficulty-hard); border-style: solid;">
            <h3 style="color: var(--difficulty-hard);">Exploit Error</h3>
            <p style="margin-top: 10px;">${message}</p>
            <a href="#" style="display: inline-block; margin-top: 20px;" class="tab-btn" onclick="window.location.hash = '#'; return false;">Back to Homepage</a>
        </div>`;
    }

    // Throttle helper function for scroll performance
    function throttle(fn, wait) {
        let time = Date.now();
        return function() {
            if ((time + wait - Date.now()) < 0) {
                fn();
                time = Date.now();
            }
        };
    }

    // Start App
    init();
})();
