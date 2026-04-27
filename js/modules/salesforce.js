/* Salesforce module - tracks object/field/flow/rule changes across environments */
const SF = {
  PATH: 'data/salesforce.json',
  data: { changes: [] },
  _filters: { type: '', status: '' },

  /* ---- Data loading ---- */
  async load() {
    try {
      const result = await db.readFile(this.PATH);
      this.data = result ? result.content : { changes: [] };
    } catch (err) {
      toast('Failed to load Salesforce data: ' + err.message, 'error');
    }
    this.render();
  },

  async _commit(message) {
    await db.writeFile(this.PATH, this.data, message);
  },

  /* ---- Table rendering ---- */
  render() {
    const tbody = document.getElementById('sf-tbody');
    let changes  = this.data.changes || [];

    if (this._filters.type)   changes = changes.filter(c => c.changeType === this._filters.type);
    if (this._filters.status) changes = changes.filter(c => c.status === this._filters.status);

    if (changes.length === 0) {
      const hint = (this._filters.type || this._filters.status)
        ? 'No changes match the current filters.'
        : 'No changes yet. Click "+ Add Change" to get started.';
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${hint}</td></tr>`;
      return;
    }

    tbody.innerHTML = changes.map(c => `<tr>
      <td>
        <div class="cell-primary">${esc(c.object)}</div>
        ${c.name ? `<div class="cell-secondary cell-mono">${esc(c.name)}</div>` : ''}
      </td>
      <td><span class="badge badge-type">${typeLabel(c.changeType)}</span></td>
      <td>
        <div class="truncate" title="${esc(c.description)}" style="max-width:260px">${esc(c.description || '-')}</div>
        ${c.notes ? `<div class="cell-secondary truncate" title="${esc(c.notes)}">${esc(c.notes)}</div>` : ''}
      </td>
      <td>${fmtDate(c.date)}</td>
      <td><span class="${badgeCls(c.status)}">${statusLabel(c.status)}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-icon btn-sm" onclick="SF.openEdit('${c.id}')" title="Edit">${ICON_EDIT}</button>
          <button class="btn btn-icon btn-sm danger" onclick="SF.deleteRecord('${c.id}')" title="Delete">${ICON_DEL}</button>
        </div>
      </td>
    </tr>`).join('');
  },

  /* ---- Filters ---- */
  applyFilters() {
    this._filters.type   = document.getElementById('sf-filter-type').value;
    this._filters.status = document.getElementById('sf-filter-status').value;
    this.render();
  },

  clearFilters() {
    this._filters = { type: '', status: '' };
    document.getElementById('sf-filter-type').value   = '';
    document.getElementById('sf-filter-status').value = '';
    this.render();
  },

  /* ---- Add / Edit ---- */
  openAdd() {
    document.getElementById('sf-modal-title').textContent = 'Add Change';
    document.getElementById('sf-id-hidden').value    = '';
    document.getElementById('sf-object').value        = '';
    document.getElementById('sf-change-type').value  = 'field';
    document.getElementById('sf-name').value          = '';
    document.getElementById('sf-description').value   = '';
    document.getElementById('sf-date').value          = today();
    document.getElementById('sf-status').value        = 'planned';
    document.getElementById('sf-notes').value         = '';
    openModal('sf-modal');
  },

  openEdit(id) {
    const c = this.data.changes.find(c => c.id === id);
    if (!c) return;
    document.getElementById('sf-modal-title').textContent = 'Edit Change';
    document.getElementById('sf-id-hidden').value    = c.id;
    document.getElementById('sf-object').value        = c.object || '';
    document.getElementById('sf-change-type').value  = c.changeType || 'field';
    document.getElementById('sf-name').value          = c.name || '';
    document.getElementById('sf-description').value   = c.description || '';
    document.getElementById('sf-date').value          = c.date || '';
    document.getElementById('sf-status').value        = c.status || 'planned';
    document.getElementById('sf-notes').value         = c.notes || '';
    openModal('sf-modal');
  },

  async saveRecord() {
    const id     = document.getElementById('sf-id-hidden').value;
    const object = document.getElementById('sf-object').value.trim();
    const desc   = document.getElementById('sf-description').value.trim();
    if (!object) { toast('Object name is required', 'error'); return; }
    if (!desc)   { toast('Description is required', 'error'); return; }

    const record = {
      id:         id || genId(),
      object,
      changeType: document.getElementById('sf-change-type').value,
      name:       document.getElementById('sf-name').value.trim(),
      description: desc,
      date:       document.getElementById('sf-date').value,
      status:     document.getElementById('sf-status').value,
      notes:      document.getElementById('sf-notes').value.trim(),
    };

    if (id) {
      const idx = this.data.changes.findIndex(c => c.id === id);
      if (idx !== -1) this.data.changes[idx] = record;
    } else {
      this.data.changes.unshift(record);
    }

    try {
      await this._commit(id ? `Edit SF change: ${object}` : `Add SF change: ${object}`);
      closeModal('sf-modal');
      this.render();
      toast(id ? 'Change updated' : 'Change added', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },

  async deleteRecord(id) {
    const c = this.data.changes.find(c => c.id === id);
    if (!c || !confirm(`Delete this change for "${c.object}"? This cannot be undone.`)) return;
    this.data.changes = this.data.changes.filter(c => c.id !== id);
    try {
      await this._commit(`Delete SF change: ${c.object}`);
      this.render();
      toast('Change deleted', 'success');
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  },
};
