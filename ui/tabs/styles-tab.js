/**
 * CollabCanvas — Styles Tab
 * UI panel for viewing and managing design tokens (Colors, Typography, Spacing, Shadows, Radius)
 */
(function() {
  'use strict';

  var CATEGORIES = [
    { key: 'colors',     label: '颜色', icon: 'C' },
    { key: 'typography', label: '排版', icon: 'T' },
    { key: 'spacing',    label: '间距', icon: 'S' },
    { key: 'shadows',    label: '阴影', icon: 'W' },
    { key: 'radius',     label: '圆角', icon: 'R' }
  ];

  var PRESET_NAMES = {
    'ant-design': 'Ant Design',
    'tailwind': 'Tailwind',
    'element-plus': 'Element Plus'
  };

  function StylesTab(state, eventBus) {
    this._state = state;
    this._bus = eventBus;
    this._container = null;
    this._activeCategory = 'colors';
    this._showPresets = false;
    this._onTokensChanged = this._onTokensChanged.bind(this);
  }

  /**
   * Render the styles tab into a container.
   * @param {HTMLElement} container
   */
  StylesTab.prototype.render = function(container) {
    this._container = container;
    if (this._bus) {
      this._bus.on('tokens:changed', this._onTokensChanged);
    }
    this._draw();
  };

  StylesTab.prototype._onTokensChanged = function() { this._draw(); };

  StylesTab.prototype._draw = function() {
    if (!this._container) return;

    var html = '<div class="cc-styles-tab">';

    // Header with action buttons
    html += '<div class="cc-styles-header">';
    html += '<span class="cc-styles-title">设计令牌</span>';
    html += '<div class="cc-styles-actions">';
    html += '<button class="cc-styles-preset-btn" data-action="presets">预设</button>';
    html += '<button class="cc-styles-extract-btn" data-action="extract">从页面提取</button>';
    html += '<button class="cc-styles-import-btn" data-action="import">导入</button>';
    html += '</div></div>';

    // Category tabs
    html += '<div class="cc-styles-categories">';
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      var active = (this._activeCategory === cat.key);
      html += '<button class="cc-styles-cat-btn' + (active ? ' active' : '') +
        '" data-category="' + cat.key + '">' + cat.label + '</button>';
    }
    html += '</div>';

    // Token content
    var tokens = this._state.get('tokens.' + this._activeCategory) || [];
    html += '<div class="cc-styles-content">';

    if (tokens.length === 0) {
      html += '<div class="cc-styles-empty">';
      html += '<div class="cc-styles-empty-icon">' + CATEGORIES.reduce(function(prev, c) {
        return c.key === this._activeCategory ? c : prev;
      }.bind(this), CATEGORIES[0]).icon + '</div>';
      html += '<div class="cc-styles-empty-text">暂无' + this._getCategoryLabel() + '令牌</div>';
      html += '<div class="cc-styles-empty-hint">点击「从页面提取」自动扫描，或点击「导入」加载预设</div>';
      html += '</div>';
    } else {
      html += '<div class="cc-styles-count">' + tokens.length + ' 个令牌</div>';
      html += this._renderTokens(tokens);
    }

    html += '</div>';

    // Presets panel (toggle)
    if (this._showPresets) {
      html += '<div class="cc-styles-presets">';
      html += '<div class="cc-styles-presets-title">选择预设设计系统</div>';
      for (var preset in PRESET_NAMES) {
        if (PRESET_NAMES.hasOwnProperty(preset)) {
          html += '<button class="cc-styles-preset-item" data-preset="' + preset + '">' +
            PRESET_NAMES[preset] + '</button>';
        }
      }
      html += '</div>';
    }

    html += '</div>';

    this._container.innerHTML = html;
    this._attachListeners();
  };

  StylesTab.prototype._getCategoryLabel = function() {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === this._activeCategory) return CATEGORIES[i].label;
    }
    return '';
  };

  /**
   * Render tokens for the active category.
   */
  StylesTab.prototype._renderTokens = function(tokens) {
    var html = '';

    if (this._activeCategory === 'colors') {
      // Color swatches grid
      html += '<div class="cc-token-swatches">';
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        html += '<div class="cc-token-swatch" data-token-id="' + (t.id || i) + '" title="' + this._escapeAttr(t.value) + '">';
        html += '<div class="cc-token-swatch-color" style="background:' + this._escapeAttr(t.value) + ';"></div>';
        html += '<div class="cc-token-swatch-name">' + this._escapeHtml(t.name) + '</div>';
        html += '<div class="cc-token-swatch-value">' + this._escapeHtml(t.value) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      // List view for non-color categories
      for (var j = 0; j < tokens.length; j++) {
        var tk = tokens[j];
        html += '<div class="cc-token-item" data-token-id="' + (tk.id || j) + '" title="点击应用到选中元素">';

        // Preview
        html += '<div class="cc-token-preview" style="' + this._getPreviewStyle(tk) + '">';
        if (this._activeCategory === 'spacing') {
          html += this._escapeHtml(tk.value);
        }
        html += '</div>';

        // Name + value
        html += '<div class="cc-token-info">';
        html += '<div class="cc-token-name">' + this._escapeHtml(tk.name) + '</div>';
        html += '<div class="cc-token-value">' + this._escapeHtml(tk.value) + '</div>';
        html += '</div>';

        html += '</div>';
      }
    }

    return html;
  };

  /**
   * Get preview style based on token category.
   */
  StylesTab.prototype._getPreviewStyle = function(token) {
    switch (this._activeCategory) {
      case 'typography':
        return 'font-size:14px;display:flex;align-items:center;justify-content:center;' +
          'font-family:' + this._escapeAttr(token.value) + ';';
      case 'spacing':
        return 'display:flex;align-items:center;justify-content:center;' +
          'font-size:10px;color:var(--cc-text-secondary);';
      case 'shadows':
        return 'box-shadow:' + this._escapeAttr(token.value) + ';';
      case 'radius':
        return 'border-radius:' + this._escapeAttr(token.value) + ';';
      default:
        return '';
    }
  };

  StylesTab.prototype._attachListeners = function() {
    var self = this;
    if (!this._container) return;

    // Category tabs
    var catBtns = this._container.querySelectorAll('.cc-styles-cat-btn');
    for (var i = 0; i < catBtns.length; i++) {
      catBtns[i].addEventListener('click', function() {
        self._activeCategory = this.getAttribute('data-category');
        self._draw();
      });
    }

    // Token swatches / items - click to apply to selected element
    var tokenEls = this._container.querySelectorAll('.cc-token-swatch,.cc-token-item');
    for (var j = 0; j < tokenEls.length; j++) {
      tokenEls[j].addEventListener('click', function() {
        var id = this.getAttribute('data-token-id');
        if (self._bus) {
          self._bus.emit('token:apply', { tokenId: id, category: self._activeCategory });
        }
      });
    }

    // Extract button
    var extractBtn = this._container.querySelector('[data-action="extract"]');
    if (extractBtn) {
      extractBtn.addEventListener('click', function() {
        if (self._bus) self._bus.emit('token:extract-request', {});
      });
    }

    // Import button
    var importBtn = this._container.querySelector('[data-action="import"]');
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        if (self._bus) self._bus.emit('token:import-request', {});
      });
    }

    // Presets toggle
    var presetBtn = this._container.querySelector('[data-action="presets"]');
    if (presetBtn) {
      presetBtn.addEventListener('click', function() {
        self._showPresets = !self._showPresets;
        self._draw();
      });
    }

    // Preset items
    var presetItems = this._container.querySelectorAll('.cc-styles-preset-item');
    for (var k = 0; k < presetItems.length; k++) {
      presetItems[k].addEventListener('click', function() {
        var preset = this.getAttribute('data-preset');
        if (self._bus) self._bus.emit('token:load-preset', { preset: preset });
        self._showPresets = false;
      });
    }
  };

  StylesTab.prototype._escapeHtml = function(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  };

  StylesTab.prototype._escapeAttr = function(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /**
   * Clean up.
   */
  StylesTab.prototype.destroy = function() {
    if (this._bus) {
      this._bus.off('tokens:changed', this._onTokensChanged);
    }
    this._container = null;
  };

  // Export
  window.CCStylesTab = StylesTab;
})();
