/* File: js/script.js */
  async function loadConfig() {
    try {
      const resp = await fetch('config/config.json');
      return await resp.json();
    } catch (err) {
      console.warn('Config load failed, using defaults');
      return {
        githubUser: 'codegasf',
        githubRepoFilter: [],
        youtubeApiKey: '',
        youtubeChannelId: '',
        contactEmail: 'hello@codegasf.dev',
        xUsername: 'codegasf'
      };
    }
  }
  
  async function loadPosts() {
    try {
      const resp = await fetch('config/posts.json');
      return await resp.json();
    } catch (err) {
      console.warn('Posts load failed, using samples');
      return [
        {
          id: 1,
          title: 'Building a Slack Bot for Kubernetes',
          excerpt: 'Create a Slack slash-command bot to manage K8s pods using Flask and kubectl. Perfect for DevOps teams.',
          tags: ['devops', 'slack', 'kubernetes'],
          date: '2025-10-10',
          code: `# Verify Slack signature in Flask
  from flask import Flask, request
  import hmac, hashlib, time
  
  app = Flask(__name__)
  SLACK_SIGNING_SECRET = 'your-secret'
  
  def verify_slack(req):
      timestamp = req.headers.get('X-Slack-Request-Timestamp', '0')
      if abs(time.time() - int(timestamp)) > 300: return False
      sig_basestring = f"v0:{timestamp}:{req.get_data(as_text=True)}"
      my_sig = 'v0=' + hmac.new(SLACK_SIGNING_SECRET.encode(), sig_basestring.encode(), hashlib.sha256).hexdigest()
      return hmac.compare_digest(my_sig, req.headers.get('X-Slack-Signature', ''))
  
  @app.route('/slack/events', methods=['POST'])
  def slack_events():
      if not verify_slack(request): return 'Invalid', 403
      # Handle your logic here
      return 'OK'`,
          lang: 'python',
          link: '#'
        },
        {
          id: 2,
          title: 'Terraform Best Practices for Beginners',
          excerpt: 'Organize your infra code with modules, CI/CD, and a clean repo structure.',
          tags: ['terraform', 'infra', 'aws'],
          date: '2025-09-25',
          code: `# modules/network/main.tf
  resource "aws_vpc" "main" {
    cidr_block = var.cidr_block
    tags = { Name = var.name }
  }
  
  variable "cidr_block" { type = string }
  variable "name" { type = string }`,
          lang: 'hcl',
          link: '#'
        },
        {
          id: 3,
          title: 'Vanilla JS Game Loop Essentials',
          excerpt: 'Master the basics of game loops, input handling, and rendering in pure JavaScript.',
          tags: ['gaming', 'javascript', 'gamedev'],
          date: '2025-09-15',
          code: `const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let lastTime = performance.now();
  
  function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    update(deltaTime);  // Update game state
    render(ctx);        // Render frame
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
  }
  
  requestAnimationFrame(gameLoop);`,
          lang: 'javascript',
          link: '#'
        }
      ];
    }
  }
  
  /* ===========================
     Global Variables
     =========================== */
  let CONFIG = {};
  let posts = [];
  let allowedTags = null; // from config/tags.json if present
  let activeTag = null;
  let activeTab = 'posts';
  const layoutEl = document.querySelector('.layout');
  
  const postListEl = document.getElementById('post-list');
  const tagChipsEl = document.getElementById('tag-chips');
  const postsCountEl = document.getElementById('posts-count');
  const searchInput = document.getElementById('site-search');
  const yearEl = document.getElementById('year');
  
  /* Init */
  async function init() {
    yearEl.textContent = new Date().getFullYear();
    CONFIG = await loadConfig();
    // Bind Formspree action from config if present
    try {
      const form = document.getElementById('contact-form');
      if (form) {
        if (CONFIG.formspreeId) {
          form.action = `https://formspree.io/f/${CONFIG.formspreeId}`;
        } else {
          const dataId = form.getAttribute('data-formspree');
          if (dataId) {
            form.action = `https://formspree.io/f/${dataId}`;
          }
        }
      }
    } catch (_) {}
    posts = await loadPosts();
    // Try load allowed tags (optional)
    try {
      const resp = await fetch('config/tags.json');
      if (resp.ok) {
        allowedTags = await resp.json();
      }
    } catch (_) {}
    renderTagChips();
    filterPosts(searchInput.value);
    setupEventListeners();
    fetchProjects();
    renderYouTube();
    fetchXFeeds();
    fetchGitHubFeeds(); // Recent commits or events
  }
  
  // Run init
  init();
  
  /* Event Listeners */
  function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (activeTab === tab) return;
        document.querySelector(`.tab-btn.active`).classList.remove('active');
        document.querySelector(`.tab-content.active`).classList.remove('active');
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
        activeTab = tab;
        // Toggle layout: single column for posts, two columns otherwise
        if (activeTab === 'posts') {
          layoutEl.classList.add('single-column');
        } else {
          layoutEl.classList.remove('single-column');
        }
        if (tab === 'posts') filterPosts(searchInput.value);
      });
    });
  
    // Search
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); filterPosts(searchInput.value); }
      if (e.key === 'Escape') { searchInput.value = ''; activeTag = null; filterPosts(''); }
    });
  
    // Copy email
    document.getElementById('copy-email').addEventListener('click', async () => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(CONFIG.contactEmail);
        const btn = document.getElementById('copy-email');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Email', 2000);
      } else alert('Clipboard not available.');
    });
    // Keyboard shortcut
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    // Contact form AJAX submit (prevent Formspree redirect)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      // Create/ensure a status area at the end of the form
      let statusEl = contactForm.querySelector('.form-status');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.className = 'form-status small';
        statusEl.style.marginTop = '10px';
        statusEl.style.minHeight = '18px';
        statusEl.style.color = 'var(--muted)';
        contactForm.appendChild(statusEl);
      }

      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Determine endpoint
        const endpoint = (function() {
          if (CONFIG.formspreeId) return `https://formspree.io/f/${CONFIG.formspreeId}`;
          const dataId = contactForm.getAttribute('data-formspree');
          if (dataId) return `https://formspree.io/f/${dataId}`;
          const action = (contactForm.getAttribute('action') || '').trim();
          return action;
        })();
        if (!endpoint) {
          statusEl.textContent = 'Form endpoint is not configured.';
          statusEl.style.color = '#ff7777';
          return;
        }
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending…';
        }
        statusEl.textContent = '';
        statusEl.style.color = 'var(--muted)';
        try {
          const formData = new FormData(contactForm);
          const resp = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
          });
          if (resp.ok) {
            contactForm.reset();
            statusEl.textContent = 'Thanks! Your message has been sent successfully.';
            statusEl.style.color = '#9be39b';
          } else {
            // Try to read error from JSON
            let errMsg = 'Submission failed. Please try again later.';
            try {
              const data = await resp.json();
              if (data && data.errors && data.errors.length) {
                errMsg = data.errors.map(x => x.message).join(' ');
              }
            } catch (_) {}
            statusEl.textContent = errMsg;
            statusEl.style.color = '#ff9999';
          }
        } catch (err) {
          statusEl.textContent = 'Network error. Please check your connection and try again.';
          statusEl.style.color = '#ff9999';
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
        }
      });
    }
  }
  
  /* Posts Rendering */
  function getAllTags(postsArr) {
    if (Array.isArray(allowedTags) && allowedTags.length) {
      return allowedTags.slice().sort();
    }
    const s = new Set();
    postsArr.forEach(p => (p.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }
  
  function renderTagChips() {
    tagChipsEl.innerHTML = '';
    const tags = getAllTags(posts);
    const allChip = createChip('All', activeTag === null);
    allChip.onclick = () => { activeTag = null; filterPosts(searchInput.value); };
    tagChipsEl.appendChild(allChip);
    tags.forEach(t => {
      const chip = createChip(t, activeTag === t);
      chip.onclick = () => { activeTag = activeTag === t ? null : t; filterPosts(searchInput.value); };
      tagChipsEl.appendChild(chip);
    });
  }
  
  function createChip(label, active) {
    const btn = document.createElement('button');
    btn.className = `chip ${active ? 'active' : ''}`;
    btn.textContent = label;
    return btn;
  }
  
  function renderPosts(list) {
    postListEl.innerHTML = '';
    const arr = list || posts;
    postsCountEl.textContent = `${arr.length} item${arr.length !== 1 ? 's' : ''}`;
    if (arr.length === 0) {
      postListEl.innerHTML = `<div class="small" style="color: var(--muted); text-align: center; padding: 40px;">No results found. Try another search or tag.</div>`;
      return;
    }
    arr.forEach((p, i) => {
      const article = document.createElement('article');
      article.className = 'post fade-in';
      article.style.animationDelay = `${i * 0.1}s`;
      const tagsHtml = (p.tags || []).map(t => `<span class="tag-b">${t}</span>`).join('');
      article.innerHTML = `
        <div class="meta">
          <div style="display: flex; flex-direction: column; flex: 1;">
            <h3>${escapeHtml(p.title)}</h3>
            <div class="small" style="color: var(--muted); margin-top: 4px;">${p.date} • ${tagsHtml}</div>
          </div>
          <a class="ghost" href="${p.link || '#'}" target="_blank" style="white-space: nowrap;">View Full</a>
        </div>
        <p>${escapeHtml(p.excerpt)}</p>
        ${p.code ? `<pre><code class="${p.lang || ''}">${escapeHtml(p.code)}</code></pre>` : ''}
        ${p.code ? `
          <div class="code-actions">
            <button class="mini-btn" data-copy="${p.id}">Copy Code</button>
            <div class="small" style="margin-left: auto; color: var(--muted);">Lang: ${p.lang || 'text'}</div>
          </div>
        ` : ''}
      `;
      postListEl.appendChild(article);
    });
    document.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-copy');
        const post = posts.find(x => String(x.id) === id);
        if (post && navigator.clipboard) {
          await navigator.clipboard.writeText(post.code || '');
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy Code', 2000);
        } else {
          alert('Copy manually — clipboard not supported.');
        }
      };
    });
  }
  
  function filterPosts(q) {
    const query = (q || '').trim().toLowerCase();
    let results = posts.slice();
    if (activeTag) results = results.filter(p => (p.tags || []).includes(activeTag));
    if (query) {
      results = results.filter(p =>
        [p.title, p.excerpt, p.code, ...(p.tags || [])].join(' ').toLowerCase().includes(query)
      );
    }
    renderPosts(results);
  }
  
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }
  
  /* GitHub Projects & Feeds */
  async function fetchProjects() {
    const el = document.getElementById('projects-list');
    try {
      const resp = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?sort=pushed&per_page=6&type=owner`);
      if (!resp.ok) throw new Error('API error');
      const repos = await resp.json();
      const filtered = repos.filter(r => 
        !CONFIG.githubRepoFilter.length || CONFIG.githubRepoFilter.some(sub => r.name.toLowerCase().includes(sub.toLowerCase()))
      ).slice(0, 6);
      if (filtered.length === 0) {
        el.innerHTML = `<div class="small" style="color: var(--muted);">No projects yet. Check GitHub!</div>`;
        return;
      }
      el.innerHTML = '';
      filtered.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'project-item fade-in';
        item.style.animationDelay = `${i * 0.1}s`;
        item.innerHTML = `
          <div style="display: flex; flex-direction: column; flex: 1;">
            <strong style="font-size: 16px; color: white;">${escapeHtml(r.name)}</strong>
            <span class="small" style="color: var(--muted);">${escapeHtml(r.description || 'No description')}</span>
          </div>
          <div class="small" style="text-align: right; color: var(--muted); white-space: nowrap;">
            ⭐ ${r.stargazers_count} <br>
            <span style="font-size: 12px;">${r.language || '—'}</span>
          </div>
        `;
        item.onclick = () => window.open(r.html_url, '_blank');
        el.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="small" style="color: var(--muted);">Loading projects failed.</div>`;
    }
  }
  
  async function fetchGitHubFeeds() {
    const el = document.getElementById('github-feeds');
    try {
      const resp = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/events/public?per_page=5`);
      if (!resp.ok) throw new Error('API error');
      const events = await resp.json();
      el.innerHTML = '';
      events.slice(0, 5).forEach((event, i) => {
        if (event.type === 'PushEvent') {
          const item = document.createElement('div');
          item.className = 'feed-item fade-in';
          item.style.animationDelay = `${i * 0.1}s`;
          item.innerHTML = `
            <div style="flex: 1;">
              <strong>${escapeHtml(event.repo.name)}</strong>
              <div class="small">${event.payload.commits.length} commits: ${escapeHtml(event.payload.commits[0]?.message || 'Update')}</div>
            </div>
            <div class="small" style="text-align: right;">${new Date(event.created_at).toLocaleDateString()}</div>
          `;
          item.onclick = () => window.open(`https://github.com/${event.repo.name}/commit/${event.payload.commits[0]?.sha}`, '_blank');
          el.appendChild(item);
        }
      });
      if (el.children.length === 0) el.innerHTML = `<div class="small" style="color: var(--muted);">No recent activity.</div>`;
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="small" style="color: var(--muted);">Failed to load feeds.</div>`;
    }
  }
  
  /* YouTube Videos */
  async function renderYouTube() {
    const el = document.getElementById('youtube-list');
    if (CONFIG.youtubeApiKey && CONFIG.youtubeChannelId) {
      try {
        const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CONFIG.youtubeChannelId}&key=${CONFIG.youtubeApiKey}`);
        const chJson = await chRes.json();
        const uploadsId = chJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error('No uploads playlist');
        const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=4&key=${CONFIG.youtubeApiKey}&order=date`);
        const plJson = await plRes.json();
        const items = plJson.items || [];
        if (items.length === 0) throw new Error('No videos');
        el.innerHTML = '';
        items.forEach((item, i) => {
          const vidId = item.snippet.resourceId.videoId;
          const title = escapeHtml(item.snippet.title);
          const published = new Date(item.snippet.publishedAt).toLocaleDateString();
          const container = document.createElement('div');
          container.className = 'video-embed fade-in';
          container.style.animationDelay = `${i * 0.1}s`;
          container.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${vidId}?rel=0" loading="lazy" allowfullscreen title="${title}"></iframe>
            <div class="small" style="margin-top: 12px; text-align: center; font-weight: 500;">${title}</div>
            <div class="small" style="text-align: center; opacity: 0.7;">${published}</div>
          `;
          el.appendChild(container);
        });
        return;
      } catch (err) {
        console.warn('YouTube API failed:', err);
      }
    }
    // No API key path: embed uploads playlist if channelId is available
    if (CONFIG.youtubeChannelId) {
      // Derive uploads playlist id: replace leading 'UC' with 'UU'
      const uploadsId = CONFIG.youtubeChannelId.replace(/^UC/, 'UU');
      el.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'video-embed fade-in';
      container.innerHTML = `
        <iframe src="https://www.youtube.com/embed/videoseries?list=${uploadsId}" loading="lazy" allowfullscreen title="Latest uploads"></iframe>
        <div class="small" style="margin-top: 12px; text-align: center; font-weight: 500;">Latest uploads</div>
        <div class="small" style="text-align: center; opacity: 0.7;">Embedded playlist (no API key)</div>
      `;
      el.appendChild(container);
      return;
    }
    // Final fallback when neither API key nor channel id is provided
    el.innerHTML = `<div class="small" style="color: var(--muted); text-align: center; padding: 40px;">Stay tuned — videos coming soon.</div>`;
  }
  
  /* X (Twitter) Feeds */
  async function fetchXFeeds() {
    const el = document.getElementById('x-feeds');
    try {
      // Note: For static site, use a proxy or CORS-anywhere if needed, but here assume direct fetch works or use RSS/widget
      // For simplicity, placeholder - in production, use Twitter API v2 with bearer token
      el.innerHTML = `
        <div class="feed-item fade-in">
          <div style="flex: 1;">
            <strong>Sample X Post</strong>
            <div class="small">Exciting tech update! Check out the new tutorial.</div>
          </div>
          <div class="small" style="text-align: right;">Oct 17, 2025</div>
        </div>
        <div class="small" style="color: var(--muted); text-align: center; margin-top: 10px;">For live feeds, integrate Twitter API v2 in config.</div>
      `;
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="small" style="color: var(--muted);">Failed to load X feeds.</div>`;
    }
  }