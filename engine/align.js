;(function () {
  'use strict';

  var GUIDE_EDGE_COLOR = '#e03030';
  var GUIDE_CENTER_COLOR = '#30c060';
  var GUIDE_DISTANCE_COLOR = '#888';

  class AlignManager {
    constructor(state, eventBus, domUtils, changeTracker) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
      this._guideEls = [];
    }

    // ── Bounds helpers ───────────────────────────────────────

    /**
     * Get bounding box of an element in canvas coordinates.
     */
    getElementBounds(el) {
      var pos = this.domUtils.getElPosition(el);
      var w = parseFloat(el.style.width) || el.offsetWidth;
      var h = parseFloat(el.style.height) || el.offsetHeight;
      return {
        left: pos.left,
        top: pos.top,
        right: pos.left + w,
        bottom: pos.top + h,
        width: w,
        height: h,
        cx: pos.left + w / 2,
        cy: pos.top + h / 2
      };
    }

    /**
     * Get the union bounding box of multiple elements.
     */
    getSelectionBounds(els) {
      if (!els || els.length === 0) return null;
      var self = this;
      var b = null;
      els.forEach(function (el) {
        var eb = self.getElementBounds(el);
        if (!b) {
          b = { left: eb.left, top: eb.top, right: eb.right, bottom: eb.bottom };
        } else {
          if (eb.left < b.left) b.left = eb.left;
          if (eb.top < b.top) b.top = eb.top;
          if (eb.right > b.right) b.right = eb.right;
          if (eb.bottom > b.bottom) b.bottom = eb.bottom;
        }
      });
      b.width = b.right - b.left;
      b.height = b.bottom - b.top;
      b.cx = b.left + b.width / 2;
      b.cy = b.top + b.height / 2;
      return b;
    }

    // ── Align selected elements ──────────────────────────────

    /**
     * Align the currently multi-selected elements in a direction.
     * @param {string} direction - left|right|center-h|top|bottom|center-v
     */
    alignElements(direction) {
      var multi = this.state.get('selection.multiSelect') || [];
      if (multi.length < 2) return;

      var bounds = this.getSelectionBounds(multi);
      if (!bounds) return;

      var self = this;
      multi.forEach(function (el) {
        var eb = self.getElementBounds(el);
        var oldLeft = eb.left;
        var oldTop = eb.top;
        var newLeft = oldLeft;
        var newTop = oldTop;

        switch (direction) {
          case 'left':
            newLeft = bounds.left;
            break;
          case 'right':
            newLeft = bounds.right - eb.width;
            break;
          case 'center-h':
            newLeft = bounds.cx - eb.width / 2;
            break;
          case 'top':
            newTop = bounds.top;
            break;
          case 'bottom':
            newTop = bounds.bottom - eb.height;
            break;
          case 'center-v':
            newTop = bounds.cy - eb.height / 2;
            break;
        }

        if (newLeft !== oldLeft) {
          el.style.left = newLeft + 'px';
        }
        if (newTop !== oldTop) {
          el.style.top = newTop + 'px';
        }

        self.changeTracker.record('align', {
          direction: direction,
          element: el,
          left: newLeft,
          top: newTop
        }, {
          element: el,
          left: oldLeft,
          top: oldTop
        }, { elementId: el.id });
      });

      this.eventBus.emit('align:applied', { direction: direction, elements: multi.slice() });
    }

    // ── Smart guides ─────────────────────────────────────────

    /**
     * Calculate snap guides for a dragged element against all other canvas children.
     * Returns an object { snapX, snapY, guides[] } or null if no alignment.
     */
    calcSmartGuides(dragEl) {
      var canvas = this.state.canvas;
      if (!canvas) return null;

      var threshold = this.state.get('snapThreshold') || 5;
      var drag = this.getElementBounds(dragEl);

      var guides = [];
      var snapX = null;
      var snapY = null;

      var children = canvas.children;
      for (var i = 0; i < children.length; i++) {
        var sib = children[i];
        if (sib === dragEl) continue;

        var sibB = this.getElementBounds(sib);

        // Horizontal checks
        this._checkAxis(drag.left, drag.right, drag.cx,
          sibB.left, sibB.right, sibB.cx,
          'x', threshold, guides, function (val) {
            if (snapX === null) snapX = val;
          });

        // Vertical checks
        this._checkAxis(drag.top, drag.bottom, drag.cy,
          sibB.top, sibB.bottom, sibB.cy,
          'y', threshold, guides, function (val) {
            if (snapY === null) snapY = val;
          });
      }

      return { snapX: snapX, snapY: snapY, guides: guides };
    }

    _checkAxis(dStart, dEnd, dCenter, sStart, sEnd, sCenter, axis, threshold, guides, onSnap) {
      // Edge-to-edge checks
      var pairs = [
        { dv: dStart, sv: sStart, type: 'edge' },
        { dv: dStart, sv: sEnd, type: 'edge' },
        { dv: dEnd, sv: sStart, type: 'edge' },
        { dv: dEnd, sv: sEnd, type: 'edge' },
        // Center-to-center
        { dv: dCenter, sv: sCenter, type: 'center' },
        // Edge-to-center
        { dv: dStart, sv: sCenter, type: 'edge' },
        { dv: dEnd, sv: sCenter, type: 'edge' },
        { dv: dCenter, sv: sStart, type: 'center' },
        { dv: dCenter, sv: sEnd, type: 'center' }
      ];

      pairs.forEach(function (p) {
        var diff = Math.abs(p.dv - p.sv);
        if (diff <= threshold) {
          var snapVal = p.sv;
          guides.push({ axis: axis, pos: p.sv, type: p.type });
          onSnap(snapVal);
        }
      });
    }

    /**
     * Render guide lines on the canvas overlay.
     */
    showSmartGuides(dragEl) {
      this.clearSmartGuides();

      var result = this.calcSmartGuides(dragEl);
      if (!result || result.guides.length === 0) return;

      var canvas = this.state.canvas;
      var zoom = this.state.zoom || 1;
      var self = this;

      // Deduplicate guides by axis+pos
      var seen = {};
      var unique = [];
      result.guides.forEach(function (g) {
        var key = g.axis + ':' + g.pos;
        if (!seen[key]) {
          seen[key] = true;
          unique.push(g);
        }
      });

      unique.forEach(function (g) {
        var line = document.createElement('div');
        line.className = 'cc-smart-guide';
        var color = g.type === 'center' ? GUIDE_CENTER_COLOR : GUIDE_EDGE_COLOR;

        if (g.axis === 'x') {
          line.style.cssText = 'position:absolute;top:0;bottom:0;left:' +
            (g.pos * zoom) + 'px;width:1px;background:' + color +
            ';opacity:0.6;pointer-events:none;z-index:99990;';
        } else {
          line.style.cssText = 'position:absolute;left:0;right:0;top:' +
            (g.pos * zoom) + 'px;height:1px;background:' + color +
            ';opacity:0.6;pointer-events:none;z-index:99990;';
        }

        canvas.appendChild(line);
        self._guideEls.push(line);
      });
    }

    /**
     * Remove all rendered guide lines.
     */
    clearSmartGuides() {
      this._guideEls.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      this._guideEls = [];
    }

    /**
     * Apply a snap position to a dragged element.
     * @param {HTMLElement} dragEl
     * @param {object} snap - { snapX, snapY } from calcSmartGuides
     */
    applySnap(dragEl, snap) {
      if (!snap) return;

      var pos = this.domUtils.getElPosition(dragEl);
      var w = parseFloat(dragEl.style.width) || dragEl.offsetWidth;
      var h = parseFloat(dragEl.style.height) || dragEl.offsetHeight;

      if (snap.snapX !== null) {
        // Determine which edge matched and adjust
        dragEl.style.left = snap.snapX + 'px';
      }
      if (snap.snapY !== null) {
        dragEl.style.top = snap.snapY + 'px';
      }
    }
  }

  window.CCAlignManager = AlignManager;
})();
