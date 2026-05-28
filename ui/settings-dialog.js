/**
 * CollabCanvas -- Settings Dialog
 * 4-Tab 设置面板：项目信息 / AI 配置 / 导出偏好 / 标注默认
 */
;(function () {
  'use strict';

  var PROVIDERS = [
    { value: 'none', label: '未配置', endpoint: '' },
    { value: 'claude', label: 'Claude (Anthropic)', endpoint: 'https://api.anthropic.com' },
    { value: 'openai', label: 'OpenAI', endpoint: 'https://api.openai.com/v1' },
    { value: 'custom', label: '自定义', endpoint: '' }
  ];

  function SettingsDialog(state, bus, modal, toast) {
    this._state = state;
    this._bus = bus;
    this._modal = modal;
    this._toast = toast;
  }

  SettingsDialog.prototype.open = function () {
    var self = this;
    var settings = this._state.get('settings') || this._defaults();

    var html = '<div class="cc-settings-tabs">' +
      '<button class="cc-settings-tab active" data-tab="project">项目信息</button>' +
      '<button class="cc-settings-tab" data-tab="ai">AI 配置</button>' +
      '<button class="cc-settings-tab" data-tab="export">导出偏好</button>' +
      '<button class="cc-settings-tab" data-tab="annotations">标注默认</button>' +
      '</div>' +
      this._buildProjectPanel(settings) +
      this._buildAIPanel(settings) +
      this._buildExportPanel(settings) +
      this._buildAnnotationsPanel(settings);

    this._modal.show('设置', html, [
      { text: '关闭', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } }
    ]);

    // Bind tab switching
    setTimeout(function () { self._bindTabs(); self._bindFields(); }, 50);
  };

  // ── Tab Panels ──────────────────────────────────────────

  SettingsDialog.prototype._buildProjectPanel = function (s) {
    var p = s.project || {};
    return '<div class="cc-settings-panel active" data-panel="project">' +
      '<div class="cc-comp-form">' +
      this._row('项目名称', '<input class="cc-comp-input" data-setting="project.name" value="' + this._esc(p.name) + '" placeholder="输入项目名称">') +
      this._row('版本', '<input class="cc-comp-input" data-setting="project.version" value="' + this._esc(p.version) + '" placeholder="1.0">') +
      this._row('作者', '<input class="cc-comp-input" data-setting="project.author" value="' + this._esc(p.author) + '" placeholder="输入作者">') +
      this._row('描述', '<textarea class="cc-comp-input cc-comp-textarea" data-setting="project.description" rows="3" placeholder="项目描述">' + this._esc(p.description) + '</textarea>') +
      this._row('页面URL', '<input class="cc-comp-input" data-setting="project.pageUrl" value="' + this._esc(p.pageUrl || location.href) + '" readonly style="background:#f5f5f5;">') +
      '</div></div>';
  };

  SettingsDialog.prototype._buildAIPanel = function (s) {
    var ai = s.ai || {};
    var providerOpts = PROVIDERS.map(function (p) {
      return '<option value="' + p.value + '"' + (ai.provider === p.value ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');

    return '<div class="cc-settings-panel" data-panel="ai">' +
      '<div class="cc-comp-form">' +
      this._row('Provider', '<select class="cc-comp-input" data-setting="ai.provider" id="cc-ai-provider">' + providerOpts + '</select>') +
      this._row('API Key', '<input class="cc-comp-input" type="password" data-setting="ai.apiKey" value="' + this._esc(ai.apiKey) + '" placeholder="sk-...">') +
      this._row('端点URL', '<input class="cc-comp-input" data-setting="ai.endpoint" value="' + this._esc(ai.endpoint) + '" placeholder="https://api.example.com" id="cc-ai-endpoint">') +
      this._row('模型名', '<input class="cc-comp-input" data-setting="ai.model" value="' + this._esc(ai.model) + '" placeholder="claude-sonnet-4-20250514">') +
      '<div class="cc-comp-row"><label></label>' +
      '<button class="cc-btn" id="cc-ai-test-btn" style="font-size:11px;padding:4px 12px;">测试连接</button>' +
      '</div>' +
      '</div></div>';
  };

  SettingsDialog.prototype._buildExportPanel = function (s) {
    var e = s.export || {};
    return '<div class="cc-settings-panel" data-panel="export">' +
      '<div class="cc-comp-form">' +
      this._row('默认格式', '<select class="cc-comp-input" data-setting="export.format">' +
        '<option value="markdown"' + (e.format === 'markdown' ? ' selected' : '') + '>Markdown</option>' +
        '<option value="html"' + (e.format === 'html' ? ' selected' : '') + '>HTML</option>' +
        '<option value="png"' + (e.format === 'png' ? ' selected' : '') + '>PNG</option>' +
        '</select>') +
      this._row('包含截图', '<input type="checkbox" class="cc-comp-checkbox" data-setting="export.includeScreenshots"' + (e.includeScreenshots ? ' checked' : '') + '>') +
      this._row('包含标注', '<input type="checkbox" class="cc-comp-checkbox" data-setting="export.includeAnnotations"' + (e.includeAnnotations ? ' checked' : '') + '>') +
      this._row('编号格式', '<select class="cc-comp-input" data-setting="export.annotationNumberFormat">' +
        '<option value="auto"' + (e.annotationNumberFormat === 'auto' ? ' selected' : '') + '>自动</option>' +
        '<option value="1,2,3"' + (e.annotationNumberFormat === '1,2,3' ? ' selected' : '') + '>1, 2, 3</option>' +
        '<option value="A,B,C"' + (e.annotationNumberFormat === 'A,B,C' ? ' selected' : '') + '>A, B, C</option>' +
        '</select>') +
      '</div></div>';
  };

  SettingsDialog.prototype._buildAnnotationsPanel = function (s) {
    var a = s.annotations || {};
    return '<div class="cc-settings-panel" data-panel="annotations">' +
      '<div class="cc-comp-form">' +
      this._row('默认颜色', '<div class="cc-comp-color-row"><input class="cc-comp-color" data-setting="annotations.defaultColor" value="' + (a.defaultColor || '#1677ff') + '" type="color"><input class="cc-comp-input cc-comp-color-text" data-setting-text="annotations.defaultColor" value="' + (a.defaultColor || '#1677ff') + '" type="text"></div>') +
      this._row('默认状态', '<select class="cc-comp-input" data-setting="annotations.defaultStatus">' +
        '<option value="pending"' + (a.defaultStatus === 'pending' ? ' selected' : '') + '>待处理</option>' +
        '<option value="in-progress"' + (a.defaultStatus === 'in-progress' ? ' selected' : '') + '>进行中</option>' +
        '<option value="resolved"' + (a.defaultStatus === 'resolved' ? ' selected' : '') + '>已解决</option>' +
        '</select>') +
      this._row('自动编号', '<input type="checkbox" class="cc-comp-checkbox" data-setting="annotations.autoNumber"' + (a.autoNumber !== false ? ' checked' : '') + '>') +
      this._row('显示坐标', '<input type="checkbox" class="cc-comp-checkbox" data-setting="annotations.showCoordinates"' + (a.showCoordinates !== false ? ' checked' : '') + '>') +
      '</div></div>';
  };

  // ── Helpers ─────────────────────────────────────────────

  SettingsDialog.prototype._row = function (label, inputHtml) {
    return '<div class="cc-comp-row"><label>' + label + '</label>' + inputHtml + '</div>';
  };

  SettingsDialog.prototype._esc = function (str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  SettingsDialog.prototype._defaults = function () {
    return {
      project: { name: '', version: '1.0', author: '', description: '', pageUrl: '' },
      ai: { provider: 'none', apiKey: '', endpoint: '', model: '' },
      export: { format: 'markdown', includeScreenshots: true, includeAnnotations: true, annotationNumberFormat: 'auto' },
      annotations: { autoNumber: true, defaultColor: '#1677ff', defaultStatus: 'pending', showCoordinates: true }
    };
  };

  // ── Event Binding ───────────────────────────────────────

  SettingsDialog.prototype._bindTabs = function () {
    var dialog = document.querySelector('.cc-overlay:last-of-type .cc-dialog-body') ||
                 document.querySelector('.cc-overlay:last-of-type');
    if (!dialog) return;

    var tabs = dialog.querySelectorAll('.cc-settings-tab');
    var panels = dialog.querySelectorAll('.cc-settings-panel');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.getAttribute('data-tab');
        var panel = dialog.querySelector('[data-panel="' + target + '"]');
        if (panel) panel.classList.add('active');
      });
    });
  };

  SettingsDialog.prototype._bindFields = function () {
    var self = this;
    var dialog = document.querySelector('.cc-overlay:last-of-type .cc-dialog-body') ||
                 document.querySelector('.cc-overlay:last-of-type');
    if (!dialog) return;

    // All inputs with data-setting
    var inputs = dialog.querySelectorAll('[data-setting]');
    inputs.forEach(function (inp) {
      var eventType = (inp.type === 'checkbox') ? 'change' : 'input';
      inp.addEventListener(eventType, function () {
        var val;
        if (inp.type === 'checkbox') {
          val = inp.checked;
        } else {
          val = inp.value;
        }
        self._applySetting(inp.getAttribute('data-setting'), val);
      });
    });

    // Sync color picker text fields
    var colorInputs = dialog.querySelectorAll('.cc-comp-color[data-setting]');
    colorInputs.forEach(function (ci) {
      var settingKey = ci.getAttribute('data-setting');
      var ti = dialog.querySelector('[data-setting-text="' + settingKey + '"]');
      if (ti) {
        ci.addEventListener('input', function () { ti.value = ci.value; });
        ti.addEventListener('input', function () {
          if (/^#[0-9a-fA-F]{6}$/.test(ti.value)) ci.value = ti.value;
        });
      }
    });

    // Provider switch → auto-fill endpoint
    var providerSelect = dialog.querySelector('#cc-ai-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', function () {
        var val = providerSelect.value;
        var provider = PROVIDERS.filter(function (p) { return p.value === val; })[0];
        var endpointInput = dialog.querySelector('#cc-ai-endpoint');
        if (provider && endpointInput) {
          endpointInput.value = provider.endpoint;
          self._applySetting('ai.endpoint', provider.endpoint);
        }
      });
    }

    // AI test button — real connection test
    var testBtn = dialog.querySelector('#cc-ai-test-btn');
    if (testBtn) {
      testBtn.addEventListener('click', function () {
        var ai = self._state.get('settings.ai') || {};
        if (!ai.apiKey || !ai.endpoint) {
          if (self._toast) self._toast.show('请先填写 API Key 和端点URL', 'info');
          return;
        }
        testBtn.disabled = true;
        testBtn.textContent = '测试中...';

        var headers = { 'Content-Type': 'application/json' };
        var body;
        var url = ai.endpoint;

        if (ai.provider === 'claude') {
          headers['x-api-key'] = ai.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          if (url && !url.endsWith('/v1/messages')) url = url.replace(/\/$/, '') + '/v1/messages';
          else if (!url) url = 'https://api.anthropic.com/v1/messages';
          body = JSON.stringify({ model: ai.model || 'claude-sonnet-4-20250514', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] });
        } else {
          // OpenAI-compatible
          headers['Authorization'] = 'Bearer ' + ai.apiKey;
          if (url && !url.endsWith('/chat/completions')) url = url.replace(/\/$/, '') + '/chat/completions';
          body = JSON.stringify({ model: ai.model || 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] });
        }

        fetch(url, { method: 'POST', headers: headers, body: body })
          .then(function (res) {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
            if (res.ok) {
              if (self._toast) self._toast.show('AI 连接成功 (' + res.status + ')', 'success');
            } else {
              return res.text().then(function (t) {
                var msg = t.substring(0, 120);
                if (self._toast) self._toast.show('连接失败 ' + res.status + ': ' + msg, 'info');
              });
            }
          })
          .catch(function (err) {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
            var msg = err.message || '';
            if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('NetworkError') >= 0) {
              if (self._toast) self._toast.show('网络错误: CORS 限制或端点不可达（扩展模式下需通过 background script）', 'info');
            } else {
              if (self._toast) self._toast.show('连接错误: ' + msg, 'info');
            }
          });
      });
    }
  };

  SettingsDialog.prototype._applySetting = function (path, value) {
    this._state.set('settings.' + path, value);
    // Debounced persistence
    if (window.CCPersistence) {
      var settings = this._state.get('settings');
      window.CCPersistence.debounceSave('settings', settings);
    }
  };

  window.CCSettingsDialog = SettingsDialog;
})();
