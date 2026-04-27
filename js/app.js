/* Main application - initializes modules and wires all events */
document.addEventListener('DOMContentLoaded', () => {

  /* ---- Sidebar navigation ---- */
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('section-' + btn.dataset.section).classList.add('active');
    });
  });

  /* ---- Global modal close handlers ---- */
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  /* ---- Settings ---- */
  document.getElementById('settings-btn').addEventListener('click', () => {
    const cfg = db.config;
    document.getElementById('gh-owner').value  = cfg.owner  || '';
    document.getElementById('gh-repo').value   = cfg.repo   || '';
    document.getElementById('gh-branch').value = cfg.branch || 'main';
    document.getElementById('gh-token').value  = cfg.token  || '';
    openModal('settings-modal');
  });

  document.getElementById('settings-save-btn').addEventListener('click', async () => {
    const cfg = {
      owner:  document.getElementById('gh-owner').value.trim(),
      repo:   document.getElementById('gh-repo').value.trim(),
      branch: document.getElementById('gh-branch').value.trim() || 'main',
      token:  document.getElementById('gh-token').value.trim(),
    };
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      toast('Owner, repository, and token are all required', 'error');
      return;
    }
    setStatus('loading', 'Connecting...');
    try {
      db.saveConfig(cfg);
      await db.testConnection();
      closeModal('settings-modal');
      toast('Connected to GitHub', 'success');
      await loadAll();
    } catch (err) {
      setStatus('error', 'Connection failed: ' + err.message);
      toast('Connection failed: ' + err.message, 'error');
    }
  });

  /* ---- Reload button ---- */
  document.getElementById('reload-btn').addEventListener('click', async () => {
    if (!db.isConfigured()) { toast('Configure GitHub first', 'error'); return; }
    // Clear sha cache so files are re-fetched fresh
    db._cache = {};
    await loadAll();
  });

  /* ---- FormAssembly events ---- */
  document.getElementById('fa-add-btn').addEventListener('click',       () => FA.openAdd());
  document.getElementById('fa-save-btn').addEventListener('click',      () => FA.saveForm());
  document.getElementById('fa-add-error-btn').addEventListener('click', () => FA.openAddError());
  document.getElementById('fa-error-save-btn').addEventListener('click',() => FA.saveError());

  /* ---- Email Template events ---- */
  document.getElementById('et-add-btn').addEventListener('click',          () => ET.openAdd());
  document.getElementById('et-save-btn').addEventListener('click',         () => ET.saveTemplate());
  document.getElementById('et-add-change-btn').addEventListener('click',   () => ET.openAddChange());
  document.getElementById('et-change-save-btn').addEventListener('click',  () => ET.saveChange());

  /* ---- Salesforce events ---- */
  document.getElementById('sf-add-btn').addEventListener('click',       () => SF.openAdd());
  document.getElementById('sf-save-btn').addEventListener('click',      () => SF.saveRecord());
  document.getElementById('sf-filter-type').addEventListener('change',   () => SF.applyFilters());
  document.getElementById('sf-filter-status').addEventListener('change', () => SF.applyFilters());
  document.getElementById('sf-clear-filters').addEventListener('click',  () => SF.clearFilters());

  /* ---- Boot ---- */
  if (db.isConfigured()) {
    loadAll();
  } else {
    setStatus('', 'Not connected - open Settings to configure GitHub');
    setTimeout(() => openModal('settings-modal'), 400);
  }
});

/* Load all three data modules */
async function loadAll() {
  setStatus('loading', 'Loading...');
  try {
    await Promise.all([FA.load(), ET.load(), SF.load()]);
    const { owner, repo, branch } = db.config;
    setStatus('connected', `${owner}/${repo}  (${branch})`);
  } catch (err) {
    setStatus('error', 'Load error: ' + err.message);
    toast('Failed to load data: ' + err.message, 'error');
  }
}

/* Update the status bar */
function setStatus(state, text) {
  const dot  = document.getElementById('status-dot');
  const label = document.getElementById('connection-status');
  dot.className  = 'status-indicator' + (state ? ' ' + state : '');
  label.textContent = text;
}
