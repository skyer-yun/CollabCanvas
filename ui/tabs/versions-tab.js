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
      var label = prompt('快照名称:', '快照 ' + (self._getSnapshots().length + 1));
      if (label && label.trim()) {
        if (self._app && self._app.snapshot) {
          self._app.snapshot.create(label.trim());
          self.refresh();
        }
      }
    };
    header.appendChild(snapBtn);

    return header;
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
      if (confirm('确定删除快照「' + snap.label + '」?')) {
        if (self._app && self._app.snapshot) {
          self._app.snapshot.remove(snap.id);
          self.refresh();
        }
      }
    };
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    return item;
  };

  /** Show restore confirmation dialog. */
  VersionsTab.prototype._confirmRestore = function (id, label) {
    var self = this;
    if (confirm('恢复快照「' + label + '」? 当前未保存的更改将丢失。')) {
      if (this._app && this._app.snapshot) {
        this._app.snapshot.restore(id);
      }
      if (this._app && this._app.restoreSnapshot) {
        this._app.restoreSnapshot(id);
      }
      this.refresh();
    }
  };

  /** Execute version comparison. */
  VersionsTab.prototype._doCompare = function () {
    if (!this._compareA || !this._compareB) {
      alert('请先选择两个版本进行对比。');
      return;
    }

    var snapA = this._app.snapshot.get(this._compareA);
    var snapB = this._app.snapshot.get(this._compareB);

    if (!snapA || !snapB) {
      alert('所选版本未找到。');
      return;
    }

    var differ = this._app.differ || new window.CCVersionDiffer();
    var result = differ.compare(snapA, snapB);
    var text = differ.formatDiff(result);

    alert('对比结果:\n' + text);
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
