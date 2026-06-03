/**
 * CollabCanvas — AI Client
 * Unified AI API client supporting Claude (Anthropic) and OpenAI-compatible providers.
 * Extension mode uses proxy helper; standalone uses direct fetch.
 * IIFE exporting to window.CCAIClient
 */
(function(global) {
  'use strict';

  var DEFAULT_TIMEOUT = 30000;
  var RETRY_DELAY = 2000;
  var MAX_RETRIES = 1;

  function AIClient(state, bus, proxy) {
    this._state = state;
    this._bus = bus;
    this._proxy = proxy || null;
    this._history = [];
  }

  // ── Config ────────────────────────────────────────────

  AIClient.prototype.isConfigured = function() {
    var ai = this._state.get('settings.ai') || {};
    return ai.provider && ai.provider !== 'none' && ai.apiKey && ai.apiKey !== '';
  };

  AIClient.prototype.getConfig = function() {
    return this._state.get('settings.ai') || {};
  };

  // ── Core Chat ─────────────────────────────────────────

  /**
   * Send messages to AI and get a response.
   * @param {Array} messages - [{role, content}]
   * @param {Object} [opts] - {stream, maxTokens, model}
   * @returns {Promise<{content: string, usage: Object}>}
   */
  AIClient.prototype.chat = function(messages, opts) {
    opts = opts || {};
    var config = this.getConfig();
    var self = this;

    if (!this.isConfigured()) {
      return Promise.reject(new Error('AI 未配置，请在设置中填写 API Key'));
    }

    var provider = config.provider;
    var url, headers, body;

    if (provider === 'claude') {
      var req = this._buildClaudeRequest(messages, opts, config);
      url = req.url; headers = req.headers; body = req.body;
    } else {
      // openai or custom
      var req2 = this._buildOpenAIRequest(messages, opts, config);
      url = req2.url; headers = req2.headers; body = req2.body;
    }

    return this._fetchWithRetry(url, {
      method: 'POST',
      headers: headers,
      body: body
    }, MAX_RETRIES).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errMsg = 'API Error ' + response.status + ': ' + text.substring(0, 200);
          if (response.status === 401) errMsg = 'API Key 无效或已过期，请检查设置';
          if (response.status === 429) errMsg = 'API 调用频率超限，请稍后重试';
          throw new Error(errMsg);
        });
      }
      return response.text().then(function(text) {
        return self._parseResponse(text, provider);
      });
    });
  };

  // ── Request Builders ──────────────────────────────────

  AIClient.prototype._buildClaudeRequest = function(messages, opts, config) {
    var endpoint = config.endpoint || 'https://api.anthropic.com';
    var url = endpoint.replace(/\/$/, '') + '/v1/messages';
    var systemMsg = '';
    var chatMsgs = [];

    for (var i = 0; i < messages.length; i++) {
      if (messages[i].role === 'system') {
        systemMsg = messages[i].content;
      } else {
        chatMsgs.push({ role: messages[i].role, content: messages[i].content });
      }
    }

    var bodyObj = {
      model: opts.model || config.model || 'claude-sonnet-4-20250514',
      max_tokens: opts.maxTokens || 2048,
      messages: chatMsgs
    };
    if (systemMsg) bodyObj.system = systemMsg;

    return {
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(bodyObj)
    };
  };

  AIClient.prototype._buildOpenAIRequest = function(messages, opts, config) {
    var endpoint = config.endpoint || 'https://api.openai.com/v1';
    var url = endpoint.replace(/\/$/, '');
    if (url.indexOf('/chat/completions') === -1) url += '/chat/completions';

    var bodyObj = {
      model: opts.model || config.model || 'gpt-4o-mini',
      max_tokens: opts.maxTokens || 2048,
      messages: messages
    };

    return {
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(bodyObj)
    };
  };

  // ── Response Parsing ──────────────────────────────────

  AIClient.prototype._parseResponse = function(text, provider) {
    var data;
    try { data = JSON.parse(text); } catch(e) {
      return { content: text, usage: {} };
    }

    if (provider === 'claude') {
      var content = '';
      if (data.content && data.content.length > 0) {
        for (var i = 0; i < data.content.length; i++) {
          if (data.content[i].type === 'text') {
            content += data.content[i].text;
          }
        }
      }
      return {
        content: content,
        usage: data.usage || {}
      };
    } else {
      // OpenAI-compatible
      var content2 = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        content2 = data.choices[0].message.content || '';
      }
      return {
        content: content2,
        usage: data.usage || {}
      };
    }
  };

  // ── Fetch with Retry ──────────────────────────────────

  AIClient.prototype._fetchWithRetry = function(url, options, retries) {
    var self = this;
    return this._fetch(url, options).then(function(response) {
      if (response.status === 429 && retries > 0) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(self._fetchWithRetry(url, options, retries - 1));
          }, RETRY_DELAY);
        });
      }
      return response;
    });
  };

  AIClient.prototype._fetch = function(url, options) {
    // Extension mode: use proxy for external URLs
    if (this._proxy && this._proxy.isExtension() && url.indexOf('http') === 0) {
      return this._proxy.fetch(url, options);
    }
    // Standalone mode or same-origin: direct fetch with timeout
    return new Promise(function(resolve, reject) {
      var timeoutId = setTimeout(function() {
        reject(new Error('请求超时（' + (DEFAULT_TIMEOUT / 1000) + 's）'));
      }, DEFAULT_TIMEOUT);

      fetch(url, options).then(function(response) {
        clearTimeout(timeoutId);
        resolve(response);
      }).catch(function(err) {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  };

  // ── History Management ────────────────────────────────

  AIClient.prototype.addMessage = function(role, content) {
    this._history.push({ role: role, content: content });
  };

  AIClient.prototype.clearHistory = function() {
    this._history = [];
  };

  AIClient.prototype.getHistory = function() {
    return this._history.slice();
  };

  // ── Convenience: simple chat with history ──────────────

  /**
   * Send a user message, appending to internal history.
   * @param {string} text - user message
   * @param {Object} [opts] - options passed to chat()
   * @returns {Promise<{content: string, usage: Object}>}
   */
  AIClient.prototype.sendMessage = function(text, opts) {
    this.addMessage('user', text);
    var self = this;
    return this.chat(this._history, opts).then(function(result) {
      self.addMessage('assistant', result.content);
      return result;
    });
  };

  // ── Convenience: one-shot prompt (no history) ─────────

  AIClient.prototype.prompt = function(systemPrompt, userPrompt, opts) {
    var msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    msgs.push({ role: 'user', content: userPrompt });
    return this.chat(msgs, opts);
  };

  // ── Abort ─────────────────────────────────────────────

  AIClient.prototype.abortCurrent = function() {
    // Placeholder for AbortController integration
    // Will cancel in-flight fetch request
  };

  global.CCAIClient = AIClient;
})(window);
