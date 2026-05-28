/**
 * CollabCanvas — Compare Engine
 * Side-by-side and overlay comparison of DOM versions
 */
(function() {
  'use strict';

  function CompareEngine(state, eventBus) {
    this._state = state;
    this._bus = eventBus;
    this._mode = null;        // 'sideBySide' | 'overlay'
    this._wrapper = null;     // compare wrapper element
    this._originalParent = null;
    this._canvas = null;
    this._opacity = 0.5;
    this._diffHighlight = false;
    this._pane1 = null;
    this._pane2 = null;
  }

  /**
   * Get the canvas element from state.
   */
  CompareEngine.prototype._getCanvas = function() {
    return this._state.get('canvas.canvas') ||
      document.querySelector('.cc-canvas');
  };

  /**
   * Create a cloned snapshot of the canvas content.
   * @param {string} html - HTML string to render in a pane
   * @returns {HTMLElement}
   */
  CompareEngine.prototype._createPane = function(html, label) {
    var pane = document.createElement('div');
    pane.className = 'cc-compare-pane';
    pane.style.cssText = 'position:relative;overflow:auto;background:#fff;' +
      'border:1px solid var(--cc-border,#e8e8e8);border-radius:4px;';
    if (label) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'position:sticky;top:0;z-index:1;padding:4px 10px;' +
        'font-size:11px;font-weight:600;color:var(--cc-text-secondary,#8c8c8c);' +
        'background:var(--cc-bg-secondary,#f5f5f5);border-bottom:1px solid var(--cc-border,#e8e8e8);';
      lbl.textContent = label;
      pane.appendChild(lbl);
    }
    var content = document.createElement('div');
    content.style.cssText = 'padding:12px;';
    content.innerHTML = html;
    pane.appendChild(content);
    return pane;
  };

  /**
   * Side-by-side comparison: split viewport into two panes.
   * @param {string} v1 - HTML of version 1
   * @param {string} v2 - HTML of version 2
   * @returns {HTMLElement} the compare wrapper
   */
  CompareEngine.prototype.sideBySide = function(v1, v2) {
    this.cleanup();

    this._canvas = this._getCanvas();
    if (!this._canvas) {
      console.warn('[CCCompareEngine] canvas not found');
      return null;
    }

    this._mode = 'sideBySide';
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'cc-compare-wrapper';
    this._wrapper.style.cssText = 'display:flex;gap:8px;width:100%;height:100%;' +
      'position:absolute;top:0;left:0;right:0;bottom:0;z-index:6;background:var(--cc-bg,#fff);';

    this._pane1 = this._createPane(v1, '版本 1（快照）');
    this._pane1.style.flex = '1';
    this._pane1.style.height = '100%';

    this._pane2 = this._createPane(v2, '版本 2（当前）');
    this._pane2.style.flex = '1';
    this._pane2.style.height = '100%';

    this._wrapper.appendChild(this._pane1);
    this._wrapper.appendChild(this._pane2);

    // Hide original canvas content
    var canvasChildren = this._canvas.children;
    this._originalChildren = [];
    for (var i = 0; i < canvasChildren.length; i++) {
      this._originalChildren.push(canvasChildren[i]);
      canvasChildren[i].style.display = 'none';
    }

    this._canvas.appendChild(this._wrapper);

    if (this._bus) {
      this._bus.emit('compare:mode-changed', { mode: 'sideBySide' });
    }

    return this._wrapper;
  };

  /**
   * Overlay comparison: stack two versions with adjustable opacity.
   * @param {string} v1 - HTML of version 1 (bottom)
   * @param {string} v2 - HTML of version 2 (top)
   * @param {number} [opacity=0.5] - initial overlay opacity
   * @returns {HTMLElement} the compare wrapper
   */
  CompareEngine.prototype.overlay = function(v1, v2, opacity) {
    this.cleanup();

    this._canvas = this._getCanvas();
    if (!this._canvas) {
      console.warn('[CCCompareEngine] canvas not found');
      return null;
    }

    this._mode = 'overlay';
    this._opacity = (opacity !== undefined) ? opacity : 0.5;

    this._wrapper = document.createElement('div');
    this._wrapper.className = 'cc-compare-wrapper';
    this._wrapper.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:6;';

    // Bottom layer: version 1
    this._pane1 = this._createPane(v1, '版本 1');
    this._pane1.style.cssText += 'position:absolute;top:0;left:0;right:0;bottom:0;';

    // Top layer: version 2 with opacity
    this._pane2 = this._createPane(v2, '版本 2（叠加）');
    this._pane2.style.cssText += 'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'opacity:' + this._opacity + ';pointer-events:none;';

    this._wrapper.appendChild(this._pane1);
    this._wrapper.appendChild(this._pane2);

    // Hide original canvas content
    var canvasChildren = this._canvas.children;
    this._originalChildren = [];
    for (var i = 0; i < canvasChildren.length; i++) {
      this._originalChildren.push(canvasChildren[i]);
      canvasChildren[i].style.display = 'none';
    }

    this._canvas.appendChild(this._wrapper);

    if (this._bus) {
      this._bus.emit('compare:mode-changed', { mode: 'overlay', opacity: this._opacity });
    }

    return this._wrapper;
  };

  /**
   * Set overlay transparency.
   * @param {number} val - opacity from 0 to 1
   */
  CompareEngine.prototype.setOpacity = function(val) {
    this._opacity = Math.max(0, Math.min(1, val));
    if (this._pane2 && this._mode === 'overlay') {
      this._pane2.style.opacity = this._opacity;
    }
    if (this._bus) {
      this._bus.emit('compare:opacity-changed', { opacity: this._opacity });
    }
  };

  /**
   * Toggle diff highlighting on compared panes.
   * Uses CCDOMDiffer if available.
   */
  CompareEngine.prototype.toggleDiffHighlight = function() {
    this._diffHighlight = !this._diffHighlight;

    if (!this._diffHighlight) {
      // Remove all diff highlights
      this._clearDiffHighlights();
      return;
    }

    // Use DOMDiffer if available
    if (!window.CCDOMDiffer) {
      console.warn('[CCCompareEngine] CCDOMDiffer not available for diff highlighting');
      return;
    }

    var differ = new window.CCDOMDiffer();
    var content1 = this._pane1 ? this._pane1.querySelector('.cc-compare-pane > div:last-child') : null;
    var content2 = this._pane2 ? this._pane2.querySelector('.cc-compare-pane > div:last-child') : null;

    if (!content1 || !content2) return;

    var result = differ.diff(content1, content2);
    differ.highlight(result.added, 'added');
    differ.highlight(result.removed, 'removed');
    differ.highlight(result.modified, 'modified');

    if (this._bus) {
      this._bus.emit('compare:diff-toggled', {
        active: this._diffHighlight,
        stats: {
          added: result.added.length,
          removed: result.removed.length,
          modified: result.modified.length
        }
      });
    }
  };

  CompareEngine.prototype._clearDiffHighlights = function() {
    if (!this._wrapper) return;
    var marks = this._wrapper.querySelectorAll('.cc-diff-added,.cc-diff-removed,.cc-diff-modified');
    for (var i = 0; i < marks.length; i++) {
      var el = marks[i];
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.classList.remove('cc-diff-added', 'cc-diff-removed', 'cc-diff-modified');
    }
  };

  /**
   * Clean up and restore single view.
   */
  CompareEngine.prototype.cleanup = function() {
    this._clearDiffHighlights();

    if (this._wrapper && this._wrapper.parentNode) {
      this._wrapper.parentNode.removeChild(this._wrapper);
    }

    // Restore original canvas children
    if (this._originalChildren && this._canvas) {
      for (var i = 0; i < this._originalChildren.length; i++) {
        this._originalChildren[i].style.display = '';
      }
    }

    this._wrapper = null;
    this._pane1 = null;
    this._pane2 = null;
    this._mode = null;
    this._originalChildren = null;
    this._diffHighlight = false;

    if (this._bus) {
      this._bus.emit('compare:mode-changed', { mode: null });
    }
  };

  /**
   * Get current compare mode.
   * @returns {string|null} 'sideBySide' | 'overlay' | null
   */
  CompareEngine.prototype.getMode = function() {
    return this._mode;
  };

  // Export
  window.CCCompareEngine = CompareEngine;
})();
