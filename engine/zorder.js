;(function () {
  'use strict';

  class ZOrderManager {
    constructor(state, eventBus, domUtils, changeTracker) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
    }

    /**
     * Bring element to the very top of the stacking order.
     */
    bringToFront(el) {
      if (!el) el = this.state.selected;
      if (!el) return;

      var max = this.getMaxZIndex();
      var newZ = max + 1;
      var oldZ = this._getZIndex(el);

      el.style.zIndex = newZ;
      this._recordZIndexChange(el, oldZ, newZ);
    }

    /**
     * Send element to the very bottom of the stacking order.
     */
    sendToBack(el) {
      if (!el) el = this.state.selected;
      if (!el) return;

      var min = this.getMinZIndex();
      var newZ = min - 1;
      var oldZ = this._getZIndex(el);

      el.style.zIndex = newZ;
      this._recordZIndexChange(el, oldZ, newZ);
    }

    /**
     * Bring element one step forward.
     */
    bringForward(el) {
      if (!el) el = this.state.selected;
      if (!el) return;

      var oldZ = this._getZIndex(el);
      var newZ = oldZ + 1;
      el.style.zIndex = newZ;
      this._recordZIndexChange(el, oldZ, newZ);
    }

    /**
     * Send element one step backward.
     */
    sendBackward(el) {
      if (!el) el = this.state.selected;
      if (!el) return;

      var oldZ = this._getZIndex(el);
      var newZ = oldZ - 1;
      el.style.zIndex = newZ;
      this._recordZIndexChange(el, oldZ, newZ);
    }

    /**
     * Get the maximum z-index among canvas children.
     */
    getMaxZIndex() {
      var canvas = this.state.canvas;
      if (!canvas) return 0;

      var max = 0;
      var children = canvas.children;
      for (var i = 0; i < children.length; i++) {
        var z = this._getZIndex(children[i]);
        if (z > max) max = z;
      }
      return max;
    }

    /**
     * Get the minimum z-index among canvas children.
     */
    getMinZIndex() {
      var canvas = this.state.canvas;
      if (!canvas) return 0;

      var min = 0;
      var children = canvas.children;
      for (var i = 0; i < children.length; i++) {
        var z = this._getZIndex(children[i]);
        if (z < min) min = z;
      }
      return min;
    }

    // ── Internal ─────────────────────────────────────────────

    _getZIndex(el) {
      return parseInt(el.style.zIndex, 10) || 0;
    }

    _recordZIndexChange(el, oldZ, newZ) {
      this.changeTracker.record('zindex', {
        element: el,
        zIndex: newZ
      }, {
        element: el,
        zIndex: oldZ
      }, { elementId: el.id });

      this.eventBus.emit('zorder:changed', {
        element: el,
        oldZIndex: oldZ,
        newZIndex: newZ
      });
    }
  }

  window.CCZOrderManager = ZOrderManager;
})();
