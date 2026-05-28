;(function () {
  'use strict';

  var PASTE_OFFSET = 20;

  // Editor classes to strip when copying / pasting
  var EDITOR_CLASSES = [
    'cc-el-select', 'cc-el-hover', 'cc-el-multi',
    'cc-inline-edit', 'cc-group'
  ];

  class ClipboardManager {
    constructor(state, eventBus, domUtils, changeTracker, selection) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
      this.selection = selection;

      // Bound handlers for keyboard
      this._onKeyDown = this._onKeyDown.bind(this);
      document.addEventListener('keydown', this._onKeyDown);
    }

    // ── Public API ───────────────────────────────────────────

    /**
     * Copy the currently selected element(s) into the internal clipboard.
     */
    copySelected() {
      var items = this._getSelectionItems();
      if (items.length === 0) return;

      var canvas = this.state.canvas;
      var data = items.map(function (el) {
        return {
          html: this._cleanHTML(el.outerHTML),
          offsetLeft: parseFloat(el.style.left) || 0,
          offsetTop: parseFloat(el.style.top) || 0,
          width: parseFloat(el.style.width) || el.offsetWidth,
          height: parseFloat(el.style.height) || el.offsetHeight
        };
      }.bind(this));

      this.state.set('clipboard', {
        items: data,
        timestamp: Date.now()
      });

      this.eventBus.emit('clipboard:copy', { count: data.length });
    }

    /**
     * Copy and then delete the selected elements (cut).
     */
    cutSelected() {
      this.copySelected();

      var items = this._getSelectionItems();
      var self = this;

      items.forEach(function (el) {
        self.changeTracker.record('delete', null, {
          element: el,
          html: el.outerHTML,
          parent: el.parentNode
        }, { elementId: el.id });

        el.remove();
      });

      this.selection.deselect();
      this.eventBus.emit('clipboard:cut', { count: items.length });
    }

    /**
     * Paste from the internal clipboard.
     * Elements are placed at the last known mouse position or offset by PASTE_OFFSET.
     */
    pasteClipboard() {
      var clip = this.state.get('clipboard');
      if (!clip || !clip.items || clip.items.length === 0) return;

      var canvas = this.state.canvas;
      var mouse = this.state.get('clipboard.mousePos') || {};
      var hasMouse = typeof mouse.x === 'number' && typeof mouse.y === 'number';

      var pastedEls = [];

      clip.items.forEach(function (item, idx) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = item.html;
        var el = wrapper.firstChild;
        if (!el) return;

        // Assign new id to avoid duplicates
        el.id = 'cc-' + Date.now() + '-' + idx;

        // Remove editor classes
        EDITOR_CLASSES.forEach(function (cls) {
          el.classList.remove(cls);
        });

        // Remove any resize / rotate handles
        el.querySelectorAll('.cc-resize-handle,.cc-rotate-handle').forEach(function (h) {
          h.remove();
        });

        // Position
        var newLeft, newTop;
        if (hasMouse) {
          newLeft = mouse.x + (item.offsetLeft - clip.items[0].offsetLeft);
          newTop = mouse.y + (item.offsetTop - clip.items[0].offsetTop);
        } else {
          newLeft = item.offsetLeft + PASTE_OFFSET;
          newTop = item.offsetTop + PASTE_OFFSET;
        }

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';

        canvas.appendChild(el);
        pastedEls.push(el);

        this.changeTracker.record('insert', {
          element: el,
          html: el.outerHTML
        }, null, { elementId: el.id });
      }.bind(this));

      // Select the first pasted element
      if (pastedEls.length > 0) {
        this.selection.select(pastedEls[0]);
      }

      this.eventBus.emit('clipboard:paste', { count: pastedEls.length });
    }

    // ── Helpers ──────────────────────────────────────────────

    /**
     * Get the set of elements to operate on (multi-select or single).
     */
    _getSelectionItems() {
      var multi = this.state.get('selection.multiSelect') || [];
      if (multi.length > 0) return multi.slice();
      var sel = this.state.selected;
      return sel ? [sel] : [];
    }

    /**
     * Clean an HTML string: strip editor-specific classes and child handles.
     */
    _cleanHTML(html) {
      var div = document.createElement('div');
      div.innerHTML = html;
      var el = div.firstChild;
      if (!el) return html;

      EDITOR_CLASSES.forEach(function (cls) {
        el.classList.remove(cls);
      });
      el.querySelectorAll('.cc-resize-handle,.cc-rotate-handle').forEach(function (h) {
        h.remove();
      });

      return div.innerHTML;
    }

    /**
     * Keyboard shortcut handler for Ctrl+C / Ctrl+X / Ctrl+V.
     */
    _onKeyDown(e) {
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case 'c':
          this.copySelected();
          break;
        case 'x':
          this.cutSelected();
          break;
        case 'v':
          e.preventDefault();
          this.pasteClipboard();
          break;
      }
    }

    destroy() {
      document.removeEventListener('keydown', this._onKeyDown);
    }
  }

  window.CCClipboardManager = ClipboardManager;
})();
