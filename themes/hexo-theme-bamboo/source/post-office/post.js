'use strict';

(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');

  function syncTheme() {
    const dark = root.dataset.theme === 'dark';
    if (themeButton) themeButton.setAttribute('aria-pressed', String(dark));
    const comments = document.querySelector('[data-comment-src]');
    const frame = comments?.querySelector('iframe.utterances-frame');
    if (frame) {
      frame.contentWindow.postMessage({ type: 'set-theme', theme: dark ? comments.dataset.dark : comments.dataset.light }, 'https://utteranc.es');
    }
  }

  if (themeButton) {
    themeButton.hidden = false;
    syncTheme();
    themeButton.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      root.dataset.theme = dark ? 'dark' : 'light';
      try { localStorage.setItem('dark', String(dark)); } catch (_) {}
      syncTheme();
    });
  }

  const shift = document.querySelector('[data-change-shift]');
  if (shift) {
    const couriers = [...document.querySelectorAll('[data-courier]')];
    function setCourier(id) {
      couriers.forEach(courier => { courier.hidden = courier.dataset.courier !== id; });
    }
    try { if (sessionStorage.getItem('postal-courier') === 'doro') setCourier('doro'); } catch (_) {}
    shift.hidden = false;
    shift.addEventListener('click', () => {
      const id = couriers[0].hidden ? 'gugu' : 'doro';
      setCourier(id);
      try { sessionStorage.setItem('postal-courier', id); } catch (_) {}
    });
  }

  const routes = document.getElementById('letter-routes');
  if (routes) {
    const paths = JSON.parse(routes.textContent);
    document.querySelectorAll('[data-random-letter]').forEach(link => {
      let previous = -1;
      function pickLetter() {
        if (!paths.length) return;
        previous = previous < 0 ? Math.floor(Math.random() * paths.length)
          : (previous + 1 + Math.floor(Math.random() * (paths.length - 1))) % paths.length;
        link.setAttribute('href', paths[previous]);
      }
      pickLetter();
      link.addEventListener('click', pickLetter);
      window.addEventListener('pageshow', event => { if (event.persisted) pickLetter(); });
    });
  }

  function dismissOnBackdrop(dialog) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  }

  async function loadSearchIndex(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Search index unavailable');
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Invalid search index');
    const template = document.createElement('template');
    return [...xml.querySelectorAll('entry')].flatMap(entry => {
      const path = entry.querySelector('url')?.textContent.trim();
      const title = entry.querySelector('title')?.textContent.trim();
      if (!path || !title) return [];
      const url = new URL(path, location.href);
      if (url.origin !== location.origin) return [];
      const terms = [...entry.querySelectorAll('category, tag')].map(term => term.textContent.trim());
      template.innerHTML = entry.querySelector('content')?.textContent || '';
      const text = template.content.textContent.replace(/\s+/g, ' ').trim();
      const heading = title.toLowerCase();
      const topics = terms.join(' ').toLowerCase();
      return [{ title, url, text, heading, topics, searchable: [heading, topics, text.toLowerCase()].join(' ') }];
    });
  }

  function enableSearch(dialog) {
    const trigger = document.querySelector('[data-search-open]');
    const input = dialog.querySelector('input');
    const status = dialog.querySelector('[role="status"]');
    const list = dialog.querySelector('ul');
    let index;
    let timer;

    async function findLetters() {
      const query = input.value.trim().toLowerCase();
      list.replaceChildren();
      if (!query) {
        status.textContent = '输入关键词查找文章。';
        return;
      }
      status.textContent = '正在查找来信…';
      try {
        index ??= loadSearchIndex(dialog.dataset.index).catch(error => { index = null; throw error; });
        const entries = await index;
        if (!dialog.open || input.value.trim().toLowerCase() !== query) return;
        const terms = query.split(/\s+/);
        const matches = entries.filter(entry => terms.every(term => entry.searchable.includes(term)));
        function score(entry) {
          return terms.reduce((rank, term) => rank + (entry.heading.includes(term) ? 3 : 0) + (entry.topics.includes(term) ? 1 : 0), 0);
        }
        matches.sort((a, b) => score(b) - score(a));
        const result = document.createDocumentFragment();
        for (const entry of matches) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          const title = document.createElement('strong');
          const snippet = document.createElement('small');
          link.href = entry.url;
          title.textContent = entry.title;
          const offset = Math.max(0, entry.text.toLowerCase().indexOf(terms[0]) - 18);
          snippet.textContent = (offset ? '…' : '') + entry.text.slice(offset, offset + 85) + (entry.text.length > offset + 85 ? '…' : '');
          link.append(title, snippet);
          item.append(link);
          result.append(item);
        }
        list.replaceChildren(result);
        status.textContent = matches.length ? '找到 ' + matches.length + ' 封来信' : '没有找到相关来信，换个关键词试试。';
      } catch (_) {
        if (input.value.trim().toLowerCase() === query) status.textContent = '搜索索引暂时无法读取，按回车重试。';
      }
    }
    function openSearch() {
      if (dialog.open) return;
      dialog.showModal();
      input.focus();
      input.select();
      if (input.value) findLetters();
    }
    trigger.hidden = false;
    trigger.addEventListener('click', openSearch);
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing || event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      openSearch();
    });
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(findLetters, 90);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) { clearTimeout(timer); findLetters(); }
    });
    dismissOnBackdrop(dialog);
  }

  const search = document.getElementById('mail-search');
  if (search && typeof search.showModal === 'function') enableSearch(search);

  async function copyWithFeedback(button, text) {
    const label = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '已复制';
    } catch (_) {
      button.textContent = '复制失败';
    }
    button.disabled = true;
    setTimeout(() => { button.textContent = label; button.disabled = false; }, 1600);
  }

  const prose = document.querySelector('.prose');
  if (prose) {
    const contents = document.querySelector('.contents details');
    if (contents && matchMedia('(max-width: 720px)').matches) contents.open = false;
    if (navigator.clipboard?.writeText) {
      const copyUrl = document.querySelector('[data-copy-url]');
      if (copyUrl) {
        copyUrl.hidden = false;
        copyUrl.addEventListener('click', () => copyWithFeedback(copyUrl, location.href.split('#')[0]));
      }
      prose.querySelectorAll('pre[data-language] > code').forEach(code => {
        const block = code.parentElement;
        const wrap = document.createElement('div');
        const head = document.createElement('div');
        const button = document.createElement('button');
        wrap.className = 'code-wrap';
        head.className = 'code-head';
        head.textContent = block.dataset.language;
        button.type = 'button';
        button.textContent = '复制代码';
        button.addEventListener('click', () => copyWithFeedback(button, code.textContent));
        head.append(button);
        block.before(wrap);
        wrap.append(head, block);
      });
    }
    const viewer = document.querySelector('.image-dialog');
    if (viewer && typeof viewer.showModal === 'function') {
      prose.querySelectorAll('img').forEach(img => {
        if (img.closest('a, button, .gallery-group, .mermaid')) return;
        const zoom = document.createElement('button');
        zoom.type = 'button';
        zoom.className = 'zoom-trigger';
        zoom.setAttribute('aria-label', '放大图片' + (img.alt ? ' ' + img.alt : ''));
        img.before(zoom);
        zoom.append(img);
        zoom.addEventListener('click', () => {
          const full = viewer.querySelector('img');
          full.src = img.currentSrc || img.src;
          full.alt = img.alt;
          viewer.showModal();
        });
      });
      dismissOnBackdrop(viewer);
    }
    const comments = document.querySelector('[data-comment-src]');
    if (comments) comments.addEventListener('toggle', () => {
      const mount = comments.querySelector('.comment-mount');
      if (!comments.open || mount.childElementCount) return;
      const script = document.createElement('script');
      script.src = comments.dataset.commentSrc;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('repo', comments.dataset.repo);
      script.setAttribute('issue-term', comments.dataset.term);
      script.setAttribute('theme', root.dataset.theme === 'dark' ? comments.dataset.dark : comments.dataset.light);
      script.addEventListener('error', () => { script.remove(); mount.textContent = '评论暂时无法加载。'; });
      mount.replaceChildren(script);
    });
    if (prose.querySelector('.mermaid')) document.addEventListener('DOMContentLoaded', () => {
      if (!window.mermaid) return;
      window.mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
      window.mermaid.run({ nodes: prose.querySelectorAll('.mermaid'), suppressErrors: true });
    });
  }
})();
