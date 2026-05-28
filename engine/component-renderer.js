/**
 * CollabCanvas -- Component Renderer
 * Handles edit/preview mode rendering for interactive components
 * (button, input, select, radio, checkbox, table, tree)
 */
;(function () {
  'use strict';

  function ComponentRenderer(state, bus, dom) {
    this.state = state;
    this.bus = bus;
    this.dom = dom;
    this._dropdownPanel = null;
    this._boundCloseDropdown = this._closeDropdown.bind(this);
  }

  // ---- Public API ----

  /**
   * Render component in the given mode ('edit' | 'preview')
   */
  ComponentRenderer.prototype.renderComponent = function (el, mode) {
    var type = el.getAttribute('data-type');
    if (!type) return;

    switch (type) {
      case 'button':  this._renderButton(el, mode); break;
      case 'input':   this._renderInput(el, mode); break;
      case 'select':  this._renderSelect(el, mode); break;
      case 'radio':   this._renderRadio(el, mode); break;
      case 'checkbox': this._renderCheckbox(el, mode); break;
      case 'table':   this._renderTable(el, mode); break;
      case 'tree':    this._renderTree(el, mode); break;
    }
  };

  /**
   * Apply a property change from component-dialog and refresh rendering
   */
  ComponentRenderer.prototype.applyPropertyChange = function (el, prop, value) {
    var type = el.getAttribute('data-type');
    switch (type) {
      case 'button':
        if (prop === 'text') { this._setButtonChild(el, value); }
        else if (prop === 'background') { el.style.background = value; }
        else if (prop === 'color') { el.style.color = value; }
        break;
      case 'input':
        if (prop === 'placeholder') {
          var inp = el.querySelector('input');
          if (inp) inp.placeholder = value;
        }
        break;
      case 'select':
        if (prop === 'options') { this._updateSelectOptions(el, value); }
        break;
      case 'radio':
      case 'checkbox':
        if (prop === 'label') {
          var span = el.querySelector('span');
          if (span) span.textContent = value;
        }
        break;
      case 'table':
        if (prop === 'data') { this._updateTableData(el, value); }
        break;
    }
  };

  /**
   * Serialize component interaction state for undo/redo
   */
  ComponentRenderer.prototype.getComponentState = function (el) {
    var type = el.getAttribute('data-type');
    var state = {};
    switch (type) {
      case 'select':
        var sel = el.querySelector('select');
        state.value = sel ? sel.value : '';
        break;
      case 'radio':
        var radios = el.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radios.length; i++) {
          if (radios[i].checked) state.value = radios[i].value;
        }
        break;
      case 'checkbox':
        var cbs = el.querySelectorAll('input[type="checkbox"]');
        state.checked = [];
        for (var j = 0; j < cbs.length; j++) {
          if (cbs[j].checked) state.checked.push(cbs[j].value);
        }
        break;
      case 'input':
        var inp = el.querySelector('input');
        state.value = inp ? inp.value : '';
        break;
    }
    return state;
  };

  /**
   * Restore component state
   */
  ComponentRenderer.prototype.setComponentState = function (el, data) {
    if (!data) return;
    var type = el.getAttribute('data-type');
    switch (type) {
      case 'select':
        var sel = el.querySelector('select');
        if (sel && data.value !== undefined) sel.value = data.value;
        break;
      case 'input':
        var inp = el.querySelector('input');
        if (inp && data.value !== undefined) inp.value = data.value;
        break;
    }
  };

  // ---- Button ----

  ComponentRenderer.prototype._renderButton = function (el, mode) {
    var btn = el.querySelector('button');
    if (!btn) return;

    if (mode === 'preview') {
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      // Add hover/active effects
      var self = this;
      btn.onmouseenter = function () { btn.classList.add('cc-btn-hover'); };
      btn.onmouseleave = function () { btn.classList.remove('cc-btn-hover', 'cc-btn-active'); };
      btn.onmousedown = function () { btn.classList.add('cc-btn-active'); };
      btn.onmouseup = function () { btn.classList.remove('cc-btn-active'); };
    } else {
      btn.style.pointerEvents = 'none';
      btn.style.cursor = 'default';
      btn.onmouseenter = null;
      btn.onmouseleave = null;
      btn.onmousedown = null;
      btn.onmouseup = null;
      btn.classList.remove('cc-btn-hover', 'cc-btn-active');
    }
  };

  ComponentRenderer.prototype._setButtonChild = function (el, text) {
    var btn = el.querySelector('button');
    if (btn) btn.innerText = text;
  };

  // ---- Input ----

  ComponentRenderer.prototype._renderInput = function (el, mode) {
    var inp = el.querySelector('input');
    if (!inp) return;

    if (mode === 'preview') {
      inp.readOnly = false;
      inp.style.cursor = 'text';
      inp.style.pointerEvents = 'auto';
    } else {
      inp.readOnly = true;
      inp.style.cursor = 'default';
      inp.style.pointerEvents = 'none';
    }
  };

  // ---- Select ----

  ComponentRenderer.prototype._renderSelect = function (el, mode) {
    var sel = el.querySelector('select');
    if (!sel) return;

    if (mode === 'preview') {
      sel.disabled = false;
      sel.style.pointerEvents = 'auto';
      sel.style.cursor = 'pointer';
    } else {
      sel.disabled = true;
      sel.style.pointerEvents = 'none';
      sel.style.cursor = 'default';
    }
  };

  ComponentRenderer.prototype._updateSelectOptions = function (el, optionsStr) {
    var sel = el.querySelector('select');
    if (!sel) return;

    sel.innerHTML = '';
    var opts;
    try {
      opts = JSON.parse(optionsStr);
    } catch (e) {
      opts = optionsStr.split(',').map(function (s) { return s.trim(); });
    }
    if (!Array.isArray(opts)) opts = [opts];

    var emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '请选择';
    sel.appendChild(emptyOpt);

    opts.forEach(function (o) {
      var opt = document.createElement('option');
      if (typeof o === 'object') {
        opt.value = o.value || o.label || '';
        opt.textContent = o.label || o.value || '';
      } else {
        opt.value = o;
        opt.textContent = o;
      }
      sel.appendChild(opt);
    });
  };

  // ---- Radio ----

  ComponentRenderer.prototype._renderRadio = function (el, mode) {
    var labels = el.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.pointerEvents = mode === 'preview' ? 'auto' : 'none';
      labels[i].style.cursor = mode === 'preview' ? 'pointer' : 'default';
    }
  };

  // ---- Checkbox ----

  ComponentRenderer.prototype._renderCheckbox = function (el, mode) {
    var labels = el.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.pointerEvents = mode === 'preview' ? 'auto' : 'none';
      labels[i].style.cursor = mode === 'preview' ? 'pointer' : 'default';
    }
  };

  // ---- Table ----

  ComponentRenderer.prototype._renderTable = function (el, mode) {
    var tds = el.querySelectorAll('td, th');
    for (var i = 0; i < tds.length; i++) {
      if (mode === 'edit') {
        tds[i].setAttribute('contenteditable', 'true');
        tds[i].style.outline = '1px dashed transparent';
        tds[i].onfocus = function () { this.style.outline = '1px dashed #1890ff'; };
        tds[i].onblur = function () { this.style.outline = '1px dashed transparent'; };
      } else {
        tds[i].removeAttribute('contenteditable');
        tds[i].style.outline = '';
        tds[i].onfocus = null;
        tds[i].onblur = null;
      }
    }
  };

  ComponentRenderer.prototype._updateTableData = function (el, data) {
    // data is expected to be 2D array: [[header1, header2], [cell1, cell2], ...]
    var arr;
    try { arr = JSON.parse(data); } catch (e) { return; }
    if (!Array.isArray(arr) || arr.length < 1) return;

    var oldTable = el.querySelector('table');
    if (oldTable) oldTable.remove();

    var table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var firstRow = arr[0];
    if (Array.isArray(firstRow)) {
      firstRow.forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'border:1px solid #e8e8e8;padding:6px 8px;background:#fafafa;text-align:left;';
        hr.appendChild(th);
      });
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var r = 1; r < arr.length; r++) {
      var tr = document.createElement('tr');
      if (Array.isArray(arr[r])) {
        arr[r].forEach(function (cell) {
          var td = document.createElement('td');
          td.textContent = cell;
          td.style.cssText = 'border:1px solid #e8e8e8;padding:6px 8px;';
          tr.appendChild(td);
        });
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    el.appendChild(table);
  };

  // ---- Tree ----

  ComponentRenderer.prototype._renderTree = function (el, mode) {
    // Trees are display-only, no special rendering difference
  };

  // ---- Dropdown panel (for select preview mode) ----

  ComponentRenderer.prototype._closeDropdown = function () {
    if (this._dropdownPanel) {
      this._dropdownPanel.remove();
      this._dropdownPanel = null;
    }
    document.removeEventListener('mousedown', this._boundCloseDropdown, true);
  };

  window.CCComponentRenderer = ComponentRenderer;
})();
