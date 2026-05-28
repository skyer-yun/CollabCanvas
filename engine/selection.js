;(function () {
  'use strict';

  class SelectionManager {
    constructor(state, eventBus, domUtils, textEditor) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.textEditor = textEditor;
    }

    /**
     * Select a canvas element.
     * Deselects any previous selection first.
     */
    select(el) {
      if (!el || !this.domUtils.isCanvasChild(el)) return;
      if (this.state.get('selection.current') === el) return;

      this.deselect();

      this.state.set('selection.current', el);

      el.classList.add('cc-el-select');
      this.eventBus.emit('selection:changed', { element: el, action: 'select' });
    }

    /**
     * Deselect the currently selected element.
     * Finishes any in-progress inline text edit first.
     */
    deselect() {
      var el = this.state.get('selection.current');
      if (!el) return;

      // Finish any active inline edit
      if (this.textEditor && typeof this.textEditor.finishInlineEdit === 'function') {
        this.textEditor.finishInlineEdit();
      }

      el.classList.remove('cc-el-select');
      el.classList.remove('cc-el-hover');

      this.state.set('selection.current', null);

      this.eventBus.emit('selection:changed', { element: el, action: 'deselect' });
    }

    /**
     * Show hover state for an element.
     */
    hover(el) {
      if (!el || !this.domUtils.isCanvasChild(el)) return;
      if (this.state.get('selection.current') === el) return; // Already selected

      el.classList.add('cc-el-hover');
      this._showTooltip(el);
    }

    /**
     * Remove hover state from an element.
     */
    unhover(el) {
      if (!el) return;
      el.classList.remove('cc-el-hover');
      this._hideTooltip();
    }

    /**
     * Toggle an element in / out of the multi-select set.
     */
    toggleMultiSelect(el) {
      if (!el || !this.domUtils.isCanvasChild(el)) return;

      var multi = this.state.get('selection.multiSelect') || [];

      var idx = multi.indexOf(el);
      if (idx === -1) {
        multi.push(el);
        el.classList.add('cc-el-multi');
      } else {
        multi.splice(idx, 1);
        el.classList.remove('cc-el-multi');
      }

      this.state.set('selection.multiSelect', multi);
      this.eventBus.emit('selection:multiChanged', { elements: multi.slice() });
    }

    /**
     * Clear all multi-selected elements.
     */
    clearMultiSelect() {
      var multi = this.state.get('selection.multiSelect') || [];
      multi.forEach(function (el) {
        el.classList.remove('cc-el-multi');
      });

      this.state.set('selection.multiSelect', []);
      this.eventBus.emit('selection:multiChanged', { elements: [] });
    }

    // ── Tooltip helpers ──────────────────────────────────────

    _showTooltip(el) {
      var tooltip = this.domUtils.$('#cc-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'cc-tooltip';
        tooltip.style.cssText = 'position:absolute;padding:2px 8px;font-size:11px;' +
          'background:rgba(0,0,0,.75);color:#fff;border-radius:3px;pointer-events:none;' +
          'z-index:99999;white-space:nowrap;display:none;';
        document.body.appendChild(tooltip);
      }

      var tag = el.getAttribute('data-type') || el.tagName.toLowerCase();
      var id = el.id || '';
      tooltip.textContent = id ? tag + ' #' + id : tag;

      var rect = el.getBoundingClientRect();
      tooltip.style.left = rect.left + 'px';
      tooltip.style.top = (rect.top - 22) + 'px';
      tooltip.style.display = 'block';
    }

    _hideTooltip() {
      var tooltip = this.domUtils.$('#cc-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }
  }

  window.CCSelectionManager = SelectionManager;
})();
