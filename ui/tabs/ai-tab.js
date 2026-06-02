/**
 * CollabCanvas — AI Tab
 * Interactive AI assistant panel with chat + quick actions.
 * IIFE exporting to window.CCAITab
 */
;(function () {
  'use strict';

  function AITab(state, bus) {
    this._state = state;
    this._bus = bus;
    this._container = null;
    this._chatEl = null;
    this._inputEl = null;
    this._eventsBound = false;
    this._onAIChunk = this._onAIChunk.bind(this);
    this._onAIError = this._onAIError.bind(this);
  }

  AITab.prototype.render = function (container) {
    this._container = container;
    this._bindEvents();
    this._draw();
  };

  AITab.prototype._bindEvents = function () {
    if (this._eventsBound || !this._bus) return;
    this._eventsBound = true;
    this._bus.on('ai:chunk', this._onAIChunk);
    this._bus.on('ai:error', this._onAIError);
  };

  AITab.prototype._onAIChunk = function (data) {
    // Update last AI message during streaming (future use)
  };

  AITab.prototype._onAIError = function (data) {
    this._appendMessage('system', 'Error: ' + (data.message || '未知错误'));
  };

  // ── Draw ──────────────────────────────────────────────

  AITab.prototype._draw = function () {
    var self = this;
    var c = this._container;
    if (!c) return;
    c.innerHTML = '';
    c.className = 'cc-ai-tab';

    var aiClient = window.__CC && window.__CC.aiClient;
    var configured = aiClient && aiClient.isConfigured();

    // Header
    var header = document.createElement('div');
    header.className = 'cc-ai-header';

    var title = document.createElement('span');
    title.className = 'cc-ai-title';
    title.textContent = 'AI 助手';
    header.appendChild(title);

    if (configured) {
      var config = aiClient.getConfig();
      var modelInfo = document.createElement('span');
      modelInfo.className = 'cc-ai-model';
      modelInfo.textContent = (config.provider === 'claude' ? 'Claude' : 'OpenAI') + (config.model ? ' / ' + config.model : '');
      header.appendChild(modelInfo);

      var clearBtn = document.createElement('button');
      clearBtn.className = 'cc-ai-clear-btn';
      clearBtn.textContent = '清空';
      clearBtn.title = '清空对话历史';
      clearBtn.addEventListener('click', function () {
        aiClient.clearHistory();
        if (self._chatEl) self._chatEl.innerHTML = '';
        self._appendMessage('system', '对话已清空');
      });
      header.appendChild(clearBtn);
    }

    c.appendChild(header);

    // Quick actions
    var actions = this._buildQuickActions(configured);
    c.appendChild(actions);

    // Chat area
    var chatArea = document.createElement('div');
    chatArea.className = 'cc-ai-chat';
    this._chatEl = chatArea;

    if (!configured) {
      chatArea.innerHTML = '<div class="cc-ai-unconfigured">' +
        '<div class="cc-ai-unconfigured-icon">AI</div>' +
        '<div class="cc-ai-unconfigured-text">AI 未配置</div>' +
        '<div class="cc-ai-unconfigured-hint">请在设置 > AI 配置中填写 API Key</div></div>';
    } else {
      this._appendMessage('system', 'AI 助手已就绪，输入消息或使用快速操作。');
    }

    c.appendChild(chatArea);

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'cc-ai-input-area';

    var textarea = document.createElement('textarea');
    textarea.className = 'cc-ai-input';
    textarea.placeholder = configured ? '输入消息... (Enter 发送, Shift+Enter 换行)' : '请先配置 AI';
    textarea.disabled = !configured;
    textarea.rows = 2;
    this._inputEl = textarea;
    inputArea.appendChild(textarea);

    var sendBtn = document.createElement('button');
    sendBtn.className = 'cc-ai-send-btn';
    sendBtn.textContent = '\u2192';
    sendBtn.disabled = !configured;
    inputArea.appendChild(sendBtn);

    c.appendChild(inputArea);

    // Bind input
    var self = this;
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        self._sendCurrentMessage();
      }
    });
    sendBtn.addEventListener('click', function () {
      self._sendCurrentMessage();
    });
  };

  // ── Quick Actions ─────────────────────────────────────

  AITab.prototype._buildQuickActions = function (configured) {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-ai-actions';

    var actions = [
      { label: '分析页面', action: 'analyze', prompt: '请分析当前页面的布局、设计风格和主要组件。列出发现的优点和改进建议。' },
      { label: '生成代码', action: 'generate', prompt: '根据当前选中的元素，生成改进后的 CSS 代码。如果没有选中元素，请分析页面整体样式。' },
      { label: '标注建议', action: 'suggest', prompt: '查看当前标注数据，建议需要补充的标注点和潜在的设计问题。' },
      { label: '优化 PRD', action: 'prd', prompt: '基于当前标注数据生成 PRD 改进建议：检查需求完整性、建议优先级调整、识别遗漏场景。' }
    ];

    actions.forEach(function (act) {
      var btn = document.createElement('button');
      btn.className = 'cc-ai-action-btn';
      btn.textContent = act.label;
      btn.disabled = !configured;
      btn.addEventListener('click', function () {
        if (!configured) return;
        var context = self._buildContext(act.action);
        var fullPrompt = context + '\n\n' + act.prompt;
        self._sendMessage(fullPrompt);
      });
      bar.appendChild(btn);
    });

    return bar;
  };

  AITab.prototype._buildContext = function (actionType) {
    var lines = ['## 当前上下文'];
    var state = this._state;

    // Project info
    var proj = state.get('settings.project') || {};
    if (proj.name) lines.push('项目: ' + proj.name);
    if (proj.pageUrl) lines.push('页面: ' + proj.pageUrl);

    // Selection
    var sel = state.selected;
    if (sel) {
      lines.push('选中元素: ' + (sel.getAttribute('data-type') || sel.tagName.toLowerCase()));
      if (sel.id) lines.push('  ID: ' + sel.id);
      if (sel.className) lines.push('  Class: ' + (typeof sel.className === 'string' ? sel.className : ''));
      var style = sel.getAttribute('style') || '';
      if (style) lines.push('  Style: ' + style.substring(0, 200));
    }

    // Annotations summary
    var anns = state.get('annotations.list') || [];
    if (anns.length > 0) {
      lines.push('\n标注数据 (' + anns.length + ' 条):');
      var count = Math.min(anns.length, 10);
      for (var i = 0; i < count; i++) {
        var a = anns[i];
        lines.push('  - ' + (a.text || '(无内容)') + ' [' + a.type + '] ' +
          (a.module ? '模块:' + a.module + ' ' : '') +
          '优先级:' + a.priority + ' 类型:' + a.requirementType);
      }
      if (anns.length > 10) lines.push('  ... 及其他 ' + (anns.length - 10) + ' 条');
    }

    // Changes summary
    if (actionType === 'generate') {
      var changes = state.changes || [];
      if (changes.length > 0) {
        lines.push('\n变更记录 (' + changes.length + ' 条):');
        for (var j = 0; j < Math.min(changes.length, 10); j++) {
          var ch = changes[j];
          lines.push('  - ' + (ch.selector || '?') + ': ' + (ch.prop || '?'));
        }
      }
    }

    return lines.join('\n');
  };

  // ── Messaging ─────────────────────────────────────────

  AITab.prototype._sendCurrentMessage = function () {
    if (!this._inputEl) return;
    var text = this._inputEl.value.trim();
    if (!text) return;
    this._inputEl.value = '';
    this._sendMessage(text);
  };

  AITab.prototype._sendMessage = function (text) {
    var aiClient = window.__CC && window.__CC.aiClient;
    if (!aiClient || !aiClient.isConfigured()) {
      this._appendMessage('system', 'AI 未配置');
      return;
    }

    this._appendMessage('user', text);
    this._appendMessage('assistant', '思考中...');

    var self = this;
    var systemPrompt = '你是 CollabCanvas 可视化编辑器的 AI 助手。帮助用户分析页面设计、生成代码、提供标注建议。' +
      '你可以执行以下命令（用JSON格式）：\n' +
      '- {"action":"select","selector":"#id"} — 选中元素\n' +
      '- {"action":"setStyle","selector":"#id","property":"color","value":"red"} — 修改样式\n' +
      '- {"action":"annotate","x":100,"y":200,"text":"标注文字"} — 添加标注\n\n' +
      '普通回复用自然语言，命令用 JSON。';

    aiClient.prompt(systemPrompt, text).then(function (result) {
      // Replace "thinking" message
      self._replaceLastMessage(result.content);
      // Try to execute commands
      self._executeCommands(result.content);
    }).catch(function (err) {
      self._replaceLastMessage('错误: ' + err.message);
    });
  };

  AITab.prototype._appendMessage = function (role, content) {
    if (!this._chatEl) return;
    var msg = document.createElement('div');
    msg.className = 'cc-ai-msg cc-ai-msg-' + role;

    var bubble = document.createElement('div');
    bubble.className = 'cc-ai-bubble';
    bubble.textContent = content;
    msg.appendChild(bubble);

    this._chatEl.appendChild(msg);
    this._chatEl.scrollTop = this._chatEl.scrollHeight;
  };

  AITab.prototype._replaceLastMessage = function (content) {
    if (!this._chatEl) return;
    var msgs = this._chatEl.querySelectorAll('.cc-ai-msg');
    if (msgs.length === 0) return;
    var last = msgs[msgs.length - 1];
    var bubble = last.querySelector('.cc-ai-bubble');
    if (bubble) bubble.textContent = content;
    this._chatEl.scrollTop = this._chatEl.scrollHeight;
  };

  AITab.prototype._executeCommands = function (content) {
    // Try to extract and execute JSON commands
    try {
      var jsonMatch = content.match(/\{[\s\S]*?"action"[\s\S]*?\}/g);
      if (!jsonMatch) return;
      for (var i = 0; i < jsonMatch.length; i++) {
        var cmd = JSON.parse(jsonMatch[i]);
        this._executeCommand(cmd);
      }
    } catch (e) {
      // Not a command, ignore
    }
  };

  AITab.prototype._executeCommand = function (cmd) {
    var state = this._state;
    var bus = this._bus;
    var dom = window.CCDomUtils;

    switch (cmd.action) {
      case 'select':
        if (cmd.selector) {
          var el = document.querySelector(cmd.selector);
          if (el && bus) bus.emit('selection:changed', { element: el });
        }
        break;

      case 'setStyle':
        if (cmd.selector && cmd.property && cmd.value) {
          var target = document.querySelector(cmd.selector);
          if (target) {
            target.style[cmd.property] = cmd.value;
            if (bus) bus.emit('history:recorded', {
              prop: 'css',
              selector: cmd.selector,
              oldVal: '',
              newVal: cmd.property + ': ' + cmd.value
            });
          }
        }
        break;

      case 'annotate':
        if (bus && (cmd.x !== undefined) && (cmd.y !== undefined)) {
          var annotator = window.__CC && window.__CC.annotator;
          if (annotator) {
            var ann = annotator.create({
              type: 'text',
              x: cmd.x,
              y: cmd.y,
              text: cmd.text || 'AI 标注',
              color: '#722ed1'
            });
            var renderer = window.__CC && window.__CC.annotationRenderer;
            if (renderer && ann) renderer.render(ann);
          }
        }
        break;
    }
  };

  AITab.prototype.destroy = function () {
    if (!this._bus || !this._eventsBound) return;
    this._bus.off('ai:chunk', this._onAIChunk);
    this._bus.off('ai:error', this._onAIError);
    this._eventsBound = false;
    this._container = null;
  };

  window.CCAITab = AITab;
})();
