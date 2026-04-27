/* FormAssembly module - manages forms, connectors, and error logs */
const FA = {
  PATH: 'data/formassembly.json',
  data: { forms: [] },
  _activeFormId: null, // form open in detail modal

  /* ---- Data loading ---- */
  async load() {
    try {
      const result = await db.readFile(this.PATH);
      this.data = result ? result.content : { forms: [] };
    } catch (err) {
      toast('Failed to load FormAssembly data: ' + err.message, 'error');
    }
    this.render();
  },

  async _commit(message) {
    await db.writeFile(this.PATH, this.data, message);
  },

  /* ---- Table rendering ---- */
  render() {
    const tbody = document.getElementById('fa-tbody');
    const forms = this.data.forms || [];

    if (forms.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No forms yet. Click "+ Add Form" to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = forms.map(f => {
      const errors    = f.errors || [];
      const openCount = errors.filter(e => e.status === 'open').length;
      const pillCls   = openCount > 0 ? 'open' : errors.length > 0 ? 'clean' : 'none';
      const pillText  = openCount > 0 ? `${openCount} open` : errors.length > 0 ? `${errors.length} logged` : '0';

      const connHtml = (f.connectors || []).length
        ? (f.connectors).map(c => `<span class="ctag">${esc(c)}</span>`).join('')
        : '<span style="color:var(--text-muted);font-size:12px">None</span>';

      return `<tr>
        <td>
          <div class="cell-primary">${esc(f.name)}</div>
          ${f.notes ? `<div class="cell-secondary truncate" title="${esc(f.notes)}">${esc(f.notes)}</div>` : ''}
        </td>
        <td><span class="cell-mono">${esc(f.formId || '-')}</span></td>
        <td>${fmtDate(f.lastModified)}</td>
        <td><div class="connector-tags">${connHtml}</div></td>
        <td><span class="err-pill ${pillCls}">${pillText}</span></td>
        <td><span class="${badgeCls(f.status)}">${statusLabel(f.status)}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary" onclick="FA.openDetail('${f.id}')">Details</button>
            <button class="btn btn-icon btn-sm" onclick="FA.openEdit('${f.id}')" title="Edit">${ICON_EDIT}</button>
            <button class="btn btn-icon btn-sm danger" onclick="FA.deleteForm('${f.id}')" title="Delete">${ICON_DEL}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  /* ---- Add / Edit form ---- */
  openAdd() {
    document.getElementById('fa-modal-title').textContent = 'Add Form';
    document.getElementById('fa-id-hidden').value       = '';
    document.getElementById('fa-name').value            = '';
    document.getElementById('fa-formid').value          = '';
    document.getElementById('fa-last-modified').value   = today();
    document.getElementById('fa-connectors').value      = '';
    document.getElementById('fa-status').value          = 'active';
    document.getElementById('fa-notes').value           = '';
    openModal('fa-modal');
  },

  openEdit(id) {
    const f = this.data.forms.find(f => f.id === id);
    if (!f) return;
    document.getElementById('fa-modal-title').textContent = 'Edit Form';
    document.getElementById('fa-id-hidden').value       = f.id;
    document.getElementById('fa-name').value            = f.name || '';
    document.getElementById('fa-formid').value          = f.formId || '';
    document.getElementById('fa-last-modified').value   = f.lastModified || '';
    document.getElementById('fa-connectors').value      = (f.connectors || []).join(', ');
    document.getElementById('fa-status').value          = f.status || 'active';
    document.getElementById('fa-notes').value           = f.notes || '';
    openModal('fa-modal');
  },

  async saveForm() {
    const id   = document.getElementById('fa-id-hidden').value;
    const name = document.getElementById('fa-name').value.trim();
    if (!name) { toast('Form name is required', 'error'); return; }

    const formData = {
      id:           id || genId(),
      name,
      formId:       document.getElementById('fa-formid').value.trim(),
      lastModified: document.getElementById('fa-last-modified').value,
      connectors:   document.getElementById('fa-connectors').value
                      .split(',').map(s => s.trim()).filter(Boolean),
      status:       document.getElementById('fa-status').value,
      notes:        document.getElementById('fa-notes').value.trim(),
      errors:       id ? (this.data.forms.find(f => f.id === id)?.errors || []) : [],
    };

    if (id) {
      const idx = this.data.forms.findIndex(f => f.id === id);
      if (idx !== -1) this.data.forms[idx] = formData;
    } else {
      this.data.forms.unshift(formData);
    }

    try {
      await this._commit(id ? `Edit form: ${name}` : `Add form: ${name}`);
      closeModal('fa-modal');
      this.render();
      toast(id ? 'Form updated' : 'Form added', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },

  async deleteForm(id) {
    const f = this.data.forms.find(f => f.id === id);
    if (!f || !confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    this.data.forms = this.data.forms.filter(f => f.id !== id);
    try {
      await this._commit(`Delete form: ${f.name}`);
      this.render();
      toast('Form deleted', 'success');
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  },

  /* ---- Detail modal (error log) ---- */
  openDetail(id) {
    const f = this.data.forms.find(f => f.id === id);
    if (!f) return;
    this._activeFormId = id;

    document.getElementById('fa-detail-name').textContent = f.name;

    const connHtml = (f.connectors || []).length
      ? (f.connectors).map(c => `<span class="ctag">${esc(c)}</span>`).join(' ')
      : '-';

    document.getElementById('fa-detail-meta').innerHTML = `
      <div class="detail-meta-grid">
        <div class="detail-field"><label>Form ID</label><span class="cell-mono">${esc(f.formId || '-')}</span></div>
        <div class="detail-field"><label>Status</label><span><span class="${badgeCls(f.status)}">${statusLabel(f.status)}</span></span></div>
        <div class="detail-field"><label>Last Modified</label><span>${fmtDate(f.lastModified)}</span></div>
        <div class="detail-field"><label>Connectors</label><span class="connector-tags">${connHtml}</span></div>
        ${f.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><span>${esc(f.notes)}</span></div>` : ''}
      </div>`;

    this._renderErrors(f);
    openModal('fa-detail-modal');
  },

  _renderErrors(f) {
    const errors = f.errors || [];
    const el = document.getElementById('fa-errors-list');
    if (errors.length === 0) {
      el.innerHTML = '<div class="empty-list">No errors logged for this form.</div>';
      return;
    }
    el.innerHTML = errors.map((e, i) => `
      <div class="log-item">
        <div class="log-item-header">
          <span class="log-item-date">${fmtDate(e.date)}</span>
          <div style="display:flex;gap:5px;align-items:center">
            <span class="${badgeCls(e.status)}">${statusLabel(e.status)}</span>
            <button class="btn btn-icon btn-sm danger" onclick="FA._deleteError('${f.id}',${i})" title="Remove">${ICON_X}</button>
          </div>
        </div>
        <div class="log-item-desc">${esc(e.description)}</div>
      </div>`).join('');
  },

  /* ---- Add Error ---- */
  openAddError() {
    document.getElementById('fa-error-form-id').value = this._activeFormId;
    document.getElementById('fa-error-date').value    = today();
    document.getElementById('fa-error-desc').value    = '';
    document.getElementById('fa-error-status').value  = 'open';
    openModal('fa-error-modal');
  },

  async saveError() {
    const formId = document.getElementById('fa-error-form-id').value;
    const desc   = document.getElementById('fa-error-desc').value.trim();
    if (!desc) { toast('Description is required', 'error'); return; }

    const f = this.data.forms.find(f => f.id === formId);
    if (!f) return;
    if (!f.errors) f.errors = [];

    f.errors.unshift({
      date:        document.getElementById('fa-error-date').value,
      description: desc,
      status:      document.getElementById('fa-error-status').value,
    });

    try {
      await this._commit(`Log error for form: ${f.name}`);
      closeModal('fa-error-modal');
      this._renderErrors(f);
      this.render();
      toast('Error logged', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },

  async _deleteError(formId, idx) {
    const f = this.data.forms.find(f => f.id === formId);
    if (!f) return;
    f.errors.splice(idx, 1);
    try {
      await this._commit(`Remove error from form: ${f.name}`);
      this._renderErrors(f);
      this.render();
      toast('Error removed', 'success');
    } catch (err) {
      toast('Save failed: ' + err.message, 'error');
    }
  },
};
