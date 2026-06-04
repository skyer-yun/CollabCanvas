/**
 * CollabCanvas — AI Tab v1.3
 * Multi-conversation AI assistant with markdown, attachments (page/component/screenshot), improved UI
 * IIFE exporting to window.CCAITab
 */
;(function () {
  'use strict';

  function AITab(state, bus) {
    this._state = state;
    this._bus = bus;
    this._container = null;
    this._messagesEl = null;
    this._inputEl = null;
    this._sidebarEl = null;
    this._eventsBound = false;
    this._sidebarCollapsed = false;
    this._attachments = [];  // [{type:'page'|'component'|'screenshot', data, label}]
  }

  // ── Public API ─────────────────────────────────────────

  AITab.prototype.render = function (container) {
    this._container = container;
    this._bindEvents();
    this._draw();
  };

  AITab.prototype.destroy = function () {
    if (!this._eventsBound) return;
    this._eventsBound = false;
    this._container = null;
  };

  // ── Event Binding ──────────────────────────────────────

  AITab.prototype._bindEvents = function () {
    if (this._eventsBound || !this._bus) return;
    this._eventsBound = true;
    var self = this;
    this._bus.on('state:changed', function (change) {
      if (change && change.path && change.path.indexOf('settings.ai') === 0 &&
          change.path !== 'settings.ai.conversations' &&
          change.path !== 'settings.ai.activeConvId' &&
          change.path !== 'settings.ai.tokenUsage' &&
          change.path !== 'settings.ai.conversationHistory') {
        self._draw();
      }
    });
  };

  // ── Draw ───────────────────────────────────────────────

  AITab.prototype._draw = function () {
    var c = this._container;
    if (!c) return;
    c.innerHTML = '';
    c.className = 'cc-ai-tab';

    var aiClient = window.__CC && window.__CC.aiClient;
    var configured = aiClient && aiClient.isConfigured();

    if (!configured) {
      c.appendChild(this._renderUnconfigured());
      return;
    }

    var sidebar = this._renderSidebar();
    c.appendChild(sidebar);
    this._sidebarEl = sidebar;

    var main = document.createElement('div');
    main.className = 'cc-ai-main';

    main.appendChild(this._renderHeader());
    main.appendChild(this._renderMessages());
    main.appendChild(this._renderAttachments());
    main.appendChild(this._renderComposer());

    c.appendChild(main);
  };

  // ── Unconfigured ───────────────────────────────────────

  AITab.prototype._renderUnconfigured = function () {
    var card = document.createElement('div');
    card.className = 'cc-ai-unconfigured';
    card.innerHTML =
      '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" style="margin-bottom:16px;opacity:.4;">' +
      '<rect x="4" y="8" width="48" height="40" rx="6" stroke="#bfbfbf" stroke-width="2" fill="none"/>' +
      '<circle cx="20" cy="26" r="4" stroke="#bfbfbf" stroke-width="1.5" fill="none"/>' +
      '<path d="M12 40l8-8 6 6 8-10 10 12" stroke="#bfbfbf" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '</svg>' +
      '<div class="cc-ai-unconfigured-title">AI 助手未配置</div>' +
      '<div class="cc-ai-unconfigured-hint">请先在 设置 → AI 配置 中填写 API Key</div>' +
      '<div class="cc-ai-unconfigured-hint">支持 Claude / OpenAI 兼容接口</div>';
    return card;
  };

  // ── Sidebar ────────────────────────────────────────────

  AITab.prototype._renderSidebar = function () {
    var self = this;
    var sidebar = document.createElement('div');
    sidebar.className = 'cc-ai-sidebar';
    if (this._sidebarCollapsed) sidebar.classList.add('cc-ai-sidebar-collapsed');

    var newBtn = document.createElement('button');
    newBtn.className = 'cc-ai-new-btn';
    newBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> 新对话';
    newBtn.onclick = function () { self._newConversation(); };
    sidebar.appendChild(newBtn);

    var history = document.createElement('div');
    history.className = 'cc-ai-history';
    var convs = this._state.get('settings.ai.conversations') || [];
    var activeId = this._state.get('settings.ai.activeConvId');

    if (convs.length === 0) {
      var emptyHint = document.createElement('div');
      emptyHint.className = 'cc-ai-history-empty';
      emptyHint.textContent = '暂无对话记录';
      history.appendChild(emptyHint);
    }

    for (var i = convs.length - 1; i >= 0; i--) {
      var conv = convs[i];
      var item = document.createElement('div');
      item.className = 'cc-ai-conv-item';
      if (conv.id === activeId) item.classList.add('cc-ai-conv-active');

      var dot = document.createElement('span');
      dot.className = 'cc-ai-conv-dot';
      item.appendChild(dot);

      var titleSpan = document.createElement('span');
      titleSpan.className = 'cc-ai-conv-title';
      titleSpan.textContent = conv.title || '新对话';
      item.appendChild(titleSpan);

      var delBtn = document.createElement('span');
      delBtn.className = 'cc-ai-conv-del';
      delBtn.innerHTML = '&times;';
      delBtn.title = '删除此对话';
      delBtn.setAttribute('data-conv-id', conv.id);
      item.appendChild(delBtn);

      item.onclick = (function (cid) {
        return function (e) {
          if (e.target.classList.contains('cc-ai-conv-del')) return;
          self._switchConversation(cid);
        };
      })(conv.id);

      delBtn.onclick = (function (cid) {
        return function (e) {
          e.stopPropagation();
          self._deleteConversation(cid);
        };
      })(conv.id);

      history.appendChild(item);
    }
    sidebar.appendChild(history);

    var footer = document.createElement('div');
    footer.className = 'cc-ai-sidebar-footer';
    var usage = this._state.get('settings.ai.tokenUsage') || { input: 0, output: 0, requests: 0 };
    footer.innerHTML = '<span>Token: ' + _fmtNum(usage.input + usage.output) + '</span><span>请求: ' + usage.requests + '</span>';
    sidebar.appendChild(footer);

    return sidebar;
  };

  // ── Header ─────────────────────────────────────────────

  AITab.prototype._renderHeader = function () {
    var self = this;
    var header = document.createElement('div');
    header.className = 'cc-ai-header';

    var aiClient = window.__CC && window.__CC.aiClient;
    var config = aiClient ? aiClient.getConfig() : {};
    var modelSpan = document.createElement('span');
    modelSpan.className = 'cc-ai-model';
    var providerLabel = config.provider === 'claude' ? 'Claude' : config.provider === 'openai' ? 'OpenAI' : 'AI';
    modelSpan.innerHTML = '<span class="cc-ai-model-dot"></span>' + providerLabel + (config.model ? ' · ' + config.model : '');
    header.appendChild(modelSpan);

    var btnGroup = document.createElement('div');
    btnGroup.className = 'cc-ai-header-btns';

    var clearBtn = document.createElement('button');
    clearBtn.className = 'cc-ai-header-btn';
    clearBtn.textContent = '清空';
    clearBtn.title = '清空当前对话';
    clearBtn.onclick = function () { self._clearConversation(); };
    btnGroup.appendChild(clearBtn);

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'cc-ai-header-btn';
    toggleBtn.textContent = this._sidebarCollapsed ? '展开' : '收起';
    toggleBtn.onclick = function () { self._sidebarCollapsed = !self._sidebarCollapsed; self._draw(); };
    btnGroup.appendChild(toggleBtn);

    header.appendChild(btnGroup);
    return header;
  };

  // ── Messages ───────────────────────────────────────────

  AITab.prototype._renderMessages = function () {
    var el = document.createElement('div');
    el.className = 'cc-ai-messages';
    this._messagesEl = el;

    var conv = this._getActiveConversation();
    if (conv && conv.messages && conv.messages.length > 0) {
      for (var i = 0; i < conv.messages.length; i++) {
        el.appendChild(this._renderMessage(conv.messages[i], i));
      }
    } else {
      var welcome = document.createElement('div');
      welcome.className = 'cc-ai-welcome';
      welcome.innerHTML =
        '<div class="cc-ai-welcome-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="var(--cc-border)" stroke-width="1.5"/><path d="M10 13h12M10 16h8M10 19h10" stroke="var(--cc-text-tertiary)" stroke-width="1.5" stroke-linecap="round"/></svg></div>' +
        '<div class="cc-ai-welcome-text">有什么可以帮你的？</div>' +
        '<div class="cc-ai-welcome-hint">输入问题，或用下方按钮引用页面内容</div>';
      el.appendChild(welcome);
    }

    return el;
  };

  AITab.prototype._renderMessage = function (msg, index) {
    var self = this;
    var div = document.createElement('div');
    div.className = 'cc-ai-msg cc-ai-msg-' + msg.role;

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'cc-ai-avatar';
    if (msg.role === 'user') {
      avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
    } else {
      avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/><path d="M3.5 5h7" stroke="currentColor" stroke-width="1"/></svg>';
    }
    div.appendChild(avatar);

    var body = document.createElement('div');
    body.className = 'cc-ai-msg-body';

    // Role label + time
    var msgHeader = document.createElement('div');
    msgHeader.className = 'cc-ai-msg-header';
    var roleLabel = document.createElement('span');
    roleLabel.className = 'cc-ai-role';
    roleLabel.textContent = msg.role === 'user' ? '你' : 'AI';
    msgHeader.appendChild(roleLabel);
    if (msg.timestamp) {
      var time = document.createElement('span');
      time.className = 'cc-ai-msg-time';
      var d = new Date(msg.timestamp);
      time.textContent = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      msgHeader.appendChild(time);
    }
    body.appendChild(msgHeader);

    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'cc-ai-bubble';
    if (msg.role === 'user') {
      bubble.textContent = msg.content;
    } else if (msg.role === 'assistant') {
      bubble.innerHTML = this._renderMarkdown(msg.content);
      var preBlocks = bubble.querySelectorAll('pre');
      for (var i = 0; i < preBlocks.length; i++) this._addCodeCopyBtn(preBlocks[i]);
    } else {
      bubble.className += ' cc-ai-bubble-system';
      bubble.textContent = msg.content;
    }
    body.appendChild(bubble);

    // Attachments display in message
    if (msg.attachments && msg.attachments.length > 0) {
      var attBar = document.createElement('div');
      attBar.className = 'cc-ai-msg-attachments';
      for (var j = 0; j < msg.attachments.length; j++) {
        var att = msg.attachments[j];
        var chip = document.createElement('span');
        chip.className = 'cc-ai-att-chip';
        chip.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg> ' + _escHtml(att.label);
        attBar.appendChild(chip);
      }
      body.appendChild(attBar);
    }

    // Actions (assistant only)
    if (msg.role === 'assistant') {
      var actions = document.createElement('div');
      actions.className = 'cc-ai-msg-actions';
      actions.appendChild(this._createMsgBtn('复制', function () { self._copyToClipboard(msg.content); }));
      actions.appendChild(this._createMsgBtn('重新生成', function () { self._regenerate(index); }));
      actions.appendChild(this._createMsgBtn('删除', function () { self._deleteMessage(index); }));
      body.appendChild(actions);
    }

    div.appendChild(body);
    return div;
  };

  AITab.prototype._createMsgBtn = function (text, onclick) {
    var btn = document.createElement('button');
    btn.className = 'cc-ai-msg-btn';
    btn.textContent = text;
    btn.onclick = onclick;
    return btn;
  };

  // ── Attachments Bar ────────────────────────────────────

  AITab.prototype._renderAttachments = function () {
    var bar = document.createElement('div');
    bar.className = 'cc-ai-attachments';
    if (this._attachments.length === 0) { bar.style.display = 'none'; return bar; }

    var self = this;
    for (var i = 0; i < this._attachments.length; i++) {
      var att = this._attachments[i];
      var chip = document.createElement('span');
      chip.className = 'cc-ai-att-chip cc-ai-att-active';
      chip.innerHTML = (att.type === 'page' ? '📄 ' : att.type === 'screenshot' ? '🖼 ' : '🧩 ') +
        _escHtml(att.label) + '<span class="cc-ai-att-remove" data-idx="' + i + '">&times;</span>';
      bar.appendChild(chip);
    }

    bar.onclick = function (e) {
      var rm = e.target.closest('.cc-ai-att-remove');
      if (rm) {
        var idx = parseInt(rm.getAttribute('data-idx'), 10);
        self._attachments.splice(idx, 1);
        self._draw();
      }
    };

    return bar;
  };

  // ── Composer ───────────────────────────────────────────

  AITab.prototype._renderComposer = function () {
    var self = this;
    var wrap = document.createElement('div');
    wrap.className = 'cc-ai-composer-wrap';

    // Attachment buttons row
    var toolBar = document.createElement('div');
    toolBar.className = 'cc-ai-toolbar';

    toolBar.appendChild(this._createAttBtn('引用页面', 'page', function () { self._attachPage(); }));
    toolBar.appendChild(this._createAttBtn('引用组件', 'component', function () { self._attachComponent(); }));
    toolBar.appendChild(this._createAttBtn('截图引用', 'screenshot', function () { self._attachScreenshot(); }));
    wrap.appendChild(toolBar);

    // Input row
    var inputRow = document.createElement('div');
    inputRow.className = 'cc-ai-input-row';

    var textarea = document.createElement('textarea');
    textarea.className = 'cc-ai-input';
    textarea.placeholder = '输入消息...';
    textarea.rows = 1;
    this._inputEl = textarea;
    inputRow.appendChild(textarea);

    var sendBtn = document.createElement('button');
    sendBtn.className = 'cc-ai-send-btn';
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 7l11-4.5-4 9-2.5-4.5L1 7z" fill="currentColor"/></svg>';
    sendBtn.title = '发送 (Enter)';
    sendBtn.onclick = function () { self._sendCurrentMessage(); };
    inputRow.appendChild(sendBtn);

    wrap.appendChild(inputRow);

    // Auto-resize + keyboard
    textarea.addEventListener('input', function () { self._autoResizeTextarea(textarea); });
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._sendCurrentMessage(); }
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); self._clearConversation(); }
    });

    return wrap;
  };

  AITab.prototype._createAttBtn = function (label, type, onclick) {
    var btn = document.createElement('button');
    btn.className = 'cc-ai-toolbar-btn';
    btn.textContent = label;
    btn.onclick = onclick;
    return btn;
  };

  // ── Attachment Actions ─────────────────────────────────

  AITab.prototype._attachPage = function () {
    var pages = (window.__CC && window.__CC.app && window.__CC.app.pages) || [];
    var currentPage = window.__CC && window.__CC.app && window.__CC.app.currentPage;
    // Attach current page
    if (currentPage) {
      var node = null;
      for (var i = 0; i < pages.length; i++) {
        if (pages[i].id === currentPage) { node = pages[i]; break; }
      }
      if (node && !this._hasAttachment('page', node.id)) {
        this._attachments.push({ type: 'page', id: node.id, label: '页面: ' + node.name, data: node.html || '' });
        this._draw();
      }
    } else {
      // Attach current canvas as "current page"
      var canvasEl = window.__CC && window.__CC.canvas;
      if (canvasEl && !this._hasAttachment('page', '__current__')) {
        this._attachments.push({ type: 'page', id: '__current__', label: '页面: 当前页面', data: canvasEl.innerHTML || '' });
        this._draw();
      }
    }
  };

  AITab.prototype._attachComponent = function () {
    var sel = this._state.selected;
    if (!sel) {
      this._appendMessage('system', '请先选中一个元素再引用组件');
      return;
    }
    var tag = sel.tagName.toLowerCase();
    var id = sel.id ? '#' + sel.id : '';
    var cls = sel.className ? '.' + String(sel.className).split(' ').slice(0, 2).join('.') : '';
    var label = '组件: ' + tag + id + cls;
    if (!this._hasAttachment('component', tag + id)) {
      this._attachments.push({
        type: 'component', id: tag + id, label: label,
        data: '<' + tag + (id ? ' id="' + id + '"' : '') + ' style="' + (sel.getAttribute('style') || '') + '">' + sel.textContent.substring(0, 200) + '</' + tag + '>'
      });
      this._draw();
    }
  };

  AITab.prototype._attachScreenshot = function () {
    var canvasEl = window.__CC && window.__CC.canvas;
    if (!canvasEl) return;
    try {
      // Use html2canvas if available
      if (typeof html2canvas === 'function') {
        var self = this;
        html2canvas(canvasEl, { scale: 0.5, useCORS: true }).then(function (canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          if (!self._hasAttachment('screenshot', '__screenshot__')) {
            self._attachments.push({ type: 'screenshot', id: '__screenshot__', label: '截图: 当前画布', data: dataUrl });
            self._draw();
          }
        });
      } else {
        // Fallback: capture via SVG foreignObject
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><foreignObject width="100%" height="100%">' +
          '<div xmlns="http://www.w3.org/1999/xhtml" style="width:400px;height:300px;overflow:hidden;transform:scale(0.3);transform-origin:top left;">' +
          canvasEl.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
          '</div></foreignObject></svg>';
        var dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        if (!this._hasAttachment('screenshot', '__screenshot__')) {
          this._attachments.push({ type: 'screenshot', id: '__screenshot__', label: '截图: 当前画布', data: dataUrl });
          this._draw();
        }
      }
    } catch (e) {
      this._appendMessage('system', '截图失败: ' + e.message);
    }
  };

  AITab.prototype._hasAttachment = function (type, id) {
    for (var i = 0; i < this._attachments.length; i++) {
      if (this._attachments[i].type === type && this._attachments[i].id === id) return true;
    }
    return false;
  };

  // ── Markdown Renderer ──────────────────────────────────

  AITab.prototype._renderMarkdown = function (text) {
    if (!text) return '';
    var html = this._escapeHtml(text);

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
      return '<pre class="cc-ai-code-block"><div class="cc-ai-code-lang">' + (lang || 'code') + '</div><code>' + code + '</code></pre>';
    });
    html = html.replace(/`([^`]+)`/g, '<code class="cc-ai-inline-code">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^## (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="cc-ai-blockquote">$1</blockquote>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="cc-ai-list">$&</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  AITab.prototype._escapeHtml = function (text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  AITab.prototype._addCodeCopyBtn = function (preEl) {
    var self = this;
    var btn = document.createElement('button');
    btn.className = 'cc-ai-code-copy';
    btn.textContent = '复制';
    btn.onclick = function () {
      var code = preEl.querySelector('code');
      self._copyToClipboard(code ? code.textContent : preEl.textContent);
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = '复制'; }, 1500);
    };
    preEl.appendChild(btn);
  };

  // ── Messaging ──────────────────────────────────────────

  AITab.prototype._sendCurrentMessage = function () {
    if (!this._inputEl) return;
    var text = this._inputEl.value.trim();
    if (!text) return;
    this._inputEl.value = '';
    this._autoResizeTextarea(this._inputEl);
    this._sendMessage(text);
  };

  AITab.prototype._sendMessage = function (text) {
    var aiClient = window.__CC && window.__CC.aiClient;
    if (!aiClient || !aiClient.isConfigured()) {
      this._appendMessage('system', 'AI 未配置，请在设置中填写 API Key');
      return;
    }

    var conv = this._getActiveConversation();
    if (!conv) conv = this._newConversation();

    // Snapshot attachments for this message
    var msgAttachments = this._attachments.slice();
    this._attachments = [];

    var userMsg = { role: 'user', content: text, attachments: msgAttachments, timestamp: Date.now() };
    conv.messages.push(userMsg);
    this._appendMessageToUI(userMsg, conv.messages.length - 1);

    this._showTyping();

    var context = this._buildContext(msgAttachments);
    var designPrompt = this._buildDesignPrompt();
    var systemPrompt = '你是 CollabCanvas 可视化编辑器的 AI 助手。帮助用户分析页面设计、生成代码、提供标注建议。\n' +
      '你可以执行命令（JSON格式）：\n' +
      '- {"action":"select","selector":"#id"} — 选中元素\n' +
      '- {"action":"setStyle","selector":"#id","property":"color","value":"red"} — 修改样式\n' +
      '- {"action":"annotate","x":100,"y":200,"text":"文字"} — 添加标注\n' +
      '- {"action":"insertHTML","html":"<div>...</div>","parent":"#container","position":"append"} — 插入 HTML 元素\n' +
      '- {"action":"replaceHTML","selector":"#id","html":"<div>...</div>"} — 替换元素 HTML\n' +
      '- {"action":"applyToken","selector":"#id","token":"--cc-primary"} — 应用设计令牌\n' +
      '- {"action":"batchStyle","selector":".my-class","styles":{"color":"var(--cc-primary)","font-size":"14px"}} — 批量修改样式\n' +
      '- {"action":"removeElement","selector":"#id"} — 删除元素\n' +
      designPrompt;

    // v1.5: Inject systemPromptExtra (PRD / project context from Product Copilot)
    var extra = this._state.get('settings.ai.systemPromptExtra');
    if (extra) systemPrompt += '\n\n' + extra;

    var chatMessages = [{ role: 'system', content: systemPrompt + '\n' + context }];
    for (var i = 0; i < conv.messages.length; i++) {
      if (conv.messages[i].role !== 'system') {
        chatMessages.push({ role: conv.messages[i].role, content: conv.messages[i].content });
      }
    }

    var self = this;
    aiClient.chat(chatMessages).then(function (result) {
      self._hideTyping();
      // DS-03: Sanitize AI output — replace hardcoded design values with CSS variables
      var content = self._sanitizeDesignOutput(result.content);
      var assistantMsg = { role: 'assistant', content: content, timestamp: Date.now() };
      conv.messages.push(assistantMsg);
      self._appendMessageToUI(assistantMsg, conv.messages.length - 1);
      self._executeCommands(result.content);

      if (result.usage) {
        var usage = self._state.get('settings.ai.tokenUsage') || { input: 0, output: 0, requests: 0 };
        usage.input += (result.usage.input_tokens || result.usage.prompt_tokens || 0);
        usage.output += (result.usage.output_tokens || result.usage.completion_tokens || 0);
        usage.requests++;
        self._state.set('settings.ai.tokenUsage', usage);
        self._updateSidebarFooter();
      }

      if (conv.messages.filter(function (m) { return m.role === 'user'; }).length === 1) {
        conv.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        self._state.set('settings.ai.conversations', self._state.get('settings.ai.conversations'));
        self._draw();
      }
    }).catch(function (err) {
      self._hideTyping();
      var errMsg = { role: 'system', content: '请求失败: ' + err.message, timestamp: Date.now() };
      conv.messages.push(errMsg);
      self._appendMessageToUI(errMsg, conv.messages.length - 1);
    });
  };

  AITab.prototype._buildContext = function (attachments) {
    var lines = ['\n## 当前上下文'];
    var state = this._state;
    var proj = state.get('settings.project') || {};
    if (proj.name) lines.push('项目: ' + proj.name);
    if (proj.pageUrl) lines.push('页面URL: ' + proj.pageUrl);

    var sel = state.selected;
    if (sel) {
      lines.push('当前选中: ' + sel.tagName.toLowerCase() + (sel.id ? '#' + sel.id : ''));
    }

    var anns = state.get('annotations.list') || [];
    if (anns.length > 0) lines.push('标注数量: ' + anns.length);

    // Attachments
    if (attachments && attachments.length > 0) {
      lines.push('\n## 用户引用的内容');
      for (var i = 0; i < attachments.length; i++) {
        var att = attachments[i];
        if (att.type === 'page') {
          lines.push('### 引用页面: ' + att.label);
          lines.push('页面HTML片段（前2000字符）:\n' + (att.data || '').substring(0, 2000));
        } else if (att.type === 'component') {
          lines.push('### 引用组件: ' + att.label);
          lines.push('组件HTML:\n' + att.data);
        } else if (att.type === 'screenshot') {
          lines.push('### 引用截图: ' + att.label);
          lines.push('[截图已附加，为 data URL 图片]');
        }
      }
    }

    return lines.join('\n');
  };

  // ── Typing Animation ───────────────────────────────────

  AITab.prototype._showTyping = function () {
    if (!this._messagesEl) return;
    var div = document.createElement('div');
    div.className = 'cc-ai-msg cc-ai-msg-assistant cc-ai-typing';
    div.innerHTML = '<div class="cc-ai-avatar"><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/><path d="M3.5 5h7" stroke="currentColor" stroke-width="1"/></svg></div>' +
      '<div class="cc-ai-msg-body"><div class="cc-ai-bubble"><div class="cc-ai-typing-dots"><span></span><span></span><span></span></div></div></div>';
    this._messagesEl.appendChild(div);
    this._scrollToBottom();
  };

  AITab.prototype._hideTyping = function () {
    if (!this._messagesEl) return;
    var typing = this._messagesEl.querySelector('.cc-ai-typing');
    if (typing) typing.remove();
  };

  // ── UI Helpers ─────────────────────────────────────────

  AITab.prototype._appendMessageToUI = function (msg, index) {
    if (!this._messagesEl) return;
    // Remove welcome message if present
    var welcome = this._messagesEl.querySelector('.cc-ai-welcome');
    if (welcome) welcome.remove();
    this._messagesEl.appendChild(this._renderMessage(msg, index));
    this._scrollToBottom();
  };

  AITab.prototype._appendMessage = function (role, content) {
    var conv = this._getActiveConversation();
    if (conv) {
      conv.messages.push({ role: role, content: content, timestamp: Date.now() });
    }
    if (this._messagesEl) {
      this._messagesEl.appendChild(this._renderMessage({ role: role, content: content, timestamp: Date.now() }, -1));
      this._scrollToBottom();
    }
  };

  AITab.prototype._scrollToBottom = function () {
    if (this._messagesEl) this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
  };

  AITab.prototype._autoResizeTextarea = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(Math.max(el.scrollHeight, 36), 160) + 'px';
  };

  AITab.prototype._copyToClipboard = function (text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
  };

  // ── Message Actions ────────────────────────────────────

  AITab.prototype._regenerate = function (index) {
    var conv = this._getActiveConversation();
    if (!conv) return;
    conv.messages.splice(index, 1);
    var userText = '';
    for (var i = index - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') { userText = conv.messages[i].content; break; }
    }
    this._draw();
    if (userText) this._sendMessage(userText);
  };

  AITab.prototype._deleteMessage = function (index) {
    var conv = this._getActiveConversation();
    if (!conv) return;
    conv.messages.splice(index, 1);
    this._draw();
  };

  // ── Conversation Management ────────────────────────────

  AITab.prototype._getActiveConversation = function () {
    var convs = this._state.get('settings.ai.conversations') || [];
    var activeId = this._state.get('settings.ai.activeConvId');
    if (!activeId && convs.length > 0) {
      activeId = convs[convs.length - 1].id;
      this._state.set('settings.ai.activeConvId', activeId);
    }
    for (var i = 0; i < convs.length; i++) {
      if (convs[i].id === activeId) return convs[i];
    }
    return null;
  };

  AITab.prototype._newConversation = function () {
    var convs = this._state.get('settings.ai.conversations') || [];
    var conv = { id: 'conv-' + Date.now(), title: '新对话', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    convs.push(conv);
    this._state.set('settings.ai.conversations', convs);
    this._state.set('settings.ai.activeConvId', conv.id);
    this._draw();
    return conv;
  };

  AITab.prototype._switchConversation = function (id) {
    this._state.set('settings.ai.activeConvId', id);
    this._attachments = [];
    this._draw();
  };

  AITab.prototype._clearConversation = function () {
    var conv = this._getActiveConversation();
    if (conv) { conv.messages = []; this._draw(); }
  };

  AITab.prototype._deleteConversation = function (id) {
    var convs = this._state.get('settings.ai.conversations') || [];
    convs = convs.filter(function (c) { return c.id !== id; });
    this._state.set('settings.ai.conversations', convs);
    var activeId = this._state.get('settings.ai.activeConvId');
    if (activeId === id) {
      this._state.set('settings.ai.activeConvId', convs.length > 0 ? convs[convs.length - 1].id : null);
    }
    this._draw();
  };

  // v1.5: Export conversation as Markdown
  AITab.prototype._exportConversation = function (conv) {
    if (!conv || !conv.messages) return;
    var lines = ['# ' + (conv.title || 'AI 对话'), ''];
    for (var i = 0; i < conv.messages.length; i++) {
      var msg = conv.messages[i];
      var role = msg.role === 'user' ? '用户' : (msg.role === 'assistant' ? 'AI' : '系统');
      var ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
      lines.push('## ' + role + (ts ? ' (' + ts + ')' : ''));
      lines.push(msg.content || '');
      lines.push('');
    }
    var md = lines.join('\n');
    var blob = new Blob([md], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'conversation-' + conv.id + '.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  AITab.prototype._updateSidebarFooter = function () {
    if (this._sidebarEl) {
      var footer = this._sidebarEl.querySelector('.cc-ai-sidebar-footer');
      if (footer) {
        var usage = this._state.get('settings.ai.tokenUsage') || { input: 0, output: 0, requests: 0 };
        footer.innerHTML = '<span>Token: ' + _fmtNum(usage.input + usage.output) + '</span><span>请求: ' + usage.requests + '</span>';
      }
    }
  };

  // ── Command Execution ──────────────────────────────────

  AITab.prototype._executeCommands = function (content) {
    try {
      var jsonMatch = content.match(/\{[\s\S]*?"action"[\s\S]*?\}/g);
      if (!jsonMatch) return;
      for (var i = 0; i < jsonMatch.length; i++) {
        var cmd = JSON.parse(jsonMatch[i]);
        this._executeCommand(cmd);
      }
    } catch (e) { /* ignore */ }
  };

  AITab.prototype._executeCommand = function (cmd) {
    var bus = this._bus;
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
            if (bus) bus.emit('history:recorded', { prop: 'css', selector: cmd.selector, oldVal: '', newVal: cmd.property + ': ' + cmd.value });
          }
        }
        break;
      case 'annotate':
        if (bus && cmd.x !== undefined && cmd.y !== undefined) {
          var annotator = window.__CC && window.__CC.annotator;
          if (annotator) {
            var ann = annotator.create({ type: 'text', x: cmd.x, y: cmd.y, text: cmd.text || 'AI 标注', color: '#722ed1' });
            var renderer = window.__CC && window.__CC.annotationRenderer;
            if (renderer && ann) renderer.render(ann);
          }
        }
        break;
      // v1.5: New AI commands
      case 'insertHTML':
        if (cmd.html) {
          var parent = cmd.parent ? document.querySelector(cmd.parent) : null;
          if (!parent) parent = this._state.get('canvas.canvas');
          if (parent) {
            var temp = document.createElement('div');
            temp.innerHTML = cmd.html;
            var pos = cmd.position || 'append';
            if (pos === 'prepend' && parent.firstChild) {
              parent.insertBefore(temp.firstChild, parent.firstChild);
            } else if (pos === 'before') {
              parent.parentNode.insertBefore(temp.firstChild, parent);
            } else if (pos === 'after') {
              if (parent.nextSibling) {
                parent.parentNode.insertBefore(temp.firstChild, parent.nextSibling);
              } else {
                parent.parentNode.appendChild(temp.firstChild);
              }
            } else {
              while (temp.firstChild) parent.appendChild(temp.firstChild);
            }
            if (bus) bus.emit('history:recorded', { prop: 'insertHTML', html: cmd.html });
          }
        }
        break;
      case 'replaceHTML':
        if (cmd.selector && cmd.html) {
          var replTarget = document.querySelector(cmd.selector);
          if (replTarget) {
            var oldHTML = replTarget.innerHTML;
            replTarget.innerHTML = cmd.html;
            if (bus) bus.emit('history:recorded', { prop: 'replaceHTML', selector: cmd.selector, oldVal: oldHTML, newVal: cmd.html });
          }
        }
        break;
      case 'applyToken':
        if (cmd.selector && cmd.token) {
          var tokenTarget = document.querySelector(cmd.selector);
          if (tokenTarget) {
            var rootStyle = getComputedStyle(document.documentElement);
            var tokenVal = rootStyle.getPropertyValue(cmd.token).trim();
            if (tokenVal) {
              // Apply token as CSS variable reference
              var prop = cmd.property || 'color';
              tokenTarget.style[prop] = 'var(' + cmd.token + ')';
              if (bus) bus.emit('history:recorded', { prop: 'applyToken', selector: cmd.selector, token: cmd.token });
            }
          }
        }
        break;
      case 'batchStyle':
        if (cmd.selector && cmd.styles) {
          var batchTargets = document.querySelectorAll(cmd.selector);
          for (var bi = 0; bi < batchTargets.length; bi++) {
            var styleKeys = Object.keys(cmd.styles);
            for (var si = 0; si < styleKeys.length; si++) {
              batchTargets[bi].style[styleKeys[si]] = cmd.styles[styleKeys[si]];
            }
          }
          if (bus) bus.emit('history:recorded', { prop: 'batchStyle', selector: cmd.selector, styles: cmd.styles });
        }
        break;
      case 'removeElement':
        if (cmd.selector) {
          var removeTarget = document.querySelector(cmd.selector);
          if (removeTarget && removeTarget.parentNode) {
            removeTarget.parentNode.removeChild(removeTarget);
            if (bus) bus.emit('history:recorded', { prop: 'removeElement', selector: cmd.selector });
          }
        }
        break;
    }
  };

  // ── Design Intelligence (v1.3) ──────────────────────────

  /**
   * DS-01: Extract CSS custom properties from the project as structured design tokens.
   * Inspired by Axhub Make "theme-as-data" — AI consumes tokens, not raw values.
   */
  AITab.prototype._extractDesignTokens = function () {
    var root = document.documentElement;
    var style = getComputedStyle(root);
    var tokens = { colors: {}, spacing: {}, typography: {}, radius: {} };

    var colorVars = ['--cc-primary', '--cc-primary-hover', '--cc-primary-bg',
      '--cc-success', '--cc-warning', '--cc-error',
      '--cc-text', '--cc-text-secondary', '--cc-text-tertiary',
      '--cc-border', '--cc-border-light',
      '--cc-bg', '--cc-bg-gray', '--cc-bg-secondary', '--cc-bg-tertiary'];
    var spaceVars = ['--cc-radius-sm', '--cc-radius-md', '--cc-radius-lg'];
    var typoVars = [];  // CollabCanvas doesn't define font-size vars yet
    var radiusVars = ['--cc-radius-sm', '--cc-radius-md', '--cc-radius-lg'];

    function collect(varNames, bucket) {
      varNames.forEach(function (v) {
        var val = style.getPropertyValue(v).trim();
        if (val) bucket[v] = val;
      });
    }
    collect(colorVars, tokens.colors);
    collect(spaceVars, tokens.spacing);
    collect(typoVars, tokens.typography);
    collect(radiusVars, tokens.radius);
    return tokens;
  };

  /**
   * DS-01 + DS-02: Build design-system prompt section for AI.
   * Injects CSS variable table + design profile from imported pages.
   */
  AITab.prototype._buildDesignPrompt = function () {
    var parts = [];

    // --- DS-01: CSS Variable Tokens ---
    var tokens = this._extractDesignTokens();
    var hasColors = Object.keys(tokens.colors).length > 0;
    var hasRadius = Object.keys(tokens.radius).length > 0;

    if (hasColors || hasRadius) {
      parts.push('## 设计系统 Token');
      parts.push('本项目使用 CSS 变量体系。生成 HTML/CSS 时必须使用以下变量，不要使用硬编码值：\n');

      if (hasColors) {
        parts.push('### 颜色（必须使用变量）');
        Object.keys(tokens.colors).forEach(function (k) {
          parts.push('- ' + k + ': ' + tokens.colors[k]);
        });
        parts.push('');
      }

      if (hasRadius) {
        parts.push('### 圆角（必须使用变量）');
        Object.keys(tokens.radius).forEach(function (k) {
          parts.push('- ' + k + ': ' + tokens.radius[k]);
        });
        parts.push('');
      }

      parts.push('示例：使用 `color: var(--cc-primary)` 而非 `color: #1677ff`，使用 `border-radius: var(--cc-radius-md)` 而非 `border-radius: 6px`。');
    }

    // --- DS-02: Design Profile from imported pages ---
    var profile = this._state.get('settings.designProfile');
    if (profile) {
      var hasProfileData = (profile.colors && profile.colors.length > 0) ||
        (profile.fontSizes && profile.fontSizes.length > 0);
      if (hasProfileData) {
        parts.push('\n## 项目风格参考（从已导入页面提取）');
        parts.push('以下是项目中使用频率最高的设计值，请优先使用这些值以保持风格一致：\n');

        if (profile.colors.length > 0) {
          parts.push('### 高频颜色');
          profile.colors.forEach(function (c) {
            parts.push('- ' + c.value + ' (使用 ' + c.count + ' 次)');
          });
        }
        if (profile.fontSizes && profile.fontSizes.length > 0) {
          parts.push('\n### 高频字号');
          profile.fontSizes.forEach(function (f) {
            parts.push('- ' + f.value + ' (使用 ' + f.count + ' 次)');
          });
        }
        if (profile.fontFamilies && profile.fontFamilies.length > 0) {
          parts.push('\n### 高频字体');
          profile.fontFamilies.forEach(function (f) {
            parts.push('- ' + f.value + ' (使用 ' + f.count + ' 次)');
          });
        }
      }
    }

    var result = parts.length > 0 ? '\n\n' + parts.join('\n') : '';

    // v1.4: Inject active design system metadata
    var dsInfo = this._getActiveDesignSystemInfo();
    if (dsInfo) result += dsInfo;

    return result;
  };

  /**
   * v1.4: Get active design system info for AI prompt injection.
   */
  AITab.prototype._getActiveDesignSystemInfo = function () {
    var activeDS = this._state.get('settings.activeDesignSystem');
    if (!activeDS || typeof CCDesignSystems === 'undefined') return '';

    var systems = new CCDesignSystems(this._state, this._bus);
    var info = systems.listSystems().filter(function (s) { return s.id === activeDS; });
    if (info.length === 0) return '';

    var ds = info[0];
    var tokens = systems.getTokens(activeDS);
    if (!tokens || tokens.length === 0) return '';

    var lines = [
      '\n## 活跃设计系统',
      '当前项目使用 **' + ds.name + '** (' + ds.version + ') — ' + ds.description + '。',
      '包含 ' + ds.tokenCount + ' 个设计令牌。生成代码时必须使用这些令牌变量。',
      ''
    ];

    // Group tokens by category for the prompt
    var grouped = {};
    tokens.forEach(function (t) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });

    var catLabels = { colors: '颜色', typography: '排版', spacing: '间距', radius: '圆角', shadows: '阴影' };
    var catOrder = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
    for (var i = 0; i < catOrder.length; i++) {
      var cat = catOrder[i];
      if (!grouped[cat] || grouped[cat].length === 0) continue;
      lines.push('### ' + catLabels[cat]);
      grouped[cat].forEach(function (t) {
        lines.push('- ' + t.name + ': ' + t.value);
      });
      lines.push('');
    }

    return '\n' + lines.join('\n');
  };

  /**
   * DS-03: Build a lookup map from computed CSS variable values back to variable names.
   * Used for post-processing AI output to replace hardcoded values with var() references.
   */
  AITab.prototype._buildTokenMap = function () {
    var root = document.documentElement;
    var style = getComputedStyle(root);
    var map = { colors: {}, sizes: {} };

    // Map computed color value → CSS variable name
    var colorVars = ['--cc-primary', '--cc-primary-hover', '--cc-success', '--cc-warning', '--cc-error',
      '--cc-text', '--cc-text-secondary', '--cc-border',
      '--cc-bg', '--cc-bg-gray', '--cc-bg-secondary'];
    colorVars.forEach(function (v) {
      var val = style.getPropertyValue(v).trim();
      if (val) {
        // Store computed rgb() format
        map.colors[val.toLowerCase()] = 'var(' + v + ')';
        // Also store hex equivalent for matching hardcoded hex in AI output
        var hex = _rgbToHex(val);
        if (hex) map.colors[hex] = 'var(' + v + ')';
      }
    });

    return map;
  };

  /**
   * DS-03: Post-process AI-generated HTML to replace hardcoded design values with CSS variables.
   * Runs inside code blocks only — doesn't touch prose text.
   */
  AITab.prototype._sanitizeDesignOutput = function (text) {
    var map = this._buildTokenMap();
    var colorKeys = Object.keys(map.colors);
    if (colorKeys.length === 0) return text;

    // Only sanitize content inside ```...``` code blocks
    return text.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
      var sanitized = code;
      colorKeys.forEach(function (computed) {
        // Match hex color patterns (e.g., #1677ff, #52c41a)
        if (computed.match(/^#[0-9a-f]{3,8}$/i)) {
          var hexRegex = new RegExp(computed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          sanitized = sanitized.replace(hexRegex, map.colors[computed]);
        }
      });
      return '```' + lang + '\n' + sanitized + '```';
    });
  };

  // ── Utility ────────────────────────────────────────────

  function _rgbToHex(rgb) {
    if (!rgb) return null;
    var match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    var r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    var g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    var b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  }

  function _escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  window.CCAITab = AITab;
})();
