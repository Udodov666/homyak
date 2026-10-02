(() => {
  const BOT = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';

  let injectTimer = null;

  function tryInject() {
    document.querySelectorAll('.lzt-fe-se-extraButtonsContainer').forEach(row => {
      if (row.querySelector('.homiak-btn')) return;
      const btn = document.createElement('div');
      btn.id = 'homiak-extra-btn';
      btn.className = 'homiak-btn';
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '-1');
      btn.setAttribute('aria-label', 'Хомобот — ответит за тебя');
      btn.innerHTML = BOT + '<span class="homiak-tip">Хомобот — ответит за тебя</span>';
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const form = btn.closest('form');
        if (form) generate(form, btn);
      });
      btn.addEventListener('mouseenter', () => {
        btn._tipTimer = setTimeout(() => btn.classList.add('is-tipshow'), 350);
      });
      btn.addEventListener('mouseleave', () => {
        clearTimeout(btn._tipTimer);
        btn.classList.remove('is-tipshow');
      });
      row.insertBefore(btn, row.firstChild);
    });
  }

  function collectContext(form) {
    const title = document.querySelector('.titleBar h1')?.innerText?.trim() || document.title.split('—')[0].trim();

    const posts = [...document.querySelectorAll('li.message')]
      .map(li => ({
        author: li.dataset.author || '',
        text: (li.querySelector('blockquote.messageText')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 300)
      }))
      .filter(p => p.text)
      .slice(-15);

    const frEl = form.querySelector('.fr-element.fr-view');
    const editorText = frEl ? frEl.innerText.trim() : '';
    const tagMatch = editorText.match(/^@([\w.]+),/);

    let replyTo = '';
    const replyBox = form.querySelector('.MessageReplyBox .Content');
    if (replyBox) {
      const dc = replyBox.dataset.content || replyBox.textContent || '';
      const m = dc.match(/Ответить на сообщение от (.+)/);
      if (m && !m[1].includes('{')) replyTo = m[1].trim();
    }
    if (!replyTo && tagMatch) replyTo = tagMatch[1];

    let ctx = 'ТЕМА: ' + title + '\n\nСООБЩЕНИЯ ТЕМЫ:\n' +
      posts.map(p => p.author + ': ' + p.text).join('\n');

    if (replyTo) ctx += '\n\nЮЗЕР ОТВЕЧАЕТ: ' + replyTo + ' (твое сообщение адресовано ему' +
      (tagMatch ? ', в редакторе уже стоит его тег @' + tagMatch[1] + ' — не пиши тег еще раз' : '') + ')';

    const myText = tagMatch ? editorText.replace(/^@[\w.]+,\s*/, '').trim() : editorText;
    if (myText) ctx += '\n\nЧТО УЖЕ НАПИСАНО В РЕДАКТОРЕ: ' + myText.slice(0, 300);

    return ctx;
  }

  function generate(form, btn) {
    if (btn.classList.contains('is-loading')) return;
    const ctx = collectContext(form);
    if (!ctx) return;

    btn.classList.add('is-loading');
    btn.querySelector('.homiak-tip').textContent = 'Хомяк думает...';

    chrome.runtime.sendMessage({ type: 'homiak-gen', context: ctx }, res => {
      btn.classList.remove('is-loading');
      if (!res || !res.ok) {
        flash(btn, 'is-err', 'Ошибка: ' + (res?.error || 'нет ответа'));
        return;
      }
      insertInto(form, res.text);
      flash(btn, 'is-ok', 'Готово :da:');
    });
  }

  function flash(btn, cls, title) {
    btn.classList.add(cls);
    const tip = btn.querySelector('.homiak-tip');
    tip.textContent = title;
    btn.classList.add('is-tipshow');
    setTimeout(() => {
      btn.classList.remove(cls, 'is-tipshow');
      tip.textContent = 'Хомобот — ответит за тебя';
    }, 2500);
  }

  function insertInto(form, text) {
    const frEl = form.querySelector('.fr-element.fr-view');
    if (!frEl) return;
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = esc.split('\n').filter(l => l.trim()).map(l => '<p>' + l + '</p>').join('');

    const current = frEl.innerText.trim();
    if (!current || current === '') {
      frEl.innerHTML = html;
    } else {
      frEl.insertAdjacentHTML('beforeend', html);
    }

    const ta = form.querySelector('textarea[id^="ctrl_message"]');
    if (ta) ta.value = frEl.innerHTML;
    frEl.dispatchEvent(new Event('input', { bubbles: true }));
    frEl.focus();
  }

  const obs = new MutationObserver(() => {
    clearTimeout(injectTimer);
    injectTimer = setTimeout(tryInject, 300);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  tryInject();
})();
