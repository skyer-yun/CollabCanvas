/**
 * CollabCanvas -- Page Element Extractor
 * Extracts page DOM elements into CC components:
 *   walkDOM -> classifyElement -> componentize -> convertToAbsolute
 */
;(function () {
  'use strict';

  function PageExtractor(state, bus, dom, factory, renderer) {
    this.state = state;
    this.bus = bus;
    this.dom = dom;
    this.factory = factory;
    this.renderer = renderer;
  }

  // ---- Public API ----

  /**
   * Extract all child elements of the canvas into CC components.
   * Called after page import moves elements into canvas.
   */
  PageExtractor.prototype.extractPage = function (canvasEl) {
    var nodes = this._walkDOM(canvasEl);
    var self = this;

    nodes.forEach(function (node) {
      var type = self._classifyElement(node.el);
      if (type) {
        self._componentize(node.el, type);
        self._convertToAbsolute(node.el, canvasEl);
      }
    });

    this.bus.emit('page:extracted', { count: nodes.length });
    return nodes.length;
  };

  // ---- DOM Walking ----

  PageExtractor.prototype._walkDOM = function (root) {
    var results = [];
    var skip = ['SCRIPT', 'STYLE', 'LINK', 'SVG'];

    function walk(parent, depth) {
      var children = parent.children;
      for (var i = 0; i < children.length; i++) {
        var el = children[i];

        // Skip CC internal elements and non-element nodes
        if (skip.indexOf(el.tagName) !== -1) continue;
        if (el.classList && (
          el.classList.contains('cc-root') ||
          el.classList.contains('cc-viewport') ||
          el.classList.contains('cc-canvas') ||
          el.classList.contains('cc-el')
        )) continue;

        // Skip tiny/invisible elements
        var rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;

        results.push({
          el: el,
          rect: rect,
          parent: parent,
          depth: depth,
          children: []
        });

        // Recurse into children
        walk(el, depth + 1);
      }
    }

    walk(root, 0);
    return results;
  };

  // ---- Element Classification ----
  // 4-level matching: tag -> role -> CSS class heuristic -> style heuristic

  PageExtractor.prototype._classifyElement = function (el) {
    var result;

    // Level 1: Tag name (confidence 0.9-1.0)
    result = this._matchByTag(el);
    if (result) return result;

    // Level 2: Role attribute (confidence 0.85-0.95)
    result = this._matchByRole(el);
    if (result) return result;

    // Level 3: CSS class heuristic (confidence 0.7-0.9)
    result = this._matchByClass(el);
    if (result) return result;

    // Level 4: Style heuristic (confidence 0.4-0.6)
    result = this._matchByStyle(el);
    if (result) return result;

    // Fallback: map common tags
    var tag = el.tagName.toLowerCase();
    var tagMap = {
      'div': 'container', 'section': 'container', 'article': 'container',
      'header': 'container', 'footer': 'container', 'nav': 'container',
      'main': 'container', 'aside': 'container',
      'span': 'text', 'p': 'paragraph',
      'h1': 'heading', 'h2': 'heading', 'h3': 'heading',
      'h4': 'heading', 'h5': 'heading', 'h6': 'heading'
    };
    return tagMap[tag] || null;
  };

  PageExtractor.prototype._matchByTag = function (el) {
    var tag = el.tagName.toLowerCase();
    var tagMap = {
      'button': 'button',
      'input': this._inputType(el),
      'select': 'select',
      'textarea': 'input',
      'table': 'table',
      'img': 'image',
      'video': 'video',
      'a': 'link',
      'ul': 'list',
      'ol': 'list'
    };
    return tagMap[tag] || null;
  };

  PageExtractor.prototype._inputType = function (el) {
    if (el.tagName.toLowerCase() !== 'input') return 'input';
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    return 'input';
  };

  PageExtractor.prototype._matchByRole = function (el) {
    var role = el.getAttribute('role');
    if (!role) return null;
    var roleMap = {
      'button': 'button',
      'textbox': 'input',
      'listbox': 'select',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'grid': 'table',
      'link': 'link',
      'img': 'image'
    };
    return roleMap[role] || null;
  };

  PageExtractor.prototype._matchByClass = function (el) {
    var cls = (el.className || '').toLowerCase();
    if (typeof cls !== 'string') return null;

    // UI library patterns
    var patterns = [
      { regex: /(?:ant-btn|el-button|t-btn|arco-btn|semi-button)(?!\w)/, type: 'button' },
      { regex: /(?:ant-input|el-input|t-input|arco-input|semi-input)(?!\w)/, type: 'input' },
      { regex: /(?:ant-select|el-select|t-select|arco-select|semi-select)(?!\w)/, type: 'select' },
      { regex: /(?:ant-table|el-table|t-table|arco-table|semi-table)(?!\w)/, type: 'table' },
      { regex: /(?:ant-card|el-card|t-card|arco-card|semi-card)(?!\w)/, type: 'card' },
      { regex: /(?:ant-checkbox|el-checkbox|t-checkbox|arco-checkbox)(?!\w)/, type: 'checkbox' },
      { regex: /(?:ant-radio|el-radio|t-radio|arco-radio)(?!\w)/, type: 'radio' },
      { regex: /(?:navbar|sidebar|header|footer)(?!\w)/, type: 'container' }
    ];

    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].regex.test(cls)) return patterns[i].type;
    }
    return null;
  };

  PageExtractor.prototype._matchByStyle = function (el) {
    var style = window.getComputedStyle(el);
    var cursor = style.cursor;
    var bg = style.backgroundColor;
    var radius = parseInt(style.borderRadius) || 0;
    var hasBorder = style.borderStyle !== 'none';
    var padding = parseInt(style.paddingTop) + parseInt(style.paddingBottom);

    // Cursor pointer + background + radius => likely button
    if (cursor === 'pointer' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && radius > 0) {
      return 'button';
    }

    // Box-shadow + radius + padding => likely card
    var shadow = style.boxShadow;
    if (shadow && shadow !== 'none' && radius > 4 && padding > 12) {
      return 'card';
    }

    return null;
  };

  // ---- Componentize ----

  PageExtractor.prototype._componentize = function (el, type) {
    // Add cc-el class
    if (!el.classList.contains('cc-el')) {
      el.classList.add('cc-el');
    }

    // Set data-type to English type name (override any Chinese type)
    el.setAttribute('data-type', type);

    // Generate unique ID if missing
    if (!el.id || el.id.indexOf('cc-') !== 0) {
      el.id = 'cc-' + type + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    }

    // Mark as extracted
    el.setAttribute('data-source', 'extracted');

    // Store original position info for potential restoration
    el.setAttribute('data-cc-orig-position', el.style.position || '');
    el.setAttribute('data-cc-orig-display', el.style.display || '');
  };

  // ---- Coordinate Conversion ----

  PageExtractor.prototype._convertToAbsolute = function (el, canvasEl) {
    var rect = el.getBoundingClientRect();
    var canvasRect = canvasEl.getBoundingClientRect();

    // Calculate position relative to canvas
    var left = rect.left - canvasRect.left;
    var top = rect.top - canvasRect.top;

    // Account for canvas scroll
    left += canvasEl.scrollLeft || 0;
    top += canvasEl.scrollTop || 0;

    // Store original values
    if (!el.getAttribute('data-cc-orig-position')) {
      el.setAttribute('data-cc-orig-position', el.style.position || '');
    }

    // Convert to absolute positioning
    el.style.position = 'absolute';
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    el.style.width = Math.round(rect.width) + 'px';
    el.style.height = Math.round(rect.height) + 'px';
    el.style.margin = '0';
  };

  window.CCPageExtractor = PageExtractor;
})();
