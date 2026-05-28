/**
 * CollabCanvas -- Notes & Annotations Tab (Right Panel)
 * Unified view combining sticky notes + annotations with:
 *   area/component/number/coordinates association
 *   3 display modes: full / compact / hidden
 *   Export to Markdown/JSON
 *   Standalone output (no CC dependency)
 */
;(function () {
  'use strict';

  var DISPLAY_MODES = ['full', 'compact', 'hidden'];
  var DISPLAY_LABELS = { full: '完整', compact: '紧凑', hidden: '隐藏' };
  var STATUS_LABELS = { pending: '待处理', 'in-progress': '进行中', resolved: '已解决' };

  function NotesAnnotationsTab(state, bus) {
    this._state = state;
    this._bus = bus;
    this._container = null;
    this._filter = 'all';
    this._displayMode = 'full';
    this._eventsBound = false;
    this._onAnnotationCreated = this._onAnnotationChanged.bind(this);
    this._onAnnotationUpdated = this._onAnnotationChanged.bind(this);
    this._onAnnotationRemoved = this._onAnnotationChanged.bind(this);
    this._onElementCreated = this._onAnnotationChanged.bind(this);
  }

  NotesAnnotationsTab.prototype.render = function (container) {
    this._container = container;
    this._bindEvents();
    this._draw();
  };

  NotesAnnotationsTab.prototype.refresh = function () {
    this._draw();
  };

  NotesAnnotationsTab.prototype._bindEvents = function () {
    if (this._eventsBound || !this._bus) return;
    this._eventsBound = true;
    this._bus.on('annotation:created', this._onAnnotationCreated);
    this._bus.on('annotation:updated', this._onAnnotationUpdated);
    this._bus.on('annotation:removed', this._onAnnotationRemoved);
    this._bus.on('element:created', this._onElementCreated);
  };

  NotesAnnotationsTab.prototype._onAnnotationChanged = function () {
    this._drawList();
  };

  // ---- Full Draw ----

  NotesAnnotationsTab.prototype._draw = function () {
    var c = this._container;
    if (!c) return;
    c.innerHTML = '';
    c.className = 'cc-na-tab';

    // Header with display mode toggle + export
    this._drawHeader(c);
    // List
    this._drawList(c);
  };

  NotesAnnotationsTab.prototype._drawHeader = function (container) {
    var self = this;

    var header = document.createElement('div');
    header.className = 'cc-na-header';

    // Title
    var title = document.createElement('span');
    title.className = 'cc-na-title';
    title.textContent = '备注与标注';
    header.appendChild(title);

    // Display mode buttons
    var modeGroup = document.createElement('div');
    modeGroup.className = 'cc-na-mode-group';
    DISPLAY_MODES.forEach(function (mode) {
      var btn = document.createElement('button');
      btn.className = 'cc-na-mode-btn' + (self._displayMode === mode ? ' active' : '');
      btn.textContent = DISPLAY_LABELS[mode];
      btn.title = mode === 'full' ? '完整显示' : mode === 'compact' ? '紧凑显示' : '隐藏标注';
      btn.addEventListener('click', function () {
        self._displayMode = mode;
        self._applyDisplayMode();
        self._drawHeader(container);
      });
      modeGroup.appendChild(btn);
    });
    header.appendChild(modeGroup);

    // Export button
    var exportBtn = document.createElement('button');
    exportBtn.className = 'cc-na-export-btn';
    exportBtn.textContent = '导出';
    exportBtn.title = '导出标注数据';
    exportBtn.addEventListener('click', function () { self._showExportDialog(); });
    header.appendChild(exportBtn);

    container.appendChild(header);

    // Filters
    var filterBar = document.createElement('div');
    filterBar.className = 'cc-na-filters';
    ['all', 'pending', 'in-progress', 'resolved'].forEach(function (f) {
      var btn = document.createElement('button');
      btn.className = 'cc-na-filter-btn' + (self._filter === f ? ' active' : '');
      btn.textContent = f === 'all' ? '全部' : STATUS_LABELS[f];
      btn.addEventListener('click', function () {
        self._filter = f;
        self._draw(container);
      });
      filterBar.appendChild(btn);
    });
    container.appendChild(filterBar);
  };

  // ---- List ----

  NotesAnnotationsTab.prototype._drawList = function (container) {
    if (!container) container = this._container;
    if (!container) return;

    var existing = container.querySelector('.cc-na-list');
    if (existing) existing.remove();

    var list = document.createElement('div');
    list.className = 'cc-na-list';

    var annotations = this._state.get('annotations.list') || [];
    var canvasEl = this._state.canvas;
    var filtered = this._applyFilter(annotations);
    var self = this;

    if (filtered.length === 0) {
      list.innerHTML = '<div class="cc-tab-empty">暂无标注</div>';
      container.appendChild(list);
      return;
    }

    // Count badge
    var countEl = document.createElement('div');
    countEl.className = 'cc-na-count';
    countEl.textContent = filtered.length + ' 条标注';
    list.appendChild(countEl);

    filtered.forEach(function (ann, idx) {
      var item = self._buildItem(ann, idx + 1, canvasEl);
      list.appendChild(item);
    });

    container.appendChild(list);
  };

  NotesAnnotationsTab.prototype._buildItem = function (ann, num, canvasEl) {
    var self = this;
    var annSettings = this._state.get('settings.annotations') || {};

    var item = document.createElement('div');
    item.className = 'cc-na-item';
    item.setAttribute('data-ann-id', ann.id);

    // Left: number badge (respects autoNumber setting)
    var badge = document.createElement('div');
    badge.className = 'cc-na-num';
    badge.style.background = ann.color || '#1677ff';
    badge.textContent = annSettings.autoNumber !== false ? this._formatNumber(num) : '';
    badge.style.display = annSettings.autoNumber !== false ? '' : 'none';
    item.appendChild(badge);

    // Right: content
    var content = document.createElement('div');
    content.className = 'cc-na-content';

    // Row 1: text
    var textRow = document.createElement('div');
    textRow.className = 'cc-na-text';
    textRow.textContent = ann.text || '(无内容)';
    content.appendChild(textRow);

    // Row 2: meta (area + component + coords)
    var meta = document.createElement('div');
    meta.className = 'cc-na-meta';

    var exporter = window.CCAnnotationExporter;
    var structured = exporter ? exporter.prototype.buildStructuredData([ann], canvasEl) : [];
    var s = structured[0] || {};

    if (s.area) {
      var areaTag = document.createElement('span');
      areaTag.className = 'cc-na-tag';
      areaTag.textContent = s.area;
      meta.appendChild(areaTag);
    }
    if (s.component) {
      var compTag = document.createElement('span');
      compTag.className = 'cc-na-tag cc-na-tag-comp';
      compTag.textContent = s.component;
      meta.appendChild(compTag);
    }
    // PRD fields: module tag
    if (ann.module) {
      var moduleTag = document.createElement('span');
      moduleTag.className = 'cc-na-tag cc-na-tag-module';
      moduleTag.textContent = ann.module;
      meta.appendChild(moduleTag);
    }
    // PRD fields: priority tag with color
    var PRI_COLORS = { high: '#ff4d4f', medium: '#faad14', low: '#52c41a' };
    var PRI_LABELS = { high: '\u9AD8', medium: '\u4E2D', low: '\u4F4E' };
    if (ann.priority && PRI_LABELS[ann.priority]) {
      var priTag = document.createElement('span');
      priTag.className = 'cc-na-tag cc-na-tag-priority';
      priTag.textContent = PRI_LABELS[ann.priority];
      priTag.style.background = PRI_COLORS[ann.priority] + '20';
      priTag.style.color = PRI_COLORS[ann.priority];
      meta.appendChild(priTag);
    }
    // Coordinates (respects showCoordinates setting)
    if (annSettings.showCoordinates !== false) {
      var coordTag = document.createElement('span');
      coordTag.className = 'cc-na-coord';
      coordTag.textContent = ann.x + ',' + ann.y;
      meta.appendChild(coordTag);
    }

    var statusTag = document.createElement('span');
    statusTag.className = 'cc-na-status';
    statusTag.textContent = STATUS_LABELS[ann.status] || ann.status;
    statusTag.style.color = ann.status === 'resolved' ? '#52c41a' :
      ann.status === 'in-progress' ? '#1677ff' : '#faad14';
    meta.appendChild(statusTag);

    content.appendChild(meta);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'cc-na-actions';

    var editBtn = document.createElement('button');
    editBtn.className = 'cc-na-act';
    editBtn.textContent = '\u270E';
    editBtn.title = '编辑';
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:edit-request', { id: ann.id });
    });
    actions.appendChild(editBtn);

    var locateBtn = document.createElement('button');
    locateBtn.className = 'cc-na-act';
    locateBtn.textContent = '\u2315';
    locateBtn.title = '定位';
    locateBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:select', { id: ann.id });
    });
    actions.appendChild(locateBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'cc-na-act cc-na-act-del';
    delBtn.textContent = '\u2715';
    delBtn.title = '删除';
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:delete-request', { id: ann.id });
    });
    actions.appendChild(delBtn);

    content.appendChild(actions);
    item.appendChild(content);

    // Click to locate
    item.addEventListener('click', function () {
      if (self._bus) self._bus.emit('annotation:select', { id: ann.id });
    });

    return item;
  };

  // ---- Display Mode ----

  NotesAnnotationsTab.prototype._applyDisplayMode = function () {
    var overlay = document.querySelector('.cc-annotation-overlay');
    if (!overlay) return;

    var annotations = this._state.get('annotations.list') || [];
    var renderer = window.__CC && window.__CC.annotationRenderer;

    switch (this._displayMode) {
      case 'full':
        overlay.style.opacity = '1';
        overlay.style.display = '';
        break;
      case 'compact':
        // Show only number circles, hide text/sticky/brush details
        overlay.style.opacity = '1';
        overlay.style.display = '';
        // Compact: reduce opacity on non-number annotations
        if (renderer) {
          annotations.forEach(function (ann) {
            var el = renderer._elements[ann.id];
            if (el) {
              el.style.opacity = ann.type === 'number' ? '1' : '0.3';
            }
          });
        }
        break;
      case 'hidden':
        overlay.style.display = 'none';
        break;
    }

    // Restore full opacity for non-compact modes
    if (this._displayMode !== 'compact' && renderer) {
      annotations.forEach(function (ann) {
        var el = renderer._elements[ann.id];
        if (el) el.style.opacity = '1';
      });
    }
  };

  // ---- Export ----

  NotesAnnotationsTab.prototype._showExportDialog = function () {
    var annotations = this._state.get('annotations.list') || [];
    var canvasEl = this._state.canvas;
    var exporter = window.CCAnnotationExporter;
    if (!exporter) return;

    var data = new exporter().buildStructuredData(annotations, canvasEl);
    var md = new exporter().toMarkdown(data);
    var json = new exporter().toJSON(data);
    var settings = this._state.get('settings') || {};
    var prd = new exporter().toPRD(data, settings);

    // Determine default tab from export.format setting
    var exportSettings = settings.export || {};
    var defaultTab = 'md';
    if (exportSettings.format === 'json') defaultTab = 'json';
    else if (exportSettings.format === 'prd' || exportSettings.format === 'markdown') defaultTab = exportSettings.format === 'prd' ? 'prd' : 'md';

    var html = '<div class="cc-settings-tabs">' +
      '<button class="cc-settings-tab' + (defaultTab === 'md' ? ' active' : '') + '" data-export-tab="md">Markdown</button>' +
      '<button class="cc-settings-tab' + (defaultTab === 'json' ? ' active' : '') + '" data-export-tab="json">JSON</button>' +
      '<button class="cc-settings-tab' + (defaultTab === 'prd' ? ' active' : '') + '" data-export-tab="prd">PRD</button>' +
      '</div>' +
      '<div class="cc-settings-panel' + (defaultTab === 'md' ? ' active' : '') + '" data-export-panel="md">' +
      '<div class="cc-comp-form">' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-export-md" rows="12" readonly style="font-size:11px;font-family:Consolas,monospace;">' +
      md.replace(/</g, '&lt;') + '</textarea>' +
      '<button class="cc-na-export-copy" onclick="navigator.clipboard.writeText(document.getElementById(\'cc-export-md\').value);this.textContent=\'\u5DF2\u590D\u5236\';">\u590D\u5236 Markdown</button>' +
      '</div></div>' +
      '<div class="cc-settings-panel' + (defaultTab === 'json' ? ' active' : '') + '" data-export-panel="json">' +
      '<div class="cc-comp-form">' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-export-json" rows="10" readonly style="font-size:11px;font-family:Consolas,monospace;">' +
      json.replace(/</g, '&lt;') + '</textarea>' +
      '<button class="cc-na-export-copy" onclick="navigator.clipboard.writeText(document.getElementById(\'cc-export-json\').value);this.textContent=\'\u5DF2\u590D\u5236\';">\u590D\u5236 JSON</button>' +
      '</div></div>' +
      '<div class="cc-settings-panel' + (defaultTab === 'prd' ? ' active' : '') + '" data-export-panel="prd">' +
      '<div class="cc-comp-form">' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-export-prd" rows="14" readonly style="font-size:11px;font-family:Consolas,monospace;">' +
      prd.replace(/</g, '&lt;') + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:4px;">' +
      '<button class="cc-na-export-copy" onclick="navigator.clipboard.writeText(document.getElementById(\'cc-export-prd\').value);this.textContent=\'\u5DF2\u590D\u5236\';">\u590D\u5236 PRD</button>' +
      '<button class="cc-na-export-copy" id="cc-prd-download-btn" style="background:#52c41a;">\u4E0B\u8F7D .md</button>' +
      '</div></div></div>';

    var modal = window.CCModal;
    if (!modal) return;
    modal.show('\u5BFC\u51FA\u6807\u6CE8\u6570\u636E', html, [
      { text: '\u5173\u95ED', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } }
    ]);

    // Bind export tab switching
    setTimeout(function () {
      var dialog = document.querySelector('.cc-overlay:last-of-type .cc-dialog-body') ||
                   document.querySelector('.cc-overlay:last-of-type');
      if (!dialog) return;

      var tabs = dialog.querySelectorAll('[data-export-tab]');
      var panels = dialog.querySelectorAll('[data-export-panel]');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          panels.forEach(function (p) { p.classList.remove('active'); });
          tab.classList.add('active');
          var target = dialog.querySelector('[data-export-panel="' + tab.getAttribute('data-export-tab') + '"]');
          if (target) target.classList.add('active');
        });
      });

      // PRD download button
      var dlBtn = dialog.querySelector('#cc-prd-download-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', function () {
          var prdText = document.getElementById('cc-export-prd');
          if (!prdText) return;
          var projName = (settings.project && settings.project.name) || 'PRD';
          var blob = new Blob([prdText.value], { type: 'text/markdown' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = projName + '-\u9700\u6C42\u89C4\u683C\u8BF4\u660E.md';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
      }
    }, 50);
  };

  // ---- Filter ----

  NotesAnnotationsTab.prototype._applyFilter = function (list) {
    if (this._filter === 'all') return list;
    return list.filter(function (a) { return a.status === this._filter; }.bind(this));
  };

  /**
   * Format annotation number based on export.annotationNumberFormat setting.
   */
  NotesAnnotationsTab.prototype._formatNumber = function (num) {
    var fmt = (this._state.get('settings.export') || {}).annotationNumberFormat || 'auto';
    if (fmt === 'A,B,C') {
      return String.fromCharCode(64 + num); // 1→A, 2→B, ...
    }
    return num; // 'auto' and '1,2,3' both use digits
  };

  NotesAnnotationsTab.prototype.destroy = function () {
    if (!this._bus || !this._eventsBound) return;
    this._bus.off('annotation:created', this._onAnnotationCreated);
    this._bus.off('annotation:updated', this._onAnnotationUpdated);
    this._bus.off('annotation:removed', this._onAnnotationRemoved);
    this._bus.off('element:created', this._onElementCreated);
    this._eventsBound = false;
  };

  window.CCNotesAnnotationsTab = NotesAnnotationsTab;
})();
