importScripts('persona.js');

const DEFAULT_KEY = 'sk-2cb45250743314ba5c347fde56089087b8477237c22d1453fc08af742e4923f1';
const URL = 'https://www.fastaitoken.com/v1/chat/completions';
const USAGE_URL = 'https://www.fastaitoken.com/v1/usage';

async function getKey() {
  const st = await chrome.storage.local.get('homiakKey');
  return (st.homiakKey || '').trim() || DEFAULT_KEY;
}

async function apiFetch(url, key, options) {
  const r = await fetch(url, {
    ...options,
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const d = await r.json();
  if (!r.ok && d.error) throw new Error(d.error.message || ('HTTP ' + r.status));
  return d;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'homiak-gen') {
    (async () => {
      try {
        const key = await getKey();
        const body = {
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: HOMIAK_PERSONA },
            { role: 'user', content: 'КОНТЕКСТ:\n' + msg.context + '\n\nВыдай ОДИН вариант ответа от лица хомяка, только само сообщение.' }
          ],
          max_tokens: 4000,
          stream: false,
          temperature: 1.0,
          chat_template_kwargs: { thinking: false },
          enable_thinking: false
        };
        let lastErr = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const d = await apiFetch(URL, key, { method: 'POST', body: JSON.stringify(body) });
            const text = d.choices?.[0]?.message?.content || '';
            if (text.trim()) { sendResponse({ ok: true, text: text.trim() }); return; }
            lastErr = 'пустой ответ';
          } catch (e) { lastErr = String(e.message || e); }
          await new Promise(res => setTimeout(res, 2000));
        }
        sendResponse({ ok: false, error: lastErr || 'не удалось получить ответ' });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.type === 'homiak-balance') {
    (async () => {
      try {
        const key = await getKey();
        const d = await apiFetch(USAGE_URL, key, { method: 'GET' });
        sendResponse({ ok: true, balance: d.balance, unit: d.unit || 'USD', isValid: d.isValid !== false });
      } catch (e) {
        sendResponse({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  }

  return false;
});
