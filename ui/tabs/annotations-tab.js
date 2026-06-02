/**
 * CollabCanvas — Annotations Tab
 * 标注工具网格 + 标注列表 + 筛选管理
 */
(function() {
  'use strict';

  var STATUS_COLORS = {
    'pending': '#faad14',
    'in-progress': '#1677ff',
    'resolved': '#52c41a'
  };

  var STATUS_LABELS = {
    'pending': '待处理',
    'in-progress': '进行中',
    'resolved': '已解决'
  };

  var ANN_TOOLS = [
    { name: 'arrow',   label: '箭头',  icon: '\u2192', color: '#ff4d4f', desc: '画带箭头的指示线' },
    { name: 'rect',    label: '矩形',  icon: '\u25A1', color: '#1677ff', desc: '框选区域标注' },
    { name: 'text',    label: '文字',  icon: 'T',      color: '#1f1f1f', desc: '添加文字批注' },
    { name: 'measure', label: '测量',  icon: '\u2194', color: '#faad14', desc: '测量两点间距离' },
    { name: 'sticky',  label: '便签',  icon: '\u25A8', color: '#d48806', desc: '添加便签备注' },
    { name: 'number',  label: '编号',  icon: '#',      color: '#1677ff', desc: '放置编号标记' },
    { name: 'brush',   label: '画笔',  icon: '\u270E', color: '#ff4d4f', desc: '自由绘制' },
    { name: 'mosaic',  label: '马赛克', icon: '\u2592', color: '#8c8c8c', desc: '遮罩敏感区域' }
  ];

  function AnnotationsTab(state, eventBus) {
    this._state = state;
    this._bus = eventBus;
    this._container = null;
    this._filter = 'all';
    this._activeTool = null;
    this._eventsBound = false;
    this._selectedIds = [];
    this._onAnnotationCreated = this._onAnnotationCreated.bind(this);
    this._onAnnotationUpdated = this._onAnnotationUpdated.bind(this);
    this._onAnnotationRemoved = this._onAnnotationRemoved.bind(this);
  }

  AnnotationsTab.prototype.render = function(container) {
    this._container = container;
    this._bindEvents();
    this._draw();
  };

  AnnotationsTab.prototype._bindEvents = function() {
    if (this._eventsBound || !this._bus) return;
    this._eventsBound = true;
    this._bus.on('annotation:created', this._onAnnotationCreated);
    this._bus.on('annotation:updated', this._onAnnotationUpdated);
    this._bus.on('annotation:removed', this._onAnnotationRemoved);
  };

  AnnotationsTab.prototype._onAnnotationCreated = function() { this._drawList(); };
  AnnotationsTab.prototype._onAnnotationUpdated = function() { this._drawList(); };
  AnnotationsTab.prototype._onAnnotationRemoved = function() { this._drawList(); };

  // ── Full draw (first render) ──────────────────────────────

  AnnotationsTab.prototype._draw = function() {
    if (!this._container) return;
    var c = this._container;
    c.innerHTML = '';
    c.className = 'cc-ann-tab';

    // 1. Tool grid section
    c.appendChild(this._buildToolGrid());

    // 2. Filter bar
    c.appendChild(this._buildFilterBar());

    // 3. Annotation list
    var listWrap = document.createElement('div');
    listWrap.className = 'cc-ann-list';
    listWrap.id = 'cc-ann-list';
    c.appendChild(listWrap);
    this._drawListInto(listWrap);
  };

  // ── Tool grid (like components tab) ─────────────────────

  AnnotationsTab.prototype._buildToolGrid = function() {
    var self = this;
    var section = document.createElement('div');
    section.className = 'cc-ann-tool-section';

    // Section header
    var header = document.createElement('div');
    header.className = 'cc-ann-tool-header';
    header.innerHTML = '<span>\u6807\u6CE8\u5DE5\u5177</span>';
    section.appendChild(header);

    // Grid
    var grid = document.createElement('div');
    grid.className = 'cc-ann-tool-grid';
    grid.id = 'cc-ann-tool-grid';

    for (var i = 0; i < ANN_TOOLS.length; i++) {
      var tool = ANN_TOOLS[i];
      var card = document.createElement('div');
      card.className = 'cc-ann-tool-card' + (this._activeTool === tool.name ? ' active' : '');
      card.setAttribute('data-tool', tool.name);
      card.setAttribute('title', tool.desc);
      card.innerHTML =
        '<span class="cc-ann-tool-icon" style="color:' + tool.color + ';">' + tool.icon + '</span>' +
        '<span class="cc-ann-tool-label">' + tool.label + '</span>';
      card.addEventListener('click', (function(t) {
        return function() {
          self._selectTool(t.name);
        };
      })(tool));
      grid.appendChild(card);
    }

    section.appendChild(grid);

    // Quick actions row
    var actions = document.createElement('div');
    actions.className = 'cc-ann-tool-actions';
    actions.innerHTML =
      '<button class="cc-ann-btn-new" data-action="new">\u5FEB\u901F\u6807\u6CE8</button>' +
      '<button class="cc-ann-btn-clear" data-action="clear-all">\u6E05\u7A7A</button>';

    var newBtn = actions.querySelector('[data-action="new"]');
    newBtn.addEventListener('click', function() {
      if (self._bus) self._bus.emit('annotation:new-request', {});
    });
    var clearBtn = actions.querySelector('[data-action="clear-all"]');
    clearBtn.addEventListener('click', function() {
      if (self._bus) self._bus.emit('annotation:clear-all', {});
    });
    section.appendChild(actions);

    return section;
  };

  AnnotationsTab.prototype._selectTool = function(toolName) {
    this._activeTool = toolName;
    // Update grid highlight
    var grid = this._container.querySelector('#cc-ann-tool-grid');
    if (grid) {
      var cards = grid.querySelectorAll('.cc-ann-tool-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('active', cards[i].getAttribute('data-tool') === toolName);
      }
    }
    // Emit to main.js to activate tool and enter annotate mode
    if (this._bus) {
      this._bus.emit('annotation:activate-tool', { tool: toolName });
    }
  };

  // ── Filter bar ────────────────────────────────────────────

  AnnotationsTab.prototype._buildFilterBar = function() {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-ann-filters';

    var filters = [
      { key: 'all', label: '\u5168\u90E8' },
      { key: 'pending', label: '\u5F85\u5904\u7406' },
      { key: 'in-progress', label: '\u8FDB\u884C\u4E2D' },
      { key: 'resolved', label: '\u5DF2\u89E3\u51B3' }
    ];

    for (var i = 0; i < filters.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'cc-ann-filter-btn' + (this._filter === filters[i].key ? ' active' : '');
      btn.textContent = filters[i].label;
      btn.setAttribute('data-filter', filters[i].key);
      btn.addEventListener('click', (function(k) {
        return function() {
          self._filter = k;
          // Update filter button states
          var btns = bar.querySelectorAll('.cc-ann-filter-btn');
          for (var j = 0; j < btns.length; j++) {
            btns[j].classList.toggle('active', btns[j].getAttribute('data-filter') === k);
          }
          self._drawList();
        };
      })(filters[i].key));
      bar.appendChild(btn);
    }

    return bar;
  };

  // ── Annotation list ───────────────────────────────────────

  AnnotationsTab.prototype._drawList = function() {
    var listWrap = this._container ? this._container.querySelector('#cc-ann-list') : null;
    if (!listWrap) return;
    this._drawListInto(listWrap);
  };

  AnnotationsTab.prototype._drawListInto = function(listWrap) {
    var self = this;
    listWrap.innerHTML = '';

    var list = this._state.get('annotations.list') || [];
    var filtered = this._applyFilter(list);

    if (filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'cc-ann-empty';
      if (list.length === 0) {
        empty.innerHTML =
          '<div class="cc-ann-empty-icon">\u270E</div>' +
          '<div class="cc-ann-empty-text">\u6682\u65E0\u6807\u6CE8</div>' +
          '<div class="cc-ann-empty-hint">\u70B9\u51FB\u4E0A\u65B9\u5DE5\u5177\u5728\u753B\u5E03\u4E0A\u7ED8\u5236</div>';
      } else {
        empty.innerHTML = '<div class="cc-ann-empty-text">\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u4E0B\u65E0\u6807\u6CE8</div>';
      }
      listWrap.appendChild(empty);
      return;
    }

    // Show count badge
    var countDiv = document.createElement('div');
    countDiv.className = 'cc-ann-count';
    countDiv.textContent = filtered.length + ' \u6761\u6807\u6CE8';
    listWrap.appendChild(countDiv);

    for (var j = 0; j < filtered.length; j++) {
      listWrap.appendChild(this._buildItem(filtered[j]));
    }
  };

  AnnotationsTab.prototype._buildItem = function(ann) {
    var self = this;
    var statusColor = STATUS_COLORS[ann.status] || '#bfbfbf';
    var statusLabel = STATUS_LABELS[ann.status] || ann.status;

    var TYPE_LABELS = {
      'arrow': '\u7BAD\u5934', 'rect': '\u77E9\u5F62', 'text': '\u6587\u5B57',
      'measure': '\u6D4B\u91CF', 'sticky': '\u4FBF\u7B7E', 'number': '\u7F16\u53F7',
      'brush': '\u753B\u7B14', 'mosaic': '\u9A6C\u8D5B\u514B'
    };
    var TYPE_ICONS = {
      'arrow': '\u2192', 'rect': '\u25A1', 'text': 'T',
      'measure': '\u2194', 'sticky': '\u25A8', 'number': '#',
      'brush': '\u270E', 'mosaic': '\u2592'
    };

    var typeLabel = TYPE_LABELS[ann.type] || ann.type;
    var typeIcon = TYPE_ICONS[ann.type] || '?';
    var timeStr = this._formatTime(ann.timestamp);
    var displayText = ann.text || typeLabel;

    var item = document.createElement('div');
    item.className = 'cc-ann-item';
    item.setAttribute('data-ann-id', ann.id);

    // Type icon badge
    var icon = document.createElement('span');
    icon.className = 'cc-ann-item-icon';
    icon.textContent = typeIcon;
    icon.style.color = statusColor;
    item.appendChild(icon);

    // Content
    var content = document.createElement('div');
    content.className = 'cc-ann-content';

    var textEl = document.createElement('div');
    textEl.className = 'cc-ann-text';
    textEl.textContent = displayText;
    content.appendChild(textEl);

    var meta = document.createElement('div');
    meta.className = 'cc-ann-meta';
    meta.innerHTML =
      '<span style="color:' + statusColor + ';">' + statusLabel + '</span>' +
      '<span class="cc-ann-sep">|</span>' +
      '<span>' + typeLabel + '</span>' +
      '<span class="cc-ann-sep">|</span>' +
      '<span>' + timeStr + '</span>';
    content.appendChild(meta);

    item.appendChild(content);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'cc-ann-actions';

    var locateBtn = document.createElement('button');
    locateBtn.className = 'cc-ann-action-btn';
    locateBtn.textContent = '\u2315';
    locateBtn.title = '\u5B9A\u4F4D';
    locateBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:select', { id: ann.id });
    });
    actions.appendChild(locateBtn);

    var statusBtn = document.createElement('button');
    statusBtn.className = 'cc-ann-action-btn';
    statusBtn.textContent = '\u21BB';
    statusBtn.title = '\u5207\u6362\u72B6\u6001';
    statusBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:cycle-status', { id: ann.id });
    });
    actions.appendChild(statusBtn);

    var editBtn = document.createElement('button');
    editBtn.className = 'cc-ann-action-btn';
    editBtn.textContent = '\u270E';
    editBtn.title = '\u7F16\u8F91';
    editBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      self._openAnnotationEditor(ann);
    });
    actions.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'cc-ann-action-btn cc-ann-del-btn';
    delBtn.textContent = '\u2715';
    delBtn.title = '\u5220\u9664';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (self._bus) self._bus.emit('annotation:delete-request', { id: ann.id });
    });
    actions.appendChild(delBtn);

    item.appendChild(actions);

    // Click item to locate (Ctrl+Click for multi-select)
    item.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        self._toggleSelect(ann.id, e);
      } else {
        if (self._bus) self._bus.emit('annotation:select', { id: ann.id });
      }
    });

    return item;
  };

  AnnotationsTab.prototype._applyFilter = function(list) {
    if (this._filter === 'all') return list;
    return list.filter(function(a) { return a.status === this._filter; }.bind(this));
  };

  AnnotationsTab.prototype._formatTime = function(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var M = (d.getMonth() + 1).toString();
    var D = d.getDate().toString();
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return M + '/' + D + ' ' + h + ':' + m;
  };

  AnnotationsTab.prototype._openAnnotationEditor = function(ann) {
    var self = this;
    var TYPE_LABELS = {
      'arrow': '\u7BAD\u5934', 'rect': '\u77E9\u5F62', 'text': '\u6587\u5B57',
      'measure': '\u6D4B\u91CF', 'sticky': '\u4FBF\u7B7E', 'number': '\u7F16\u53F7',
      'brush': '\u753B\u7B14', 'mosaic': '\u9A6C\u8D5B\u514B'
    };
    var typeLabel = TYPE_LABELS[ann.type] || ann.type;

    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>\u7C7B\u578B</label>' +
      '<span style="font-size:12px;color:#1f1f1f;">' + typeLabel + '</span></div>' +
      '<div class="cc-comp-row"><label>\u5185\u5BB9</label>' +
      '<textarea class="cc-comp-input cc-comp-textarea" data-field="text" rows="3">' + (ann.text || '') + '</textarea></div>' +
      '<div class="cc-comp-row"><label>\u72B6\u6001</label>' +
      '<select class="cc-comp-input" data-field="status">' +
      '<option value="pending"' + (ann.status === 'pending' ? ' selected' : '') + '>\u5F85\u5904\u7406</option>' +
      '<option value="in-progress"' + (ann.status === 'in-progress' ? ' selected' : '') + '>\u8FDB\u884C\u4E2D</option>' +
      '<option value="resolved"' + (ann.status === 'resolved' ? ' selected' : '') + '>\u5DF2\u89E3\u51B3</option>' +
      '</select></div>' +
      '<div class="cc-comp-row"><label>\u989C\u8272</label>' +
      '<div class="cc-comp-color-row">' +
      '<input class="cc-comp-color" data-field="color" value="' + (ann.color || '#1677ff') + '" type="color">' +
      '<input class="cc-comp-input cc-comp-color-text" data-field="color-text" value="' + (ann.color || '#1677ff') + '" type="text">' +
      '</div></div>' +
      '<div class="cc-comp-row"><label>\u8D1F\u8D23\u4EBA</label>' +
      '<input class="cc-comp-input" data-field="assignee" value="' + (ann.assignee || '') + '" placeholder="\u8F93\u5165\u8D1F\u8D23\u4EBA"></div>' +
      '<div class="cc-comp-row"><label>\u6240\u5C5E\u6A21\u5757</label>' +
      '<input class="cc-comp-input" data-field="module" value="' + (ann.module || '') + '" placeholder="\u5982: \u767B\u5F55\u6A21\u5757\u3001\u7528\u6237\u7BA1\u7406"></div>' +
      '<div class="cc-comp-row"><label>\u4F18\u5148\u7EA7</label>' +
      '<select class="cc-comp-input" data-field="priority">' +
      '<option value="high"' + (ann.priority === 'high' ? ' selected' : '') + '>\u9AD8</option>' +
      '<option value="medium"' + (ann.priority === 'medium' ? ' selected' : '') + '>\u4E2D</option>' +
      '<option value="low"' + (ann.priority === 'low' ? ' selected' : '') + '>\u4F4E</option>' +
      '</select></div>' +
      '<div class="cc-comp-row"><label>\u9700\u6C42\u7C7B\u578B</label>' +
      '<select class="cc-comp-input" data-field="requirementType">' +
      '<option value="functional"' + (ann.requirementType === 'functional' ? ' selected' : '') + '>\u529F\u80FD</option>' +
      '<option value="performance"' + (ann.requirementType === 'performance' ? ' selected' : '') + '>\u6027\u80FD</option>' +
      '<option value="security"' + (ann.requirementType === 'security' ? ' selected' : '') + '>\u5B89\u5168</option>' +
      '<option value="ux"' + (ann.requirementType === 'ux' ? ' selected' : '') + '>\u4F53\u9A8C</option>' +
      '</select></div>' +
      '<div class="cc-comp-row"><label>\u9A8C\u6536\u6807\u51C6</label>' +
      '<textarea class="cc-comp-input cc-comp-textarea" data-field="acceptanceCriteria" rows="2" placeholder="\u8F93\u5165\u9A8C\u6536\u6807\u51C6">' + (ann.acceptanceCriteria || '') + '</textarea></div>' +
      '<div class="cc-comp-row"><label>\u9700\u6C42ID</label>' +
      '<input class="cc-comp-input" data-field="requirementId" value="' + (ann.requirementId || '') + '" placeholder="\u5173\u8054\u5916\u90E8\u9700\u6C42ID\uFF0C\u5982 JIRA-123"></div>' +
      '</div>';

    var modal = window.CCModal;
    if (!modal) return;

    modal.show('\u7F16\u8F91\u6807\u6CE8', html, [
      { text: '\u53D6\u6D88', cls: '', fn: function(d) { if (d && d.parentElement) d.parentElement.remove(); } },
      { text: '\u786E\u5B9A', cls: 'primary', fn: function(d) {
        var textInp = d.querySelector('[data-field="text"]');
        var statusInp = d.querySelector('[data-field="status"]');
        var colorInp = d.querySelector('[data-field="color"]');
        var assigneeInp = d.querySelector('[data-field="assignee"]');
        var moduleInp = d.querySelector('[data-field="module"]');
        var priorityInp = d.querySelector('[data-field="priority"]');
        var reqTypeInp = d.querySelector('[data-field="requirementType"]');
        var criteriaInp = d.querySelector('[data-field="acceptanceCriteria"]');
        var reqIdInp = d.querySelector('[data-field="requirementId"]');

        var changes = {};
        if (textInp) changes.text = textInp.value;
        if (statusInp) changes.status = statusInp.value;
        if (colorInp) changes.color = colorInp.value;
        if (assigneeInp) changes.assignee = assigneeInp.value;
        if (moduleInp) changes.module = moduleInp.value;
        if (priorityInp) changes.priority = priorityInp.value;
        if (reqTypeInp) changes.requirementType = reqTypeInp.value;
        if (criteriaInp) changes.acceptanceCriteria = criteriaInp.value;
        if (reqIdInp) changes.requirementId = reqIdInp.value;

        if (self._bus) self._bus.emit('annotation:edit', { id: ann.id, changes: changes });
        if (d && d.parentElement) d.parentElement.remove();
      }}
    ]);

    // Sync color picker
    setTimeout(function() {
      var dialog = document.querySelector('.cc-overlay:last-of-type .cc-dialog-body');
      if (!dialog) dialog = document.querySelector('.cc-overlay:last-of-type');
      if (!dialog) return;
      var ci = dialog.querySelector('[data-field="color"]');
      var ti = dialog.querySelector('[data-field="color-text"]');
      if (ci && ti) {
        ci.addEventListener('input', function() { ti.value = ci.value; });
        ti.addEventListener('input', function() {
          if (/^#[0-9a-fA-F]{6}$/.test(ti.value)) ci.value = ti.value;
        });
      }

      // AI suggest button (if AI is configured)
      var aiClient = window.__CC && window.__CC.aiClient;
      if (aiClient && aiClient.isConfigured()) {
        var aiBtn = document.createElement('button');
        aiBtn.className = 'cc-btn';
        aiBtn.style.cssText = 'font-size:11px;padding:4px 12px;margin-top:8px;';
        aiBtn.textContent = 'AI 建议';
        aiBtn.title = '让 AI 建议模块、优先级等字段';
        aiBtn.addEventListener('click', function() {
          aiBtn.disabled = true;
          aiBtn.textContent = '分析中...';
          var promptText = '基于以下标注信息，建议合适的模块(module)、优先级(priority)、需求类型(requirementType)和验收标准(acceptanceCriteria)。\n\n' +
            '标注类型: ' + ann.type + '\n' +
            '标注内容: ' + (ann.text || '(空)') + '\n\n' +
            '请严格按以下JSON格式输出，不要输出其他内容：\n' +
            '{"module":"模块名","priority":"high/medium/low","requirementType":"functional/performance/security/ux","acceptanceCriteria":"验收标准"}';

          aiClient.prompt(null, promptText, { maxTokens: 256 }).then(function(result) {
            aiBtn.disabled = false;
            aiBtn.textContent = 'AI 建议';
            try {
              var jsonStr = result.content;
              var jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                var suggestions = JSON.parse(jsonMatch[0]);
                self._applyAISuggestion(ann.id, suggestions, dialog);
                if (self._bus) self._bus.emit('ai:suggest-result', { id: ann.id, suggestions: suggestions });
              }
            } catch(e) {
              if (window.__CC && window.__CC.toast) window.__CC.toast.show('AI 返回格式异常', 'info');
            }
          }).catch(function(err) {
            aiBtn.disabled = false;
            aiBtn.textContent = 'AI 建议';
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('AI 错误: ' + err.message, 'info');
          });
        });
        var formEl = dialog.querySelector('.cc-comp-form');
        if (formEl) formEl.appendChild(aiBtn);
      }
    }, 50);
  };

  AnnotationsTab.prototype._applyAISuggestion = function(annId, suggestions, dialog) {
    if (suggestions.module && dialog) {
      var mInp = dialog.querySelector('[data-field="module"]');
      if (mInp) mInp.value = suggestions.module;
    }
    if (suggestions.priority && dialog) {
      var pInp = dialog.querySelector('[data-field="priority"]');
      if (pInp) pInp.value = suggestions.priority;
    }
    if (suggestions.requirementType && dialog) {
      var rInp = dialog.querySelector('[data-field="requirementType"]');
      if (rInp) rInp.value = suggestions.requirementType;
    }
    if (suggestions.acceptanceCriteria && dialog) {
      var aInp = dialog.querySelector('[data-field="acceptanceCriteria"]');
      if (aInp) aInp.value = suggestions.acceptanceCriteria;
    }
    if (window.__CC && window.__CC.toast) window.__CC.toast.show('AI 建议已填充，点击确认保存', 'success');
  };

  // ── Batch edit support ──────────────────────────────────

  AnnotationsTab.prototype._toggleSelect = function(annId, e) {
    var idx = this._selectedIds.indexOf(annId);
    if (idx >= 0) {
      this._selectedIds.splice(idx, 1);
    } else {
      this._selectedIds.push(annId);
    }
    // Update visual
    var items = this._container.querySelectorAll('.cc-ann-item');
    for (var i = 0; i < items.length; i++) {
      var id = items[i].getAttribute('data-ann-id');
      if (this._selectedIds.indexOf(id) >= 0) {
        items[i].classList.add('cc-ann-selected');
      } else {
        items[i].classList.remove('cc-ann-selected');
      }
    }
    this._updateBatchBar();
  };

  AnnotationsTab.prototype._updateBatchBar = function() {
    var existing = this._container.querySelector('.cc-ann-batch-bar');
    if (existing) existing.remove();

    if (this._selectedIds.length < 2) return;

    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-ann-batch-bar';

    var info = document.createElement('span');
    info.textContent = '已选择 ' + this._selectedIds.length + ' 个标注';
    bar.appendChild(info);

    var moduleInp = document.createElement('select');
    moduleInp.className = 'cc-comp-input';
    moduleInp.style.cssText = 'font-size:11px;padding:2px 6px;width:auto;';
    moduleInp.innerHTML = '<option value="">设置模块...</option>';
    // Collect unique modules
    var list = this._state.get('annotations.list') || [];
    var modules = {};
    for (var i = 0; i < list.length; i++) {
      if (list[i].module) modules[list[i].module] = true;
    }
    Object.keys(modules).forEach(function(m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      moduleInp.appendChild(o);
    });
    bar.appendChild(moduleInp);

    var priInp = document.createElement('select');
    priInp.className = 'cc-comp-input';
    priInp.style.cssText = 'font-size:11px;padding:2px 6px;width:auto;';
    priInp.innerHTML = '<option value="">设置优先级...</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>';
    bar.appendChild(priInp);

    var applyBtn = document.createElement('button');
    applyBtn.className = 'cc-btn';
    applyBtn.style.cssText = 'font-size:11px;padding:2px 12px;';
    applyBtn.textContent = '应用';
    applyBtn.addEventListener('click', function() {
      var changes = {};
      if (moduleInp.value) changes.module = moduleInp.value;
      if (priInp.value) changes.priority = priInp.value;
      if (Object.keys(changes).length === 0) return;
      if (self._bus) self._bus.emit('annotation:batch-update', { ids: self._selectedIds.slice(), changes: changes });
      self._selectedIds = [];
      self._draw();
    });
    bar.appendChild(applyBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cc-btn';
    cancelBtn.style.cssText = 'font-size:11px;padding:2px 12px;margin-left:4px;';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function() {
      self._selectedIds = [];
      self._draw();
    });
    bar.appendChild(cancelBtn);

    // Insert before list
    var listEl = this._container.querySelector('#cc-ann-list');
    if (listEl) {
      this._container.insertBefore(bar, listEl);
    }
  };

  AnnotationsTab.prototype.destroy = function() {
    if (this._bus) {
      this._bus.off('annotation:created', this._onAnnotationCreated);
      this._bus.off('annotation:updated', this._onAnnotationUpdated);
      this._bus.off('annotation:removed', this._onAnnotationRemoved);
    }
    this._container = null;
  };

  window.CCAnnotationsTab = AnnotationsTab;
})();
