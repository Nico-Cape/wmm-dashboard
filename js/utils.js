/* Shared utilities used by all modules */

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(str) {
  if (!str) return '-';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Returns CSS class string for a given status key */
function badgeCls(status) {
  return `badge badge-${(status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
}

/* Human-readable label for status keys */
function statusLabel(s) {
  const map = {
    'active': 'Active', 'inactive': 'Inactive', 'draft': 'Draft', 'archived': 'Archived',
    'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved', 'ignored': 'Ignored',
    'planned': 'Planned', 'in-dev': 'In Dev', 'in-review': 'In Review',
    'staging': 'Staging', 'production': 'Production', 'complete': 'Complete',
  };
  return map[s] || s || '-';
}

/* Human-readable label for SF change type keys */
function typeLabel(t) {
  const map = {
    'field': 'Field', 'object': 'Object', 'flow': 'Flow',
    'rule': 'Validation Rule', 'trigger': 'Trigger / Apex',
    'page-layout': 'Page Layout', 'permission': 'Permission Set',
    'report': 'Report / Dashboard', 'other': 'Other',
  };
  return map[t] || t || '-';
}

/* Toast notifications */
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

/* Modal helpers */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

/* Icon SVGs (shared) */
const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

const ICON_DEL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

const ICON_X = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
