'use strict';

const $ = id => document.getElementById(id);
const key = 'yogasto-v1:' + new URL('./', location.href).pathname;
const currencies = ['€', '$', '£', 'CHF', 'MXN', 'USD'];
const categories = [
  { icon: '☕', label: 'Café/Bar' }, { icon: '🍔', label: 'Comida' },
  { icon: '🛍️', label: 'Capricho' }, { icon: '🚕', label: 'Transporte' },
  { icon: '📦', label: 'Otro' },
  { icon: '🛒', label: 'Supermercado' }, { icon: '🏠', label: 'Hogar' },
  { icon: '💊', label: 'Salud' }, { icon: '🎟️', label: 'Ocio' },
  { icon: '🎁', label: 'Regalos' }, { icon: '👕', label: 'Ropa' },
  { icon: '📱', label: 'Suscripciones' }, { icon: '📚', label: 'Educación' },
  { icon: '🐾', label: 'Mascotas' }, { icon: '✈️', label: 'Viajes' },
  { icon: '💇', label: 'Cuidado personal' }
];
// The first five indices are part of existing local data and backups.
const quickCategoryCount = 5;
const defaults = {
  version: 1, limit: 10000, currency: '€', expenses: [],
  shortcuts: [
    { icon: '☕', name: 'Café', cents: 150, category: 0 },
    { icon: '🥐', name: 'Desayuno', cents: 320, category: 1 },
    { icon: '🚌', name: 'Bus/Metro', cents: 140, category: 3 },
    { icon: '🥤', name: 'Refresco', cents: 200, category: 0 }
  ]
};
const maxCents = 99999999;
const decimal = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const localMonth = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const money = cents => `${decimal.format(cents / 100)} ${state.currency}`;
const categoryValid = index => Number.isInteger(index) && index >= 0 && index < categories.length;
const validCents = cents => Number.isInteger(cents) && cents > 0 && cents <= maxCents;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
let state = defaults;
let input = '';
let selected = 0;
let period = 'month';
let past = '';
let toastTimer;
let toastAction;
let pendingBackup;
let loadError = false;

function validate(data) {
  if (!data || data.version !== 1 || !validCents(data.limit) || !currencies.includes(data.currency) ||
      !Array.isArray(data.shortcuts) || data.shortcuts.length !== 4 || !Array.isArray(data.expenses)) {
    throw new Error('Formato de copia no válido');
  }
  const shortcuts = data.shortcuts.map(item => {
    if (!item || !validText(item.icon, 16) || !validText(item.name, 32) ||
        !validCents(item.cents) || !categoryValid(item.category)) throw new Error('Acceso rápido no válido');
    const { icon, name, cents, category } = item;
    return { icon, name, cents, category };
  });
  const ids = new Set();
  const expenses = data.expenses.map(item => {
    if (!item || !validText(item.id, 80) || ids.has(item.id) || !validText(item.name, 32) ||
        !validText(item.icon, 16) || !validCents(item.cents) || !categoryValid(item.category) ||
        !Number.isSafeInteger(item.at) || Number.isNaN(new Date(item.at).getTime())) throw new Error('Gasto no válido');
    ids.add(item.id);
    const { id, name, icon, cents, category, at } = item;
    return { id, name, icon, cents, category, at };
  });
  return { version: 1, limit: data.limit, currency: data.currency, shortcuts, expenses };
}

try {
  const saved = localStorage.getItem(key);
  if (saved !== null) state = validate(JSON.parse(saved));
} catch {
  loadError = true;
}

function save(next) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    notify('No se pudo guardar en este dispositivo.');
    return false;
  }
}

function el(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function button(content, action, className) {
  const node = el('button', content, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function notify(message, label, action, duration = 4000) {
  clearTimeout(toastTimer);
  $('toast').hidden = false;
  $('toast-text').textContent = message;
  $('toast-action').hidden = !action;
  $('toast-action').textContent = label || '';
  toastAction = action;
  toastTimer = setTimeout(closeToast, duration);
}

function closeToast() {
  $('toast').hidden = true;
  toastAction = undefined;
}

$('toast-action').addEventListener('click', () => {
  const action = toastAction;
  closeToast();
  action?.();
});

function centsOf(value) {
  const match = /^(\d{1,6})(?:[,.](\d{0,2}))?$/.exec(value.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0')) : 0;
}

function renderSummary() {
  const now = new Date();
  $('today').textContent = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(now);
  $('month').textContent = monthLabel.format(now);
  const cents = state.expenses.reduce((sum, expense) =>
    localMonth(new Date(expense.at)) === localMonth(now) ? sum + expense.cents : sum, 0);
  const percentage = cents * 100 / state.limit;
  const left = state.limit - cents;
  const health = percentage >= 95 ? 'bad' : percentage >= 75 ? 'warn' : 'good';
  $('total').textContent = money(cents);
  $('budget-label').textContent = 'de ' + money(state.limit);
  $('percent').textContent = Math.floor(percentage) + ' %';
  $('remaining').textContent = left < 0 ? money(-left) + ' por encima' : 'Quedan ' + money(left);
  $('status').textContent = left < 0 ? 'Límite superado' : left === 0 ? 'Límite alcanzado' :
    health === 'bad' ? 'Cerca del límite' : health === 'warn' ? 'Margen ajustado' : 'En control';
  $('progress').closest('.receipt').style.setProperty('--health', `var(--${health})`);
  $('progress').firstElementChild.style.width = Math.min(percentage, 100) + '%';
  $('progress').setAttribute('aria-valuenow', Math.min(100, Math.floor(percentage)));
  $('progress').setAttribute('aria-valuetext', Math.floor(percentage) + ' %');
}

function renderShortcuts() {
  $('shortcuts').replaceChildren(...state.shortcuts.map(item => {
    const node = button(undefined, () => addExpense(item));
    node.append(el('span', item.icon, 'emoji'), el('span', item.name, 'name'), el('strong', money(item.cents)));
    return node;
  }));
}

function addExpense(item) {
  const expense = { ...item, at: Date.now(), id: crypto.randomUUID() };
  if (!save({ ...state, expenses: [...state.expenses, expense] })) return false;
  renderSummary();
  renderHistory();
  notify(`${expense.name} · ${money(expense.cents)} añadido`, 'Deshacer', () => removeExpense(expense.id, false));
  return true;
}

function removeExpense(id, allowUndo = true) {
  const expense = state.expenses.find(item => item.id === id);
  if (!expense || !save({ ...state, expenses: state.expenses.filter(item => item.id !== id) })) return;
  renderSummary();
  renderHistory();
  if (!allowUndo) {
    notify('Gasto deshecho');
    return;
  }
  notify('Gasto eliminado', 'Deshacer', () => {
    if (!save({ ...state, expenses: [...state.expenses, expense] })) return;
    renderSummary();
    renderHistory();
    notify('Gasto restaurado');
  });
}

function renderAmount() {
  const [whole, fraction = ''] = input.split(',');
  $('amount').textContent = `${Number(whole || 0).toLocaleString('es-ES')},${fraction.padEnd(2, '0')} ${state.currency}`;
}

function press(value) {
  if (value === '⌫') input = input.slice(0, -1);
  else if (value === ',' && !input.includes(',')) input = (input || '0') + ',';
  else if (/^\d$/.test(value)) {
    const [whole, fraction] = input.split(',');
    if (fraction !== undefined ? fraction.length < 2 : whole.length < 6) {
      input = input === '0' ? value : input + value;
    }
  }
  renderAmount();
}

for (const value of ['1','2','3','4','5','6','7','8','9',',','0','⌫']) {
  const node = button(value, () => press(value));
  if (value === '⌫') node.setAttribute('aria-label', 'Borrar dígito');
  if (value === ',') node.setAttribute('aria-label', 'Coma decimal');
  $('keypad').append(node);
}
function categoryOptions(select, start = 0, emptyLabel) {
  if (emptyLabel) {
    const empty = el('option', emptyLabel);
    empty.value = '';
    select.append(empty);
  }
  categories.slice(start).forEach((category, index) => {
    const option = el('option', category.icon + ' ' + category.label);
    option.value = String(start + index);
    select.append(option);
  });
}

function selectCategory(index) {
  selected = index;
  Array.from($('categories').children).forEach((item, i) =>
    item.setAttribute('aria-pressed', i === selected));
  $('more-categories').value = selected >= quickCategoryCount ? String(selected) : '';
}

categories.slice(0, quickCategoryCount).forEach((category, index) => {
  const node = button(undefined, () => selectCategory(index));
  node.setAttribute('aria-pressed', index === selected);
  node.append(el('span', category.icon), document.createTextNode(category.label));
  $('categories').append(node);
});
categoryOptions($('more-categories'), quickCategoryCount, 'Ver opciones');
$('more-categories').addEventListener('change', event =>
  selectCategory(event.target.value === '' ? 0 : Number(event.target.value)));

$('add').addEventListener('click', () => {
  const cents = centsOf(input);
  if (!cents) return notify('Introduce un importe mayor que cero.');
  const { icon, label } = categories[selected];
  const name = $('expense-name').value.trim() || label;
  if (addExpense({ icon, name, cents, category: selected })) {
    input = '';
    $('expense-name').value = '';
    renderAmount();
  }
});
$('expense-name').addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  $('add').click();
  if (!$('expense-name').value) $('expense-name').blur();
});

document.addEventListener('keydown', event => {
  if ($('registro').hidden || event.ctrlKey || event.metaKey || event.altKey ||
      event.target.closest?.('input, select, textarea, [contenteditable], dialog')) return;
  const value = event.key === 'Backspace' ? '⌫' : event.key === '.' ? ',' : event.key;
  if (/^[0-9,⌫]$/.test(value)) {
    event.preventDefault();
    press(value);
  }
  if (event.key === 'Enter' && !event.target.closest?.('button, a')) $('add').click();
});

function filterExpenses(now) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  const end = new Date(day);
  end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  const query = searchable($('history-search').value.trim());
  const category = $('history-category').value;
  return state.expenses.filter(item => period === 'month'
    ? localMonth(new Date(item.at)) === (past || localMonth(now))
    : item.at >= day.getTime() && item.at < end.getTime()
  ).filter(item =>
    (category === '' || item.category === Number(category)) &&
    (!query || searchable(item.name).includes(query))
  ).sort((a, b) => b.at - a.at);
}

function searchable(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
}

function renderHistory() {
  const now = new Date();
  $('past-month').max = localMonth(now);
  $('past-month').value = past || localMonth(now);
  Array.from($('periods').children).forEach(node =>
    node.setAttribute('aria-pressed', node.dataset.period === period && !past));
  const expenses = filterExpenses(now);
  const sums = categories.map(() => 0);
  for (const item of expenses) sums[item.category] += item.cents;
  const total = sums.reduce((sum, cents) => sum + cents, 0);
  $('history-total').textContent = money(total);
  $('breakdown').replaceChildren();
  $('movements').replaceChildren();
  if (!expenses.length) {
    $('breakdown').append(el('p', 'Sin importes para mostrar.', 'empty'));
    const filtered = $('history-search').value.trim() || $('history-category').value !== '';
    $('movements').append(el('p', filtered ? 'Ningún gasto coincide con la búsqueda.' : 'Sin gastos en este periodo.', 'empty'));
    return;
  }
  sums.map((cents, index) => ({ cents, index })).sort((a, b) => b.cents - a.cents).forEach(({ cents, index }) => {
    if (!cents) return;
    const category = categories[index];
    const percentage = cents * 100 / total;
    const row = el('div', undefined, 'breakdown-row');
    const head = el('div', undefined, 'section-head');
    head.append(el('span', category.icon + ' ' + category.label), el('strong', money(cents) + ' · ' + Math.round(percentage) + ' %'));
    const track = el('div', undefined, 'track');
    const bar = el('span');
    bar.style.width = percentage + '%';
    track.append(bar);
    row.append(head, track);
    $('breakdown').append(row);
  });
  for (const expense of expenses) {
    const row = el('div', undefined, 'movement');
    const details = el('div');
    const time = el('time', dateLabel.format(expense.at));
    time.dateTime = new Date(expense.at).toISOString();
    details.append(el('strong', expense.name), time);
    if (expense.name !== categories[expense.category].label) time.append(' · ' + categories[expense.category].label);
    const remove = button('×', () => removeExpense(expense.id), 'delete');
    remove.setAttribute('aria-label', 'Eliminar ' + expense.name);
    row.append(el('span', expense.icon), details, el('strong', money(expense.cents)), remove);
    $('movements').append(row);
  }
}

$('periods').addEventListener('click', event => {
  if (!event.target.dataset.period) return;
  period = event.target.dataset.period;
  past = '';
  renderHistory();
});
$('past-month').addEventListener('change', event => {
  const value = event.target.value;
  if (value > localMonth(new Date())) return renderHistory();
  period = 'month';
  past = value === localMonth(new Date()) ? '' : value;
  renderHistory();
});
categoryOptions($('history-category'), 0, 'Todas');
$('history-search').addEventListener('input', renderHistory);
$('history-category').addEventListener('change', renderHistory);

function field(text, value, maxlength, mode) {
  const label = el('label', text);
  const input = el('input');
  input.required = true;
  input.maxLength = maxlength;
  input.value = value;
  if (mode) input.inputMode = mode;
  label.append(input);
  return label;
}

function editValue(cents) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function renderSettings() {
  $('limit').value = editValue(state.limit);
  $('currency').value = state.currency;
  $('shortcut-fields').replaceChildren(...state.shortcuts.map((item, index) => {
    const row = el('div', undefined, 'shortcut-row');
    const label = el('label', 'Categoría', 'shortcut-category');
    const select = el('select');
    categoryOptions(select);
    select.value = String(item.category);
    label.append(select);
    row.append(field('Emoji', item.icon, 16), field('Nombre', item.name, 32), field('Importe', editValue(item.cents), 10, 'decimal'), label);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Gasto habitual ' + (index + 1));
    return row;
  }));
}
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const limit = centsOf($('limit').value);
  const shortcuts = Array.from($('shortcut-fields').children).map(row => {
    const [icon, name, amount] = Array.from(row.querySelectorAll('input'), input => input.value.trim());
    return { icon, name, cents: centsOf(amount), category: Number(row.querySelector('select').value) };
  });
  if (!validCents(limit) || shortcuts.some(item => !item.icon || !item.name || !validCents(item.cents))) {
    return notify('Revisa los importes, nombres y emojis.');
  }
  const currency = $('currency').value;
  if (!save({ ...state, limit, currency, shortcuts })) return;
  refresh();
  notify('Ajustes guardados');
});

function download(name, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = el('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function csvCell(value) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
$('csv').addEventListener('click', () => {
  const rows = [['Fecha local', 'Nombre', 'Categoría', 'Importe', 'Moneda']];
  for (const item of [...state.expenses].sort((a, b) => b.at - a.at)) {
    rows.push([dateLabel.format(item.at), item.name, categories[item.category].label, editValue(item.cents), state.currency]);
  }
  download('yogasto-gastos.csv', 'text/csv;charset=utf-8', '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'));
});
$('backup').addEventListener('click', () => download('yogasto-copia.json', 'application/json', JSON.stringify(state, null, 2)));
$('import').addEventListener('click', () => $('backup-file').click());
$('backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    pendingBackup = validate(JSON.parse(await file.text()));
    $('import-dialog').showModal();
  } catch {
    notify('El archivo no es una copia válida de YoGasto.');
  }
});
$('import-dialog').addEventListener('close', () => {
  if ($('import-dialog').returnValue === 'restore' && pendingBackup && save(pendingBackup)) {
    refresh();
    notify('Copia importada');
  }
  pendingBackup = undefined;
  $('import-dialog').returnValue = '';
});

function refresh() {
  renderSummary();
  renderShortcuts();
  renderAmount();
  renderHistory();
  renderSettings();
}

function showView() {
  const views = ['registro', 'historial', 'ajustes'];
  const requested = location.hash.slice(1);
  const active = views.includes(requested) ? requested : 'registro';
  for (const view of views) {
    $(view).hidden = view !== active;
    const link = document.querySelector(`.navigation a[href="#${view}"]`);
    if (view === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (active === 'historial') renderHistory();
  else if (active === 'registro') renderSummary();
  window.scrollTo(0, 0);
}
$('edit-shortcuts').addEventListener('click', () => requestAnimationFrame(() =>
  $('shortcut-fields').querySelector('input').focus()));
window.addEventListener('hashchange', showView);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    renderSummary();
    if (!$('historial').hidden) renderHistory();
  }
});
refresh();
showView();
if (loadError) notify('No se pudieron leer los datos guardados.', undefined, undefined, 6500);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => notify('No se pudo preparar el uso sin conexión.'));
}
