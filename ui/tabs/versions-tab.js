/**
 * CollabCanvas - Versions Tab Module
 * Version snapshot list with compare and restore
 * IIFE exporting to window.CCVersionsTab
 */
(function (global) {
  'use strict';

  /**
   * @param {object} app - CollabCanvas app reference
   */
  function VersionsTab(app) {
    this._app = app;
    this._container = null;
    this._compareA = null;
    this._compareB = null;
  }

  /**
   * Render the versions tab into a container element.
   * @param {HTMLElement} container
   */
  VersionsTab.prototype.render = function (container) {
    this._container = container;
    container.innerHTML = '';
    container.className = 'cc-versions-tab';

    // Header with Create Snapshot button
    var header = this._createHeader();
    container.appendChild(header);

    // Compare bar
    var compareBar = this._createCompareBar();
    container.appendChild(compareBar);

    // Version list
    var list = this._createList();
    container.appendChild(list);

    return this;
  };

  /** Create header with snapshot button. */
  VersionsTab.prototype._createHeader = function () {
    var self = this;
    var header = document.createElement('div');
    header.className = 'cc-styles-header';
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
      'padding:8px 12px;border-bottom:1px solid var(--cc-border-light,#f0f0f0);';

    var title = document.createElement('span');
    title.className = 'cc-styles-title';
    title.textContent = '版本快照';
    header.appendChild(title);

    var snapBtn = document.createElement('button');
    snapBtn.className = 'cc-ann-btn-new';
    snapBtn.textContent = '+ 创建快照';
    snapBtn.onclick = function () {
      self._openCreateSnapshotUI();
    };
    header.appendChild(snapBtn);

    return header;
  };

  /** Show inline snapshot name input instead of prompt(). */
  VersionsTab.prototype._openCreateSnapshotUI = function () {
    var self = this;
    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>\u5FEB\u7167\u540D\u79F0</label>' +
      '<input class="cc-comp-input" id="cc-snap-name" value="\u5FEB\u7167 ' +
      (self._getSnapshots().length + 1) + '"></div></div>';

    var modal = window.CCModal;
    if (!modal) return;
    modal.show('\u521B\u5EFA\u5FEB\u7167', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '\u521B\u5EFA', cls: 'primary', fn: function (d) {
          var input = document.getElementById('cc-snap-name');
          var label = input ? input.value.trim() : '';
          if (label && self._app && self._app.snapshot) {
            self._app.snapshot.create(label);
            self.refresh();
          }
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);
  };

  /** Create the compare selector bar. */
  VersionsTab.prototype._createCompareBar = function () {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-ann-filters';
    bar.style.cssText = 'display:flex;gap:4px;padding:6px 12px;align-items:center;' +
      'border-bottom:1px solid var(--cc-border-light,#f0f0f0);flex-wrap:wrap;';

    var snapshots = this._getSnapshots();

    var labelEl = document.createElement('span');
    labelEl.style.cssText = 'font-size:11px;color:var(--cc-text-secondary,#8c8c8c);flex-shrink:0;';
    labelEl.textContent = '对比:';
    bar.appendChild(labelEl);

    var selectA = document.createElement('select');
    selectA.className = 'cc-prop-select';
    selectA.style.cssText = 'flex:1;min-width:60px;height:24px;font-size:11px;';
    selectA.appendChild(this._defaultOption('版本 A'));
    for (var i = 0; i < snapshots.length; i++) {
      selectA.appendChild(this._snapshotOption(snapshots[i]));
    }
    selectA.onchange = function () {
      self._compareA = selectA.value ? parseInt(selectA.value, 10) : null;
    };
    bar.appendChild(selectA);

    var vs = document.createElement('span');
    vs.style.cssText = 'font-size:11px;color:var(--cc-text-tertiary,#bfbfbf);flex-shrink:0;';
    vs.textContent = 'vs';
    bar.appendChild(vs);

    var selectB = document.createElement('select');
    selectB.className = 'cc-prop-select';
    selectB.style.cssText = 'flex:1;min-width:60px;height:24px;font-size:11px;';
    selectB.appendChild(this._defaultOption('版本 B'));
    for (var j = 0; j < snapshots.length; j++) {
      selectB.appendChild(this._snapshotOption(snapshots[j]));
    }
    selectB.onchange = function () {
      self._compareB = selectB.value ? parseInt(selectB.value, 10) : null;
    };
    bar.appendChild(selectB);

    var compareBtn = document.createElement('button');
    compareBtn.className = 'cc-ann-btn-new';
    compareBtn.style.cssText = 'font-size:11px;padding:3px 8px;flex-shrink:0;';
    compareBtn.textContent = '对比';
    compareBtn.onclick = function () {
      self._doCompare();
    };
    bar.appendChild(compareBtn);

    return bar;
  };

  /** Create version list. */
  VersionsTab.prototype._createList = function () {
    var self = this;
    var list = document.createElement('div');
    list.className = 'cc-ann-list';
    list.style.cssText = 'flex:1;overflow-y:auto;';

    var snapshots = this._getSnapshots();

    if (snapshots.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'cc-ann-empty';
      empty.innerHTML = '<div class="cc-ann-empty-icon">V</div>' +
        '<div class="cc-ann-empty-text">暂无快照</div>' +
        '<div class="cc-ann-empty-hint">点击「创建快照」保存当前画布状态</div>';
      list.appendChild(empty);
      return list;
    }

    // Show newest first
    for (var i = snapshots.length - 1; i >= 0; i--) {
      list.appendChild(this._createItem(snapshots[i]));
    }

    return list;
  };

  /** Create a single version item element. */
  VersionsTab.prototype._createItem = function (snap) {
    var self = this;
    var item = document.createElement('div');
    item.className = 'cc-ann-item';

    // Dot indicator
    var dot = document.createElement('span');
    dot.className = 'cc-ann-status';
    dot.style.background = '#1677ff';
    item.appendChild(dot);

    // Content
    var content = document.createElement('div');
    content.className = 'cc-ann-content';

    var label = document.createElement('div');
    label.className = 'cc-ann-text';
    label.textContent = snap.label;
    content.appendChild(label);

    var meta = document.createElement('div');
    meta.className = 'cc-ann-meta';
    meta.innerHTML = '<span class="cc-ann-time">' + this._formatTime(snap.timestamp) + '</span>';
    content.appendChild(meta);

    item.appendChild(content);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'cc-ann-actions';

    var restoreBtn = document.createElement('button');
    restoreBtn.className = 'cc-ann-action-btn';
    restoreBtn.textContent = 'R';
    restoreBtn.title = '恢复';
    restoreBtn.onclick = function (e) {
      e.stopPropagation();
      self._confirmRestore(snap.id, snap.label);
    };
    actions.appendChild(restoreBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'cc-ann-action-btn cc-ann-del-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = '删除';
    deleteBtn.onclick = function (e) {
      e.stopPropagation();
      self._confirmDelete(snap.id, snap.label);
    };
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  };

  /** Show restore confirmation dialog. */
  VersionsTab.prototype._confirmRestore = function (id, label) {
    var self = this;
    var modal = window.CCModal;
    if (!modal) {
      // Fallback: just do it
      this._doRestore(id);
      return;
    }
    var html = '<div style="padding:12px;font-size:13px;">\u6062\u590D\u5FEB\u7167\u300C' +
      label + '\u300D? \u5F53\u524D\u672A\u4FDD\u5B58\u7684\u66F4\u6539\u5C06\u4E22\u5931\u3002</div>';
    modal.show('\u786E\u8BA4\u6062\u590D', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '\u6062\u590D', cls: 'primary', fn: function (d) {
          self._doRestore(id);
          self.refresh();
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);
  };

  VersionsTab.prototype._doRestore = function (id) {
    if (this._app && this._app.snapshot) {
      this._app.snapshot.restore(id);
    }
    if (this._app && this._app.restoreSnapshot) {
      this._app.restoreSnapshot(id);
    }
  };

  /** Confirm delete with modal instead of confirm(). */
  VersionsTab.prototype._confirmDelete = function (id, label) {
    var self = this;
    var modal = window.CCModal;
    if (!modal) return;
    var html = '<div style="padding:12px;font-size:13px;">\u786E\u5B9A\u5220\u9664\u5FEB\u7167\u300C' +
      label + '\u300D?</div>';
    modal.show('\u786E\u8BA4\u5220\u9664', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '\u5220\u9664', cls: 'danger', fn: function (d) {
          if (self._app && self._app.snapshot) {
            self._app.snapshot.remove(id);
            self.refresh();
          }
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);
  };

  /** Execute version comparison. */
  VersionsTab.prototype._doCompare = function () {
    if (!this._compareA || !this._compareB) {
      if (window.__CC && window.__CC.toast) window.__CC.toast.show('\u8BF7\u5148\u9009\u62E9\u4E24\u4E2A\u7248\u672C\u8FDB\u884C\u5BF9\u6BD4', 'info');
      return;
    }

    var snapA = this._app.snapshot.get(this._compareA);
    var snapB = this._app.snapshot.get(this._compareB);

    if (!snapA || !snapB) {
      if (window.__CC && window.__CC.toast) window.__CC.toast.show('\u6240\u9009\u7248\u672C\u672A\u627E\u5230', 'info');
      return;
    }

    var differ = this._app.differ || new window.CCVersionDiffer();
    var result = differ.compare(snapA, snapB);
    var text = differ.formatDiff(result);

    // Render comparison result inline in a modal
    var html = '<div class="cc-comp-form">' +
      '<textarea class="cc-comp-input cc-comp-textarea" rows="14" readonly style="font-size:11px;font-family:Consolas,monospace;">' +
      text.replace(/</g, '&lt;') + '</textarea></div>';

    var modal = window.CCModal;
    if (modal) {
      modal.show('\u7248\u672C\u5BF9\u6BD4\u7ED3\u679C', html, [
        { text: '\u5173\u95ED', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } }
      ]);
    }
  };

  /** Get snapshots array from app. */
  VersionsTab.prototype._getSnapshots = function () {
    if (this._app && this._app.snapshot) {
      return this._app.snapshot.list();
    }
    return [];
  };

  /** Format timestamp to readable string. */
  VersionsTab.prototype._formatTime = function (ts) {
    var d = new Date(ts);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    var mon = (d.getMonth() + 1).toString().padStart(2, '0');
    var day = d.getDate().toString().padStart(2, '0');
    return mon + '/' + day + ' ' + h + ':' + m;
  };

  /** Create default select option. */
  VersionsTab.prototype._defaultOption = function (text) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = text;
    return opt;
  };

  /** Create a snapshot option for select. */
  VersionsTab.prototype._snapshotOption = function (snap) {
    var opt = document.createElement('option');
    opt.value = snap.id;
    opt.textContent = snap.label + ' (' + this._formatTime(snap.timestamp) + ')';
    return opt;
  };

  /** Refresh the tab. */
  VersionsTab.prototype.refresh = function () {
    if (this._container) {
      this.render(this._container);
    }
  };

  global.CCVersionsTab = VersionsTab;
})(window);
