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
    this._filterModule = 'all';
    this._filterPriority = 'all';
    this._filterReqType = 'all';
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

    // Title + current page indicator
    var titleWrap = document.createElement('div');
    titleWrap.className = 'cc-na-title-wrap';

    var title = document.createElement('span');
    title.className = 'cc-na-title';
    title.textContent = '\u5907\u6CE8\u4E0E\u6807\u6CE8';
    titleWrap.appendChild(title);

    // v1.5: Show current page name
    var currentPageId = this._state.get('annotations.currentPageId');
    if (currentPageId) {
      var pages = this._state.get('pages.list') || [];
      for (var pi = 0; pi < pages.length; pi++) {
        if (pages[pi].id === currentPageId && pages[pi].type !== 'folder') {
          var pageTag = document.createElement('span');
          pageTag.className = 'cc-na-page-tag';
          pageTag.textContent = pages[pi].name || currentPageId;
          titleWrap.appendChild(pageTag);
          break;
        }
      }
    }
    header.appendChild(titleWrap);

    // Action buttons row
    var actions = document.createElement('div');
    actions.className = 'cc-na-actions';

    // v1.5: Add note button
    var addBtn = document.createElement('button');
    addBtn.className = 'cc-na-add-btn';
    addBtn.textContent = '+ \u5907\u6CE8';
    addBtn.title = '\u5728\u5F53\u524D\u9875\u9762\u6DFB\u52A0\u5907\u6CE8';
    addBtn.addEventListener('click', function () {
      self._openAddNoteDialog();
    });
    actions.appendChild(addBtn);

    // v1.5: Import button
    var importBtn = document.createElement('button');
    importBtn.className = 'cc-na-import-btn';
    importBtn.textContent = '\u5BFC\u5165';
    importBtn.title = '\u5BFC\u5165\u6807\u6CE8\u6570\u636E';
    importBtn.addEventListener('click', function () {
      self._openImportDialog();
    });
    actions.appendChild(importBtn);

    // v1.5: Export with embedding button
    var exportBtn = document.createElement('button');
    exportBtn.className = 'cc-na-embed-btn';
    exportBtn.textContent = '\u5D4C\u5165';
    exportBtn.title = '\u5C06\u6807\u6CE8\u5D4C\u5165\u5230\u5BFC\u51FA\u7684 HTML \u4E2D';
    exportBtn.addEventListener('click', function () {
      self._exportWithEmbed();
    });
    actions.appendChild(exportBtn);

    header.appendChild(actions);

    // Display mode buttons
    var modeGroup = document.createElement('div');
    modeGroup.className = 'cc-na-mode-group';
    DISPLAY_MODES.forEach(function (mode) {
      var btn = document.createElement('button');
      btn.className = 'cc-na-mode-btn' + (self._displayMode === mode ? ' active' : '');
      btn.textContent = DISPLAY_LABELS[mode];
      btn.title = mode === 'full' ? '\u5B8C\u6574\u663E\u793A' : mode === 'compact' ? '\u7D27\u51D1\u663E\u793A' : '\u9690\u85CF\u6807\u6CE8';
      btn.addEventListener('click', function () {
        self._displayMode = mode;
        self._applyDisplayMode();
        self._drawHeader(container);
      });
      modeGroup.appendChild(btn);
    });
    header.appendChild(modeGroup);

    // Original export button (keep for standalone export)
    var origExportBtn = document.createElement('button');
    origExportBtn.className = 'cc-na-export-btn';
    origExportBtn.textContent = '\u5BFC\u51FA';
    origExportBtn.title = '\u5BFC\u51FA\u6807\u6CE8\u6570\u636E (MD/JSON/PRD)';
    origExportBtn.addEventListener('click', function () { self._showExportDialog(); });
    header.appendChild(origExportBtn);

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

    // PRD dimension filters (module / priority / requirementType)
    var prdBar = document.createElement('div');
    prdBar.className = 'cc-na-filters cc-na-prd-filters';

    // Module filter (dynamic from annotations)
    var allAnns = this._state.get('annotations.list') || [];
    var modules = {};
    for (var mi = 0; mi < allAnns.length; mi++) {
      if (allAnns[mi].module) modules[allAnns[mi].module] = true;
    }
    var moduleSel = document.createElement('select');
    moduleSel.className = 'cc-na-filter-sel';
    moduleSel.innerHTML = '<option value="all">全部模块</option>';
    Object.keys(modules).forEach(function(m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      if (self._filterModule === m) o.selected = true;
      moduleSel.appendChild(o);
    });
    moduleSel.addEventListener('change', function() {
      self._filterModule = moduleSel.value;
      self._draw(container);
    });
    prdBar.appendChild(moduleSel);

    // Priority filter
    var priSel = document.createElement('select');
    priSel.className = 'cc-na-filter-sel';
    priSel.innerHTML = '<option value="all">全部优先级</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>';
    priSel.value = this._filterPriority;
    priSel.addEventListener('change', function() {
      self._filterPriority = priSel.value;
      self._draw(container);
    });
    prdBar.appendChild(priSel);

    // Requirement type filter
    var reqSel = document.createElement('select');
    reqSel.className = 'cc-na-filter-sel';
    reqSel.innerHTML = '<option value="all">全部类型</option><option value="functional">功能</option><option value="performance">性能</option><option value="security">安全</option><option value="ux">体验</option>';
    reqSel.value = this._filterReqType;
    reqSel.addEventListener('change', function() {
      self._filterReqType = reqSel.value;
      self._draw(container);
    });
    prdBar.appendChild(reqSel);

    container.appendChild(prdBar);
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
    // PRD fields: requirementType tag
    var REQ_LABELS = { functional: '功能', performance: '性能', security: '安全', ux: '体验' };
    if (ann.requirementType && REQ_LABELS[ann.requirementType]) {
      var reqTag = document.createElement('span');
      reqTag.className = 'cc-na-tag';
      reqTag.style.background = '#1677ff20';
      reqTag.style.color = '#1677ff';
      reqTag.textContent = REQ_LABELS[ann.requirementType];
      meta.appendChild(reqTag);
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
      '<button class="cc-na-export-copy" id="cc-prd-ai-enhance-btn" style="background:#722ed1;color:#fff;">AI \u4F18\u5316 PRD</button>' +
      '</div>' +
      '<div id="cc-prd-ai-result" style="display:none;margin-top:8px;">' +
      '<label style="font-size:11px;color:#666;">AI \u589E\u5F3A\u7248\u672C:</label>' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-export-prd-enhanced" rows="14" readonly style="font-size:11px;font-family:Consolas,monospace;margin-top:4px;"></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:4px;">' +
      '<button class="cc-na-export-copy" id="cc-prd-use-enhanced">\u4F7F\u7528\u589E\u5F3A\u7248\u672C</button>' +
      '<button class="cc-na-export-copy" id="cc-prd-keep-original">\u4FDD\u7559\u539F\u59CB</button>' +
      '</div></div>' +
      '</div></div>';

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

      // AI enhance PRD button
      var aiEnhanceBtn = dialog.querySelector('#cc-prd-ai-enhance-btn');
      if (aiEnhanceBtn) {
        aiEnhanceBtn.addEventListener('click', function () {
          var aiClient = window.__CC && window.__CC.aiClient;
          if (!aiClient || !aiClient.isConfigured()) {
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('请先在设置中配置 AI', 'info');
            return;
          }
          aiEnhanceBtn.disabled = true;
          aiEnhanceBtn.textContent = 'AI 分析中...';
          var prdText = document.getElementById('cc-export-prd');
          if (!prdText) return;
          var origPRD = prdText.value;

          var systemPrompt = '你是一个资深产品经理。请优化此 PRD 文档：改进描述清晰度、检查一致性、识别缺失需求、建议优先级调整。输出完整的优化后 Markdown 文档。';
          aiClient.prompt(systemPrompt, origPRD, { maxTokens: 4096 }).then(function(result) {
            aiEnhanceBtn.disabled = false;
            aiEnhanceBtn.textContent = 'AI 优化 PRD';
            var resultDiv = document.getElementById('cc-prd-ai-result');
            var resultTa = document.getElementById('cc-export-prd-enhanced');
            if (resultDiv && resultTa) {
              resultTa.value = result.content;
              resultDiv.style.display = 'block';
            }
          }).catch(function(err) {
            aiEnhanceBtn.disabled = false;
            aiEnhanceBtn.textContent = 'AI 优化 PRD';
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('AI 错误: ' + err.message, 'info');
          });
        });
      }

      // Use enhanced / keep original buttons
      var useEnhBtn = dialog.querySelector('#cc-prd-use-enhanced');
      if (useEnhBtn) {
        useEnhBtn.addEventListener('click', function () {
          var origTa = document.getElementById('cc-export-prd');
          var enhTa = document.getElementById('cc-export-prd-enhanced');
          if (origTa && enhTa) origTa.value = enhTa.value;
          var resultDiv = document.getElementById('cc-prd-ai-result');
          if (resultDiv) resultDiv.style.display = 'none';
          if (window.__CC && window.__CC.toast) window.__CC.toast.show('已使用 AI 增强版本', 'success');
        });
      }
      var keepBtn = dialog.querySelector('#cc-prd-keep-original');
      if (keepBtn) {
        keepBtn.addEventListener('click', function () {
          var resultDiv = document.getElementById('cc-prd-ai-result');
          if (resultDiv) resultDiv.style.display = 'none';
        });
      }
    }, 50);
  };

  // ---- Filter ----

  NotesAnnotationsTab.prototype._applyFilter = function (list) {
    var filter = this._filter;
    var filterModule = this._filterModule;
    var filterPriority = this._filterPriority;
    var filterReqType = this._filterReqType;
    var currentPageId = this._state.get('annotations.currentPageId');

    return list.filter(function (a) {
      // v1.5: Filter by current page if set
      if (currentPageId && a.pageId && a.pageId !== currentPageId) return false;
      if (filter !== 'all' && a.status !== filter) return false;
      if (filterModule !== 'all' && a.module !== filterModule) return false;
      if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
      if (filterReqType !== 'all' && a.requirementType !== filterReqType) return false;
      return true;
    });
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

  // ---- v1.5: Add Note Directly ----

  NotesAnnotationsTab.prototype._openAddNoteDialog = function () {
    var self = this;
    var currentPageId = this._state.get('annotations.currentPageId');

    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>\u5185\u5BB9</label>' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-na-note-text" rows="4" placeholder="\u8F93\u5165\u5907\u6CE8\u5185\u5BB9"></textarea></div>' +
      '<div class="cc-comp-row"><label>\u6240\u5C5E\u6A21\u5757</label>' +
      '<input class="cc-comp-input" id="cc-na-note-module" placeholder="\u5982: \u767B\u5F55\u6A21\u5757"></div>' +
      '<div class="cc-comp-row"><label>\u4F18\u5148\u7EA7</label>' +
      '<select class="cc-comp-input" id="cc-na-note-priority">' +
      '<option value="high">\u9AD8</option>' +
      '<option value="medium" selected>\u4E2D</option>' +
      '<option value="low">\u4F4E</option></select></div>' +
      '<div class="cc-comp-row"><label>\u9700\u6C42\u7C7B\u578B</label>' +
      '<select class="cc-comp-input" id="cc-na-note-reqtype">' +
      '<option value="functional">\u529F\u80FD</option>' +
      '<option value="performance">\u6027\u80FD</option>' +
      '<option value="security">\u5B89\u5168</option>' +
      '<option value="ux">\u4F53\u9A8C</option></select></div>' +
      '</div>';

    var modal = window.CCModal;
    if (!modal) return;

    modal.show('\u6DFB\u52A0\u5907\u6CE8', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '\u6DFB\u52A0', cls: 'primary', fn: function (d) {
          var textEl = document.getElementById('cc-na-note-text');
          var moduleEl = document.getElementById('cc-na-note-module');
          var priorityEl = document.getElementById('cc-na-note-priority');
          var reqTypeEl = document.getElementById('cc-na-note-reqtype');

          var noteText = textEl ? textEl.value.trim() : '';
          if (!noteText) return;

          var annotator = window.__CC && window.__CC.annotator;
          if (!annotator) return;

          var ann = annotator.create({
            type: 'sticky',
            x: 50 + Math.random() * 100,
            y: 50 + Math.random() * 100,
            w: 200,
            h: 60,
            text: noteText,
            color: '#d48806',
            status: 'pending',
            module: moduleEl ? moduleEl.value : '',
            priority: priorityEl ? priorityEl.value : 'medium',
            requirementType: reqTypeEl ? reqTypeEl.value : 'functional',
            pageId: currentPageId || null
          });

          // Render on canvas
          var renderer = window.__CC && window.__CC.annotationRenderer;
          if (renderer && ann) renderer.render(ann);

          if (d && d.parentElement) d.parentElement.remove();
          self._drawList();
        }
      }
    ]);
  };

  // ---- v1.5: Import Notes ----

  NotesAnnotationsTab.prototype._openImportDialog = function () {
    var self = this;
    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>\u6570\u636E\u683C\u5F0F</label>' +
      '<select class="cc-comp-input" id="cc-na-import-format">' +
      '<option value="copilot">Copilot \u683C\u5F0F (\u6309\u9875\u9762)</option>' +
      '<option value="flat">\u6241\u5E73\u6570\u7EC4</option>' +
      '<option value="features">\u529F\u80FD\u5217\u8868</option></select></div>' +
      '<div class="cc-comp-row"><label>JSON \u6570\u636E</label>' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-na-import-data" rows="8" placeholder="\u7C98\u8D34 JSON \u6570\u636E..."></textarea></div>' +
      '</div>';

    var modal = window.CCModal;
    if (!modal) return;

    modal.show('\u5BFC\u5165\u5907\u6CE8', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '\u5BFC\u5165', cls: 'primary', fn: function (d) {
          var formatEl = document.getElementById('cc-na-import-format');
          var dataEl = document.getElementById('cc-na-import-data');
          if (!dataEl || !dataEl.value.trim()) return;

          var importer = window.__CC && window.__CC.annotationImporter;
          if (!importer) {
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('\u6807\u6CE8\u5BFC\u5165\u6A21\u5757\u672A\u52A0\u8F7D', 'error');
            return;
          }

          var fmt = formatEl ? formatEl.value : 'copilot';
          var result;
          try {
            if (fmt === 'copilot') {
              result = importer.importCopilotFormat(dataEl.value);
            } else if (fmt === 'flat') {
              result = importer.importFlatFormat(dataEl.value);
            } else {
              result = importer.importFeatureList(dataEl.value);
            }

            // Render imported annotations
            var renderer = window.__CC && window.__CC.annotationRenderer;
            if (renderer) {
              var allAnns = self._state.get('annotations.list') || [];
              for (var i = Math.max(0, allAnns.length - result.imported); i < allAnns.length; i++) {
                renderer.render(allAnns[i]);
              }
            }

            var msg = '\u5BFC\u5165\u5B8C\u6210: ' + result.imported + ' \u6761\u6210\u529F';
            if (result.skipped > 0) msg += ', ' + result.skipped + ' \u6761\u8DF3\u8FC7';
            if (window.__CC && window.__CC.toast) window.__CC.toast.show(msg, 'success');
            self._drawList();
          } catch (e) {
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('\u5BFC\u5165\u5931\u8D25: ' + e.message, 'error');
          }

          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);
  };

  // ---- v1.5: Export with Embedding into HTML ----

  NotesAnnotationsTab.prototype._exportWithEmbed = function () {
    var annotations = this._state.get('annotations.list') || [];
    var canvasEl = this._state.canvas;
    if (!canvasEl) return;

    // Filter to current page annotations only
    var currentPageId = this._state.get('annotations.currentPageId');
    var pageAnns = currentPageId
      ? annotations.filter(function (a) { return !a.pageId || a.pageId === currentPageId; })
      : annotations;

    if (pageAnns.length === 0) {
      if (window.__CC && window.__CC.toast) window.__CC.toast.show('\u5F53\u524D\u9875\u9762\u65E0\u6807\u6CE8\u53EF\u5D4C\u5165', 'info');
      return;
    }

    // Build annotation data block as HTML comment + script tag
    var exporter = window.CCAnnotationExporter;
    var copilotData = exporter ? new exporter().toCopilotFormat({ includeCoordinates: true }) : {};

    // Build structured notes for embedding
    var noteLines = [];
    for (var i = 0; i < pageAnns.length; i++) {
      var a = pageAnns[i];
      var num = i + 1;
      noteLines.push(num + '. ' + (a.text || '(空)'));
      if (a.module) noteLines.push('   \u6A21\u5757: ' + a.module);
      if (a.priority && a.priority !== 'medium') noteLines.push('   \u4F18\u5148\u7EA7: ' + a.priority);
      if (a.requirementType) noteLines.push('   \u7C7B\u578B: ' + a.requirementType);
      if (a.acceptanceCriteria) noteLines.push('   \u9A8C\u6536\u6807\u51C6: ' + a.acceptanceCriteria);
    }

    var notesBlock = '<!-- CollabCanvas Notes v1.5\n' +
      '\u9875\u9762: ' + (currentPageId || '_unassigned') + '\n' +
      '\u6807\u6CE8\u6570: ' + pageAnns.length + '\n' +
      '-->\n' +
      '<script type="application/json" id="cc-annotations-data">\n' +
      JSON.stringify(pageAnns, null, 2) + '\n' +
      '<\/script>';

    // Clone canvas, strip editor artifacts, embed annotations
    var exportEngine = window.__CC && window.__CC.exportEngine;
    if (!exportEngine) return;

    var clone = canvasEl.cloneNode(true);

    // Remove editor-only elements
    var EDITOR_SELECTORS = '.cc-resize-handle,.cc-rotate-handle,.cc-smart-guide,#cc-tooltip,.cc-annotation-overlay';
    EDITOR_SELECTORS.split(',').forEach(function (sel) {
      clone.querySelectorAll(sel).forEach(function (el) { el.remove(); });
    });

    var EDITOR_ARTIFACTS = ['cc-el-select', 'cc-el-hover', 'cc-el-multi', 'cc-inline-edit', 'cc-el'];
    clone.querySelectorAll('*').forEach(function (el) {
      EDITOR_ARTIFACTS.forEach(function (cls) { el.classList.remove(cls); });
      el.removeAttribute('contenteditable');
    });

    // Append annotation data before closing body
    var fullHtml = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>CollabCanvas Export</title>\n' +
      '<style>\n' +
      '  body { margin: 0; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }\n' +
      '  .cc-canvas { position: relative; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.1); }\n' +
      '</style>\n</head>\n<body>\n' +
      clone.outerHTML + '\n' +
      notesBlock + '\n' +
      '</body>\n</html>';

    // Download
    var blob = new Blob([fullHtml], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'collabcanvas-with-notes.html';
    a.click();
    URL.revokeObjectURL(url);

    if (window.__CC && window.__CC.toast) {
      window.__CC.toast.show('\u5DF2\u5BFC\u51FA HTML (\u5D4C\u5165 ' + pageAnns.length + ' \u6761\u5907\u6CE8)', 'success');
    }
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
