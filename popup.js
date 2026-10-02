const keyInput = document.getElementById('key');
const saveBtn = document.getElementById('save');
const balanceBtn = document.getElementById('balance');
const statusEl = document.getElementById('status');

function setStatus(text, kind) {
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

chrome.storage.local.get('homiakKey', st => { if (st.homiakKey) keyInput.value = st.homiakKey; });

saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  if (key && !/^sk-/.test(key)) { setStatus('Ключ должен начинаться со sk-', 'err'); return; }
  chrome.storage.local.set({ homiakKey: key }, () => {
    setStatus(key ? 'Ключ сохранён' : 'Ключ сброшен на дефолтный', 'ok');
  });
});

balanceBtn.addEventListener('click', () => {
  balanceBtn.disabled = true;
  setStatus('Проверяю...');
  chrome.runtime.sendMessage({ type: 'homiak-balance' }, res => {
    balanceBtn.disabled = false;
    if (chrome.runtime.lastError) { setStatus('Ошибка: ' + chrome.runtime.lastError.message, 'err'); return; }
    if (!res || !res.ok) { setStatus('Ошибка: ' + (res?.error || 'нет ответа'), 'err'); return; }
    if (!res.isValid) { setStatus('Ключ невалидный', 'err'); return; }
    setStatus('Баланс: $' + Number(res.balance).toFixed(2), Number(res.balance) > 0.1 ? 'ok' : 'err');
  });
});
