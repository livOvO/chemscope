/* 化见 ChemScope — front-end rendering & interactions */
(() => {
  'use strict';

  const NEWS_ORDER = ['产业', '材料', '绿色', '能源', '智能'];
  const PAPER_ORDER = ['催化', '合成', '材料', '能源', '高分子'];
  const SECTIONS = ['policy', 'news', 'research'];
  const STATIC_MODE = Boolean(window.CHEMSCOPE_STATIC);

  const state = {
    data: null,
    newsTag: '全部',
    paperTag: '全部',
    refreshing: false,
    toastTimer: 0,
    activeSection: 'policy',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });

  function safeUrl(value) {
    try {
      const parsed = new URL(String(value || ''), window.location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return escapeHtml(parsed.href);
      }
    } catch {
      // Invalid URLs fall through to a non-clickable title.
    }
    return '#';
  }

  function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function shanghaiKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  function shanghaiTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  function fullDate(date) {
    const key = shanghaiKey(date);
    return key ? key.replaceAll('-', '.') : '—';
  }

  function shortDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    return match ? `${match[2]}.${match[3]}` : String(value || '');
  }

  function heatWidth(heat) {
    const value = Number(heat) || 0;
    return Math.max(18, Math.min(100, 18 + ((value - 80) / 20) * 82)).toFixed(1);
  }

  function buildTags(items, preferred) {
    const present = new Set();
    for (const item of items) {
      if (item && item.tag && item.tag !== '全部') present.add(item.tag);
    }
    return [
      '全部',
      ...preferred.filter((tag) => present.has(tag)),
      ...[...present].filter((tag) => !preferred.includes(tag)).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    ];
  }

  function renderFilters(container, tags, active, onPick) {
    if (!container) return;
    container.innerHTML = tags
      .map(
        (tag) =>
          `<button class="filter" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="${
            tag === active ? 'true' : 'false'
          }">${escapeHtml(tag)}</button>`
      )
      .join('');
    for (const button of $$('button', container)) {
      button.addEventListener('click', () => onPick(button.dataset.tag || '全部'));
    }
  }

  function renderNews(items) {
    const list = $('#newsList');
    if (!list) return;

    const tags = buildTags(items, NEWS_ORDER);
    if (!tags.includes(state.newsTag)) state.newsTag = '全部';
    renderFilters($('#newsFilters'), tags, state.newsTag, (tag) => {
      state.newsTag = tag;
      renderNews(items);
    });

    const filtered =
      state.newsTag === '全部' ? items : items.filter((item) => item.tag === state.newsTag);

    if (!filtered.length) {
      list.innerHTML = `<li class="empty-state">这个分类今天还没有收录。换个标签看看。</li>`;
      return;
    }

    list.innerHTML = filtered
      .map((item, index) => {
        const title = escapeHtml(item.title);
        const href = safeUrl(item.url);
        const note = item.note ? ` title="${escapeHtml(item.note)}"` : '';
        const titleHtml =
          href === '#'
            ? `<span class="hot-title">${title}</span>`
            : `<a class="hot-title" href="${href}" target="_blank" rel="noopener noreferrer"${note}>${title}</a>`;
        const date = escapeHtml(shortDate(item.date));
        const source = escapeHtml(item.source || '公开来源');
        const tag = escapeHtml(item.tag || '产业');
        const auto = item.curated ? '' : '<span class="auto-badge">自动</span>';
        const heat = Number(item.heat) || 0;

        return `<li class="hot-item" style="--i:${index}">
          <span class="rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="hot-body">
            ${titleHtml}
            <div class="hot-meta">
              <span class="source">${source}</span>
              <time datetime="${escapeHtml(item.date || '')}">${date}</time>
              <span class="tag">${tag}</span>
              ${auto}
            </div>
            <div class="hot-foot">
              <span class="heat-track" role="img" aria-label="综合热度 ${heat.toFixed(1)}">
                <i style="width:${heatWidth(heat)}%"></i>
              </span>
              <span class="heat-value">${heat.toFixed(1)}</span>
            </div>
          </div>
        </li>`;
      })
      .join('');
  }

  function renderPapers(items) {
    const list = $('#paperList');
    if (!list) return;

    const tags = buildTags(items, PAPER_ORDER);
    if (!tags.includes(state.paperTag)) state.paperTag = '全部';
    renderFilters($('#paperFilters'), tags, state.paperTag, (tag) => {
      state.paperTag = tag;
      renderPapers(items);
    });

    const filtered =
      state.paperTag === '全部' ? items : items.filter((item) => item.tag === state.paperTag);

    if (!filtered.length) {
      list.innerHTML = `<li class="empty-state">这个方向今天还没有收录。换个标签看看。</li>`;
      return;
    }

    list.innerHTML = filtered
      .map((item, index) => {
        const english = item.titleEn || item.title || '';
        const chinese = item.titleZh || '';
        const mainTitle = chinese || english || '未命名论文';
        const showEnglish = Boolean(english) && english !== mainTitle;
        const title = escapeHtml(mainTitle);
        const href = safeUrl(item.link || (item.doi ? `https://doi.org/${item.doi}` : ''));
        const titleHtml =
          href === '#'
            ? `<span class="paper-title">${title}</span>`
            : `<a class="paper-title" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a>`;
        const journal = escapeHtml(item.journalShort || item.journal || '期刊');
        const date = escapeHtml(shortDate(item.date));
        const tag = escapeHtml(item.tag || '材料');
        const heat = Number(item.heat) || 0;
        const doi = item.doi ? escapeHtml(item.doi) : '';
        const why = item.why ? `<p class="paper-why">${escapeHtml(item.why)}</p>` : '';
        const auto = item.curated ? '' : '<span class="auto-badge">自动收录</span>';

        return `<li class="paper-item" style="--i:${index}">
          <span class="rank" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="paper-body">
            <div class="paper-kicker">
              <span class="journal">${journal}</span>
              <time class="paper-date" datetime="${escapeHtml(item.date || '')}">${date}</time>
              <span class="tag">${tag}</span>
              ${auto}
            </div>
            ${titleHtml}
            ${showEnglish ? `<span class="paper-title-en">${escapeHtml(english)}</span>` : ''}
            ${why}
            <div class="paper-foot">
              <span class="heat-track" role="img" aria-label="综合热度 ${heat.toFixed(1)}">
                <i style="width:${heatWidth(heat)}%"></i>
              </span>
              <span class="heat-value">${heat.toFixed(1)}</span>
              ${doi ? `<span class="doi" title="${doi}">DOI ${doi}</span>` : ''}
            </div>
          </div>
        </li>`;
      })
      .join('');
  }

  function updateMeta(data) {
    const news = Array.isArray(data.news) ? data.news : [];
    const papers = Array.isArray(data.papers) ? data.papers : [];
    const generated = asDate(data.generatedAt);
    const generatedKey = shanghaiKey(generated);
    const todayKey = shanghaiKey(new Date());

    const todayLabel = $('#todayLabel');
    if (todayLabel) todayLabel.textContent = generatedKey ? generatedKey.replaceAll('-', '.') : '—';

    const newsCount = $('#newsCount');
    if (newsCount) newsCount.textContent = String(news.length);
    const paperCount = $('#paperCount');
    if (paperCount) paperCount.textContent = String(papers.length);

    const updateLabel = $('#updateLabel');
    if (updateLabel) {
      const text = $('span', updateLabel);
      if (text) {
        if (!generatedKey) text.textContent = '每日更新';
        else if (generatedKey === todayKey) text.textContent = `${shanghaiTime(generated)} 更新`;
        else text.textContent = `${generatedKey.slice(5).replace('-', '.')} 更新`;
      }
      const stale = !generatedKey || generatedKey !== todayKey;
      updateLabel.classList.toggle('is-stale', stale);
      updateLabel.title = generatedKey
        ? `数据生成于 ${fullDate(generated)} ${shanghaiTime(generated)}（北京时间）`
        : '每日 06:10 自动更新';
    }

    const newsFoot = $('#newsFoot');
    if (newsFoot) newsFoot.textContent = `${news.length} 条 · 每日 06:10 更新`;
    const paperFoot = $('#paperFoot');
    if (paperFoot) paperFoot.textContent = `${papers.length} 篇 · Nature / Science / Angew`;

    const dialogGenerated = $('#dialogGenerated');
    if (dialogGenerated) {
      dialogGenerated.textContent = generatedKey
        ? `数据生成于 ${fullDate(generated)} ${shanghaiTime(generated)}（北京时间） · 共 ${news.length + papers.length} 条`
        : '每日 06:10 自动更新';
    }
  }

  function renderAll() {
    if (!state.data) return;
    const data = state.data;
    const news = Array.isArray(data.news) ? data.news : [];
    const papers = Array.isArray(data.papers) ? data.papers : [];

    renderNews(news);
    renderPapers(papers);
    updateMeta(data);
  }

  function setActiveNav(id) {
    state.activeSection = id;
    for (const link of $$('.mobile-nav a')) {
      const active = link.dataset.nav === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function updateActiveSection() {
    const marker = window.innerHeight * 0.34;
    let current = 'policy';
    for (const id of SECTIONS) {
      const section = document.getElementById(id);
      if (section && section.getBoundingClientRect().top <= marker) current = id;
    }
    setActiveNav(current);
  }

  function showToast(message, { error = false, duration = 3200 } = {}) {
    const toast = $('#toast');
    if (!toast) return;
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', Boolean(error));
    toast.classList.add('is-visible');
    if (duration > 0) {
      state.toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), duration);
    }
  }

  function hideToast() {
    const toast = $('#toast');
    if (toast) toast.classList.remove('is-visible');
  }

  function openMethod() {
    const dialog = $('#methodDialog');
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.classList.add('dialog-open');
  }

  function closeMethod() {
    const dialog = $('#methodDialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.classList.remove('dialog-open');
  }

  async function refreshData() {
    if (state.refreshing) return;
    const button = $('#refreshBtn');
    state.refreshing = true;
    if (button) {
      button.disabled = true;
      button.classList.add('is-spinning');
    }
    showToast('正在抓取最新数据，约需 20 秒…', { duration: 0 });

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 75_000);
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        // A non-JSON response is handled below.
      }

      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error || `服务返回 HTTP ${response.status}`);
      }
      if (!payload.data || !Array.isArray(payload.data.news)) {
        throw new Error('返回的数据格式不完整');
      }

      state.data = payload.data;
      renderAll();
      updateActiveSection();
      const news = payload.data.news.length;
      const papers = Array.isArray(payload.data.papers) ? payload.data.papers.length : 0;
      showToast(`已更新：${news} 条时事 · ${papers} 篇论文`, { duration: 4000 });
    } catch (error) {
      const message =
        error?.name === 'AbortError'
          ? '刷新超时，请稍后再试'
          : `刷新失败：${error?.message || '未知错误'}`;
      showToast(message, { error: true, duration: 6500 });
    } finally {
      state.refreshing = false;
      window.setTimeout(hideToast, 4200);
      if (button) {
        button.disabled = false;
        button.classList.remove('is-spinning');
      }
    }
  }

  function bindStatic() {
    const refreshButton = $('#refreshBtn');
    if (STATIC_MODE) {
      refreshButton?.remove();
      const updateLabel = $('#updateLabel');
      if (updateLabel) {
        updateLabel.title = 'GitHub Pages 静态版：每天 06:10（北京时间）自动更新';
      }
    } else {
      refreshButton?.addEventListener('click', refreshData);
    }

    for (const trigger of $$('[data-open-method]')) {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openMethod();
      });
    }
    for (const trigger of $$('[data-close-method]')) {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        closeMethod();
      });
    }

    const dialog = $('#methodDialog');
    if (dialog) {
      dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeMethod();
      });
    }

    for (const link of $$('.mobile-nav a')) {
      link.addEventListener('click', () => setActiveNav(link.dataset.nav || 'policy'));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateActiveSection();
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
  }

  function showLoadError(error) {
    const message = escapeHtml(error?.message || '未知错误');
    const newsList = $('#newsList');
    const paperList = $('#paperList');
    if (newsList) {
      newsList.innerHTML = `<li class="empty-state">数据加载失败：${message}。请确认 server.mjs 已启动。</li>`;
    }
    if (paperList) {
      paperList.innerHTML = `<li class="empty-state">数据加载失败：${message}。请确认 data.js 已生成。</li>`;
    }
    const newsFoot = $('#newsFoot');
    if (newsFoot) newsFoot.textContent = '暂无数据';
    const paperFoot = $('#paperFoot');
    if (paperFoot) paperFoot.textContent = '暂无数据';
  }

  function init(data) {
    state.data = data;
    renderAll();
    updateActiveSection();
  }

  function start() {
    bindStatic();

    if (window.CHEMSCOPE_DATA) {
      init(window.CHEMSCOPE_DATA);
      return;
    }

    fetch('/api/data', { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(init)
      .catch(showLoadError);
  }

  start();
})();
