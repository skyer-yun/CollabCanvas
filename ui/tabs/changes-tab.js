/**
 * CollabCanvas — Changes Tab
 * 变更历史列表，支持筛选、删除、清空
 */
;(function () {
  'use strict';

  var domUtils = window.CCDomUtils;

  // Change categories mapped from prop names
  var CATEGORY_MAP = {
    css: '样式',
    move: '布局',
    resize: '布局',
    text: '文本',
    create: '布局',
    delete: '布局',
    order: '布局',
    align: '布局',
    zindex: '布局'
  };

  var FILTER_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: '布局', label: '布局' },
    { value: '样式', label: '样式' },
    { value: '文本', label: '文本' }
  ];

  function ChangesTab(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this.activeFilter = 'all';

    var self = this;
    this._onHistoryRecorded = function () { self.refresh(); };
    bus.on('history:recorded', this._onHistoryRecorded);
  }

  ChangesTab.prototype.render = function (container) {
    this.container = container;
    container.innerHTML = '';
    container.className = 'cc-changes-tab';
    this._build();
  };

  ChangesTab.prototype.refresh = function () {
    if (!this.container) return;
    this._build();
  };

  // ── Internal ─────────────────────────────────────────────

  ChangesTab.prototype._build = function () {
    var container = this.container;
    container.innerHTML = '';

    var changes = this.state.changes || [];

    // Toolbar: filter + clear
    var toolbar = document.createElement('div');
    toolbar.className = 'cc-changes-toolbar';

    // Filter dropdown
    var filter = document.createElement('select');
    filter.className = 'cc-changes-filter';
    FILTER_OPTIONS.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === this.activeFilter) o.selected = true;
      filter.appendChild(o);
    }.bind(this));

    var self = this;
    filter.addEventListener('change', function () {
      self.activeFilter = this.value;
      self._renderList();
    });

    toolbar.appendChild(filter);

    // Clear All button
    var clearBtn = document.createElement('button');
    clearBtn.className = 'cc-changes-clear';
    clearBtn.textContent = '清空';
    clearBtn.disabled = changes.length === 0;
    clearBtn.addEventListener('click', function () {
      if (changes.length === 0) return;
      var count = changes.length;
      changes.length = 0;
      self.bus.emit('history:cleared', { count: count });
      self.refresh();
    });
    toolbar.appendChild(clearBtn);

    // Copy AI Prompt button
    var copyBtn = document.createElement('button');
    copyBtn.className = 'cc-changes-copy';
    copyBtn.textContent = '复制提示词';
    copyBtn.disabled = changes.length === 0;
    copyBtn.addEventListener('click', function () {
      if (changes.length === 0) return;
      var prompt = self._generatePrompt(changes);
      var onDone = function () {
        copyBtn.textContent = '已复制!';
        copyBtn.classList.add('cc-changes-copy-done');
        setTimeout(function () {
          copyBtn.textContent = '复制提示词';
          copyBtn.classList.remove('cc-changes-copy-done');
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(onDone).catch(function () {
          self._fallbackCopy(prompt);
          onDone();
        });
      } else {
        self._fallbackCopy(prompt);
        onDone();
      }
    });
    toolbar.appendChild(copyBtn);

    // AI Generate Code button
    var aiClient = window.__CC && window.__CC.aiClient;
    var aiBtn = document.createElement('button');
    aiBtn.className = 'cc-changes-ai';
    aiBtn.textContent = 'AI 生成代码';
    aiBtn.disabled = changes.length === 0 || !aiClient || !aiClient.isConfigured();
    if (!aiClient || !aiClient.isConfigured()) {
      aiBtn.title = '请先在设置中配置 AI';
    }
    aiBtn.addEventListener('click', function () {
      if (changes.length === 0 || !aiClient || !aiClient.isConfigured()) return;
      aiBtn.disabled = true;
      aiBtn.textContent = '生成中...';

      var prompt = self._generatePrompt(changes);
      var systemPrompt = '你是一个前端开发专家。根据用户的变更记录，生成对应的CSS/HTML修改代码。' +
        '请输出纯代码块，每条变更给出：选择器、属性、新值。不要输出多余解释。';
      aiClient.prompt(systemPrompt, prompt).then(function(result) {
        aiBtn.disabled = false;
        aiBtn.textContent = 'AI 生成代码';
        self._showAICodeResult(result.content, changes);
      }).catch(function(err) {
        aiBtn.disabled = false;
        aiBtn.textContent = 'AI 生成代码';
        if (window.__CC && window.__CC.toast) window.__CC.toast.show('AI 错误: ' + err.message, 'info');
      });
    });
    toolbar.appendChild(aiBtn);

    container.appendChild(toolbar);

    // List container
    var list = document.createElement('div');
    list.className = 'cc-history-list';
    list.id = 'cc-history-list';
    container.appendChild(list);

    this._renderList();
  };

  ChangesTab.prototype._renderList = function () {
    var listEl = this.container.querySelector('#cc-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    var changes = this.state.changes || [];
    var filter = this.activeFilter;
    var self = this;
    var bus = this.bus;

    // Filter changes
    var filtered = changes.filter(function (entry) {
      if (filter === 'all') return true;
      var cat = CATEGORY_MAP[entry.prop] || 'Style';
      return cat === filter;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="cc-tab-empty">暂无变更记录</div>';
      return;
    }

    // Render items (newest first)
    for (var i = filtered.length - 1; i >= 0; i--) {
      var entry = filtered[i];
      var origIndex = changes.indexOf(entry);
      var category = CATEGORY_MAP[entry.prop] || 'Style';
      var description = this._describeChange(entry);

      var item = document.createElement('div');
      item.className = 'cc-history-item';
      item.dataset.index = origIndex;

      // Number badge
      var badge = document.createElement('span');
      badge.className = 'cc-history-badge';
      badge.textContent = origIndex + 1;

      // Selector path
      var path = document.createElement('span');
      path.className = 'cc-history-path';
      path.textContent = entry.selector ? domUtils.esc(entry.selector) : '(unknown)';

      // Description
      var desc = document.createElement('span');
      desc.className = 'cc-history-desc';
      desc.textContent = description;

      // Category tag
      var cat = document.createElement('span');
      cat.className = 'cc-history-cat cc-history-cat-' + category.toLowerCase();
      cat.textContent = category;

      // Delete button
      var del = document.createElement('button');
      del.className = 'cc-history-del';
      del.title = '删除此条';
      del.textContent = '\u00D7';
      (function (idx) {
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          changes.splice(idx, 1);
          bus.emit('history:removed', { index: idx });
          self.refresh();
        });
      })(origIndex);

      item.appendChild(badge);
      item.appendChild(path);
      item.appendChild(desc);
      item.appendChild(cat);
      item.appendChild(del);

      listEl.appendChild(item);
    }
  };

  ChangesTab.prototype._describeChange = function (entry) {
    var prop = entry.prop || 'unknown';
    var newVal = entry.newVal;
    var oldVal = entry.oldVal;

    if (typeof newVal === 'string' && newVal.length > 30) {
      newVal = newVal.substring(0, 30) + '...';
    }

    switch (prop) {
      case 'css':
        return '样式: ' + String(newVal);
      case 'move':
        return '移动至 ' + this._fmtPos(newVal);
      case 'resize':
        return '缩放至 ' + this._fmtSize(newVal);
      case 'text':
        return '文本修改';
      case 'create':
        return '元素创建';
      case 'delete':
        return '元素删除';
      case 'order':
        return '顺序调整';
      case 'align':
        return '对齐调整';
      case 'zindex':
        return '层级变更为 ' + String(newVal);
      default:
        return prop + ': ' + String(newVal);
    }
  };

  ChangesTab.prototype._fmtPos = function (val) {
    if (val && typeof val === 'object') {
      return '(' + (val.left || 0) + ', ' + (val.top || 0) + ')';
    }
    return String(val);
  };

  ChangesTab.prototype._fmtSize = function (val) {
    if (val && typeof val === 'object') {
      return (val.width || '?') + ' x ' + (val.height || '?');
    }
    return String(val);
  };

  /**
   * Generate an AI-friendly prompt from the changes list.
   */
  ChangesTab.prototype._generatePrompt = function (changes) {
    if (!changes || changes.length === 0) return '';

    var lines = [];
    lines.push('# 网页变更记录');
    lines.push('');
    lines.push('以下是对网页进行的一系列编辑操作，请根据变更记录生成对应的代码修改：');
    lines.push('');

    for (var i = 0; i < changes.length; i++) {
      var entry = changes[i];
      var num = i + 1;
      var category = CATEGORY_MAP[entry.prop] || '其他';
      var selector = entry.selector || '(unknown)';
      var desc = this._promptDesc(entry);

      lines.push(num + '. **[' + category + ']** `' + selector + '` — ' + desc);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('请根据以上变更记录，逐条生成对应的 CSS / HTML 修改代码。');
    lines.push('每条变更给出：选择器、修改属性、修改前值、修改后值。');

    return lines.join('\n');
  };

  ChangesTab.prototype._promptDesc = function (entry) {
    var prop = entry.prop || 'unknown';
    var newVal = entry.newVal;
    var oldVal = entry.oldVal;

    switch (prop) {
      case 'css':
        var oldStr = this._safeStr(oldVal, 50);
        var newStr = this._safeStr(newVal, 50);
        return '样式修改：`' + oldStr + '` → `' + newStr + '`';
      case 'move':
        return '位置移动至 ' + this._fmtPos(newVal) + '（原位置 ' + this._fmtPos(oldVal) + '）';
      case 'resize':
        return '尺寸调整为 ' + this._fmtSize(newVal) + '（原尺寸 ' + this._fmtSize(oldVal) + '）';
      case 'text':
        var oldT = this._safeStr(oldVal, 40);
        var newT = this._safeStr(newVal, 40);
        return '文本内容：`' + oldT + '` → `' + newT + '`';
      case 'create':
        return '创建新元素';
      case 'delete':
        return '删除元素';
      case 'order':
        return '调整元素顺序';
      case 'align':
        return '对齐调整';
      case 'zindex':
        return '层级变更：' + this._safeStr(oldVal, 10) + ' → ' + this._safeStr(newVal, 10);
      default:
        return prop + ': `' + this._safeStr(oldVal, 30) + '` → `' + this._safeStr(newVal, 30) + '`';
    }
  };

  ChangesTab.prototype._safeStr = function (val, maxLen) {
    if (val === undefined || val === null) return '(无)';
    var s = String(val);
    if (maxLen && s.length > maxLen) s = s.substring(0, maxLen) + '...';
    return s;
  };

  ChangesTab.prototype._fallbackCopy = function (text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  ChangesTab.prototype._showAICodeResult = function (code, changes) {
    var modal = window.CCModal;
    if (!modal) return;

    var html = '<div class="cc-comp-form">' +
      '<textarea class="cc-comp-input cc-comp-textarea" id="cc-ai-code-result" rows="16" style="font-size:11px;font-family:Consolas,monospace;">' +
      code.replace(/</g, '&lt;') + '</textarea>' +
      '<div style="display:flex;gap:6px;margin-top:6px;">' +
      '<button class="cc-na-export-copy" id="cc-ai-code-copy">复制代码</button>' +
      '<button class="cc-btn" id="cc-ai-code-apply" style="background:#1677ff;color:#fff;">应用 CSS</button>' +
      '</div></div>';

    modal.show('AI 生成代码', html, [
      { text: '关闭', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } }
    ]);

    setTimeout(function () {
      var dialog = document.querySelector('.cc-overlay:last-of-type');
      if (!dialog) return;

      var copyBtn = dialog.querySelector('#cc-ai-code-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var ta = dialog.querySelector('#cc-ai-code-result');
          if (ta && navigator.clipboard) navigator.clipboard.writeText(ta.value);
          copyBtn.textContent = '已复制!';
        });
      }

      var applyBtn = dialog.querySelector('#cc-ai-code-apply');
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          var ta = dialog.querySelector('#cc-ai-code-result');
          if (!ta) return;
          var cssText = ta.value;
          // Try to extract CSS rules and apply them
          var selectedEl = window.__CC && window.__CC.state && window.__CC.state.selected;
          if (selectedEl && cssText) {
            var style = selectedEl.getAttribute('style') || '';
            selectedEl.setAttribute('style', style + ';' + cssText);
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('CSS 已应用到选中元素', 'success');
          } else {
            if (window.__CC && window.__CC.toast) window.__CC.toast.show('请先选中一个元素再应用', 'info');
          }
        });
      }
    }, 50);
  };

  ChangesTab.prototype.destroy = function () {
    if (!this.bus) return;
    this.bus.off('history:recorded', this._onHistoryRecorded);
  };

  window.CCChangesTab = ChangesTab;
})();
