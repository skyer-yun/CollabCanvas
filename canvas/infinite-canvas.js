/**
 * CollabCanvas — Infinite Canvas
 * 无限画布：缩放、平移、坐标变换
 * 支持 Space+拖拽平移、Ctrl+滚轮缩放、平滑缩放动画
 */
(function() {
  'use strict';

  // ---------- Constants ----------
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 5;
  var ZOOM_STEP = 0.1;
  var ANIM_DURATION = 200; // ms

  /**
   * @param {StateManager} state
   * @param {EventBus}     eventBus
   * @param {object}       domUtils  — DomUtils.$ / DomUtils.$$ helper
   */
  function InfiniteCanvas(state, eventBus, domUtils) {
    this._state    = state;
    this._bus      = eventBus;
    this._dom      = domUtils;

    this._isPanning   = false;
    this._spaceHeld   = false;
    this._panStart    = { x: 0, y: 0 };
    this._animFrame   = null;
    this._wheelTimer  = null;

    this._boundKeyDown  = this._onKeyDown.bind(this);
    this._boundKeyUp    = this._onKeyUp.bind(this);
    this._boundWheel    = this.handleWheel.bind(this);
  }

  // ---- Public API ----

  /**
   * Apply transform immediately (no animation).
   * @param {number} zoom  scale factor
   * @param {number} panX  horizontal offset (px)
   * @param {number} panY  vertical offset (px)
   */
  InfiniteCanvas.prototype.setTransform = function(zoom, panX, panY) {
    zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this._state.set('canvas.zoom', zoom);
    this._state.set('canvas.panX', panX);
    this._state.set('canvas.panY', panY);
    this._applyToDOM();
  };

  /**
   * Convert screen (client) coordinates to canvas-local coordinates.
   * @param  {number} clientX
   * @param  {number} clientY
   * @return {{ x: number, y: number }}
   */
  InfiniteCanvas.prototype.screenToCanvas = function(clientX, clientY) {
    var canvasEl = this._state.get('canvas.canvas');
    if (!canvasEl) return { x: clientX, y: clientY };

    var rect = canvasEl.getBoundingClientRect();
    var zoom = this._state.get('canvas.zoom') || 1;
    var panX = this._state.get('canvas.panX') || 0;
    var panY = this._state.get('canvas.panY') || 0;

    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top  - panY) / zoom
    };
  };

  /**
   * Set zoom level, keeping current pan position.
   * @param {number} zoom  scale factor
   */
  InfiniteCanvas.prototype.setZoom = function(zoom) {
    var panX = this._state.get('canvas.panX') || 0;
    var panY = this._state.get('canvas.panY') || 0;
    this.setTransform(zoom, panX, panY);
    this._bus.emit('canvas:zoom', { zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM), panX: panX, panY: panY });
  };

  /**
   * Handle a WheelEvent — dispatches to zoom or pan depending on modifier keys.
   * @param {WheelEvent} e
   */
  InfiniteCanvas.prototype.handleWheel = function(e) {
    var isZoom = e.ctrlKey || e.metaKey;

    if (isZoom) {
      e.preventDefault();
      this._zoomAtPoint(e.deltaY, e.clientX, e.clientY);
    }
    // Plain scroll panning is handled by native overflow; no interception needed.
  };

  /**
   * Bind keyboard and wheel listeners. Should be called after canvas DOM is ready.
   */
  InfiniteCanvas.prototype.bindEvents = function() {
    document.addEventListener('keydown', this._boundKeyDown);
    document.addEventListener('keyup',   this._boundKeyUp);

    var wrapper = this._state.get('canvas.wrapper');
    if (wrapper) {
      wrapper.addEventListener('wheel', this._boundWheel, { passive: false });
    }
  };

  /**
   * Remove all listeners.
   */
  InfiniteCanvas.prototype.destroy = function() {
    document.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('keyup',   this._boundKeyUp);

    var wrapper = this._state.get('canvas.wrapper');
    if (wrapper) {
      wrapper.removeEventListener('wheel', this._boundWheel);
    }

    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  };

  // ---- Zoom ----

  InfiniteCanvas.prototype._zoomAtPoint = function(deltaY, clientX, clientY) {
    var zoomOld = this._state.get('canvas.zoom') || 1;
    var panXOld = this._state.get('canvas.panX') || 0;
    var panYOld = this._state.get('canvas.panY') || 0;

    var direction = deltaY < 0 ? 1 : -1;
    var zoomNew = clamp(zoomOld * (1 + direction * ZOOM_STEP), MIN_ZOOM, MAX_ZOOM);

    // Pivot around cursor position so the point under cursor stays fixed
    var canvasEl = this._state.get('canvas.canvas');
    if (!canvasEl) return;
    var rect = canvasEl.getBoundingClientRect();

    var cx = clientX - rect.left;
    var cy = clientY - rect.top;

    var panXNew = cx - (cx - panXOld) * (zoomNew / zoomOld);
    var panYNew = cy - (cy - panYOld) * (zoomNew / zoomOld);

    this._animateTo(zoomNew, panXNew, panYNew);
  };

  InfiniteCanvas.prototype._animateTo = function(targetZoom, targetPanX, targetPanY) {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);

    var self       = this;
    var startZoom  = this._state.get('canvas.zoom')  || 1;
    var startPanX  = this._state.get('canvas.panX')   || 0;
    var startPanY  = this._state.get('canvas.panY')   || 0;
    var startTime  = performance.now();

    function tick(now) {
      var elapsed  = now - startTime;
      var progress = Math.min(elapsed / ANIM_DURATION, 1);
      // Ease-out cubic
      var t = 1 - Math.pow(1 - progress, 3);

      var z = startZoom + (targetZoom - startZoom) * t;
      var x = startPanX + (targetPanX - startPanX) * t;
      var y = startPanY + (targetPanY - startPanY) * t;

      self._state.set('canvas.zoom', z);
      self._state.set('canvas.panX', x);
      self._state.set('canvas.panY', y);
      self._applyToDOM();

      if (progress < 1) {
        self._animFrame = requestAnimationFrame(tick);
      } else {
        self._animFrame = null;
        self._bus.emit('canvas:zoom', { zoom: targetZoom, panX: targetPanX, panY: targetPanY });
      }
    }

    this._animFrame = requestAnimationFrame(tick);
  };

  // ---- Pan (Space + drag) ----

  InfiniteCanvas.prototype._onKeyDown = function(e) {
    if (e.code === 'Space' && !this._spaceHeld) {
      this._spaceHeld = true;
      this._startPanWatch();
    }
  };

  InfiniteCanvas.prototype._onKeyUp = function(e) {
    if (e.code === 'Space') {
      this._spaceHeld = false;
      this._stopPanWatch();
    }
  };

  InfiniteCanvas.prototype._startPanWatch = function() {
    var wrapper = this._state.get('canvas.wrapper');
    if (!wrapper) return;

    wrapper.style.cursor = 'grab';

    this._boundPanStart = this._onPanStart.bind(this);
    this._boundPanMove  = this._onPanMove.bind(this);
    this._boundPanEnd   = this._onPanEnd.bind(this);

    wrapper.addEventListener('mousedown', this._boundPanStart);
    document.addEventListener('mousemove', this._boundPanMove);
    document.addEventListener('mouseup',   this._boundPanEnd);
  };

  InfiniteCanvas.prototype._stopPanWatch = function() {
    var wrapper = this._state.get('canvas.wrapper');
    if (wrapper) wrapper.style.cursor = '';

    if (this._boundPanStart) {
      var w = wrapper;
      if (w) w.removeEventListener('mousedown', this._boundPanStart);
      document.removeEventListener('mousemove', this._boundPanMove);
      document.removeEventListener('mouseup',   this._boundPanEnd);
    }
    this._isPanning = false;
  };

  InfiniteCanvas.prototype._onPanStart = function(e) {
    if (!this._spaceHeld) return;
    e.preventDefault();
    this._isPanning = true;
    this._panStart.x = e.clientX;
    this._panStart.y = e.clientY;

    var wrapper = this._state.get('canvas.wrapper');
    if (wrapper) wrapper.style.cursor = 'grabbing';
  };

  InfiniteCanvas.prototype._onPanMove = function(e) {
    if (!this._isPanning) return;

    var dx = e.clientX - this._panStart.x;
    var dy = e.clientY - this._panStart.y;
    this._panStart.x = e.clientX;
    this._panStart.y = e.clientY;

    var panX = (this._state.get('canvas.panX') || 0) + dx;
    var panY = (this._state.get('canvas.panY') || 0) + dy;

    this._state.set('canvas.panX', panX);
    this._state.set('canvas.panY', panY);
    this._applyToDOM();
  };

  InfiniteCanvas.prototype._onPanEnd = function() {
    this._isPanning = false;
    var wrapper = this._state.get('canvas.wrapper');
    if (wrapper && this._spaceHeld) wrapper.style.cursor = 'grab';

    this._bus.emit('canvas:pan', {
      zoom: this._state.get('canvas.zoom'),
      panX: this._state.get('canvas.panX'),
      panY: this._state.get('canvas.panY')
    });
  };

  // ---- DOM Apply ----

  InfiniteCanvas.prototype._applyToDOM = function() {
    var canvasEl = this._state.get('canvas.canvas');
    if (!canvasEl) return;

    var z = this._state.get('canvas.zoom') || 1;
    var x = this._state.get('canvas.panX') || 0;
    var y = this._state.get('canvas.panY') || 0;

    canvasEl.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
    canvasEl.style.transformOrigin = '0 0';
  };

  // ---- Helpers ----

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ---- Export ----
  window.CCInfiniteCanvas = InfiniteCanvas;
})();
