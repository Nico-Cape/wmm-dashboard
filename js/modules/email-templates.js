/* Email Templates module - manages Google Doc templates and change history */
const ET = {
  PATH: 'data/email-templates.json',
  data: { templates: [] },
  _activeTplId: null,

  /* ---- Data loading ---- */
  async load() {
    try {
      const result = await db.readFile(this.PATH);
      this.data = result ? result.content : { templates: [] };
    } catch (err) {
      toast('Failed to load Email Template data: ' + err.message, 'error');
    }
    this.render();
  },

  async _commit(message) {
    await db.writeFile(this.PATH, this.data, message);
  },

  /* ---- Table rendering ---- */
  render() {
    const tbody = document.getElementById('et-tbody');
    const tpls  = this.data.templates || [];

    if (tpls.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No templates yet. Click "+ Add Template" to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = tpls.map(t => {
      const changes    = t.changes || [];
      const lastChange = changes[0];

      return `<tr>
        <td>
          <div class="cell-primary">${esc(t.name)}</div>
          ${t.docUrl
            ? `<div class="cell-secondary"><a href="${esc(t.docUrl)}" target="_blank" rel="noopener">Open Doc &nearr;</a></div>`
            : ''}
        </td>
        <td>
          <div class="truncate" title="${esc(t.purpose)}" style="max-width:200px">${esc(t.purpose || '-')}</div>
        </td>
        <td>${lastChange ? fmtDate(lastChange.date) : '-'}</td>
        <td><span class="err-pill none">${changes.length}</span></td>
        <td><span class="${badgeCls(t.status)}">${statusLabel(t.status)}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary" onclick="ET.openDetail('${t.id}')">Details</button>
            <button class="btn btn-icon btn-sm" onclick="ET.openEdit('${t.id}')" title="Edit">${ICON_EDIT}</button>
            <button class="btn btn-icon btn-sm danger" onclick="ET.deleteTemplate('${t.id}')" title="Delete">${ICON_DEL}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  /* ---- Add / Edit template ---- */
  openAdd() {
    document.getElementById('et-modal-title').textContent = 'Add Template';
    document.getElementById('et-id-hidden').value  = '';
    document.getElementById('et-name').value        = '';
    document.getElementById('et-purpose').value     = '';
    document.getElementById('et-doc-url').value     = '';
    document.getElementById('et-status').value      = 'active';
    document.getElementById('et-notes').value       = '';
    openModal('et-modal');
  },

  openEdit(id) {
    const t = this.data.templates.find(t => t.id === id);
    if (!t) return;
    document.getElementById('et-modal-title').textContent = 'Edit Template';
    document.getElementById('et-id-hidden').value  = t.id;
    document.getElementById('et-name').value        = t.name || '';
    document.getElementById('et-purpose').value     = t.purpose || '';
    document.getElementById('et-doc-url').value     = t.docUrl || '';
    document.getElementById('et-status').value      = t.status || 'active';
    document.getElementById('et-notes').value       = t.notes || '';
    openModal('et-modal');
  },

  async saveTemplate() {
    const id      = document.getElementById('et-id-hidden').value;
    const name    = document.getElementById('et-name').value.trim();
    const purpose = document.getElementById('et-purpose').value.trim();
    if (!name)    { toast('Template name is required', 'error'); return; }
    if (!purpose) { toast('Purpose is required', 'error'); return; }

    const tplData = {
      id:      id || genId(),
      name,
      purpose,
      docUrl:  document.getElementById('et-doc-url').value.trim(),
      status:  document.getElementById('et-status').value,
      notes:   document.getElementById('et-notes').value.trim(),
      changes: id ? (this.data.templates.find(t => t.id === id)?.changes || []) : [],
    };

    if (id) {
      const idx = this.data.templates.findIndex(t => t.id === id);
      if (idx !== -1) this.data.templates[idx] = tplData;
    } else {
      this.data.templates.unshift(tplData);
    }

    try {
      await this._commit(id ? `Edit template: ${name}` : `Add template: ${name}`);
      closeModal('et-modal');
      this.render();
      toast(id ? 'Template updated' : 'Template added', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },

  async deleteTemplate(id) {
    const t = this.data.templates.find(t => t.id === id);
    if (!t || !confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    this.data.templates = this.data.templates.filter(t => t.id !== id);
    try {
      await this._commit(`Delete template: ${t.name}`);
      this.render();
      toast('Template deleted', 'success');
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  },

  /* ---- Detail modal (change history) ---- */
  openDetail(id) {
    const t = this.data.templates.find(t => t.id === id);
    if (!t) return;
    this._activeTplId = id;

    document.getElementById('et-detail-name').textContent = t.name;

    document.getElementById('et-detail-meta').innerHTML = `
      <div class="detail-meta-grid">
        <div class="detail-field" style="grid-column:1/-1"><label>Purpose</label><span>${esc(t.purpose || '-')}</span></div>
        <div class="detail-field"><label>Status</label><span><span class="${badgeCls(t.status)}">${statusLabel(t.status)}</span></span></div>
        ${t.docUrl
          ? `<div class="detail-field"><label>Google Doc</label><span><a href="${esc(t.docUrl)}" target="_blank" rel="noopener">Open Document &nearr;</a></span></div>`
          : ''}
        ${t.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><span>${esc(t.notes)}</span></div>` : ''}
      </div>`;

    this._renderChanges(t);
    openModal('et-detail-modal');
  },

  _renderChanges(t) {
    const changes = t.changes || [];
    const el = document.getElementById('et-changes-list');
    if (changes.length === 0) {
      el.innerHTML = '<div class="empty-list">No changes logged yet.</div>';
      return;
    }
    el.innerHTML = changes.map((c, i) => `
      <div class="log-item">
        <div class="log-item-header">
          <span class="log-item-date">${fmtDate(c.date)}</span>
          <button class="btn btn-icon btn-sm danger" onclick="ET._deleteChange('${t.id}',${i})" title="Remove">${ICON_X}</button>
        </div>
        <div class="log-item-desc">${esc(c.description)}</div>
      </div>`).join('');
  },

  /* ---- Log Change ---- */
  openAddChange() {
    document.getElementById('et-change-tid').value   = this._activeTplId;
    document.getElementById('et-change-date').value  = today();
    document.getElementById('et-change-desc').value  = '';
    openModal('et-change-modal');
  },

  async saveChange() {
    const tplId = document.getElementById('et-change-tid').value;
    const desc  = document.getElementById('et-change-desc').value.trim();
    if (!desc) { toast('Description is required', 'error'); return; }

    const t = this.data.templates.find(t => t.id === tplId);
    if (!t) return;
    if (!t.changes) t.changes = [];

    t.changes.unshift({
      date:        document.getElementById('et-change-date').value,
      description: desc,
    });

    try {
      await this._commit(`Log change for template: ${t.name}`);
      closeModal('et-change-modal');
      this._renderChanges(t);
      this.render();
      toast('Change logged', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },

  async _deleteChange(tplId, idx) {
    const t = this.data.templates.find(t => t.id === tplId);
    if (!t) return;
    t.changes.splice(idx, 1);
    try {
      await this._commit(`Remove change from template: ${t.name}`);
      this._renderChanges(t);
      this.render();
      toast('Change removed', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },
};
