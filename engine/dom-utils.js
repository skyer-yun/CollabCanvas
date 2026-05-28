/**
 * CollabCanvas — DOM Utility Functions
 * 从 Visual Editor v4.1 迁移的核心 DOM 工具函数
 */
(function() {
  'use strict';

  var DomUtils = {
    $: function(sel, ctx) { return (ctx || document).querySelector(sel); },
    $$: function(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); },
    esc: function(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
    cssVal: function(el, prop) { return getComputedStyle(el).getPropertyValue(prop).trim(); },

    isEditorEl: function(el) {
      if (!el || !el.closest) return true;
      return !!el.closest(
        '.cc-toolbar,.cc-panel,.cc-overlay,.cc-dialog,.cc-info-tip,' +
        '.cc-resize-handle,.cc-rotate-handle,.cc-rotate-line,.cc-left-panel,' +
        '.cc-right-panel,.cc-statusbar,.cc-context-menu,.cc-paused-bar,' +
        '.cc-smart-guide,.cc-dist-label,.cc-annotation-overlay'
      );
    },

    getElPosition: function(el) {
      var cs = getComputedStyle(el);
      var l = parseFloat(cs.left);
      var t = parseFloat(cs.top);
      if (isNaN(l)) l = el.offsetLeft || 0;
      if (isNaN(t)) t = el.offsetTop || 0;
      return { left: l, top: t };
    },

    buildPath: function(el) {
      if (!el || el === document.body || el === document.documentElement) return 'body';
      if (el.classList && el.classList.contains('cc-canvas')) return 'body';
      var parts = [], cur = el;
      while (cur && cur !== document.body && cur !== document.documentElement &&
             !(cur.classList && cur.classList.contains('cc-canvas'))) {
        var s = cur.tagName.toLowerCase();
        if (cur.id) { parts.unshift(s + '#' + cur.id); break; }
        var cls = Array.from(cur.classList).filter(function(c) {
          return !/^cc-|^ve-/.test(c) && c.length > 2;
        }).slice(0, 2);
        if (cls.length) { parts.unshift(s + '.' + cls.join('.')); break; }
        var idx = cur.parentElement ? Array.from(cur.parentElement.children).indexOf(cur) + 1 : 0;
        if (idx) s += ':nth-child(' + idx + ')';
        parts.unshift(s);
        cur = cur.parentElement;
        if (parts.length >= 4) break;
      }
      return parts.join(' > ');
    },

    isCanvasChild: function(el, canvas) {
      if (!el) return false;
      if (canvas) return canvas.contains(el);
      // Check if element is inside .cc-canvas
      var canvasEl = document.querySelector('.cc-canvas');
      if (canvasEl) return canvasEl.contains(el);
      return false;
    },

    rgbToHex: function(rgb) {
      if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
      var m = rgb.match(/(\d+)/g);
      if (!m || m.length < 3) return '#ffffff';
      return '#' + ((1 << 24) + (+m[0] << 16) + (+m[1] << 8) + (+m[2])).toString(16).slice(1);
    }
  };

  window.CCDomUtils = DomUtils;
})();
