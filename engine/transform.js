;(function () {
  'use strict';

  var MIN_SIZE = 20;
  var HANDLE_SIZE = 8;
  var ROTATE_HANDLE_OFFSET = 24;

  var RESIZE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  class TransformManager {
    constructor(state, eventBus, domUtils, changeTracker) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
    }

    // ── Resize handles ───────────────────────────────────────

    createResizeHandles() {
      this.removeResizeHandles();

      var el = this.state.selected;
      if (!el) return;

      var self = this;
      RESIZE_DIRS.forEach(function (dir) {
        var handle = document.createElement('div');
        handle.className = 'cc-resize-handle cc-resize-' + dir;
        handle.setAttribute('data-dir', dir);
        handle.style.cssText = 'position:absolute;width:' + HANDLE_SIZE + 'px;height:' +
          HANDLE_SIZE + 'px;background:#fff;border:1.5px solid #1890ff;border-radius:1px;' +
          'z-index:99995;cursor:' + dir + '-resize;';

        handle.addEventListener('mousedown', function (e) {
          e.stopPropagation();
          e.preventDefault();
          self._startResize(e, dir);
        });

        el.appendChild(handle);
      });

      this.positionResizeHandles();
    }

    positionResizeHandles() {
      var el = this.state.selected;
      if (!el) return;

      var w = el.offsetWidth;
      var h = el.offsetHeight;
      var half = HANDLE_SIZE / 2;

      var positions = {
        nw: { left: -half, top: -half },
        n: { left: w / 2 - half, top: -half },
        ne: { left: w - half, top: -half },
        e: { left: w - half, top: h / 2 - half },
        se: { left: w - half, top: h - half },
        s: { left: w / 2 - half, top: h - half },
        sw: { left: -half, top: h - half },
        w: { left: -half, top: h / 2 - half }
      };

      var handles = el.querySelectorAll('.cc-resize-handle');
      handles.forEach(function (h) {
        var dir = h.getAttribute('data-dir');
        var p = positions[dir];
        if (p) {
          h.style.left = p.left + 'px';
          h.style.top = p.top + 'px';
        }
      });
    }

    removeResizeHandles() {
      var el = this.state.selected;
      if (!el) return;
      var handles = el.querySelectorAll('.cc-resize-handle');
      handles.forEach(function (h) { h.remove(); });
    }

    // ── Rotate handle ────────────────────────────────────────

    createRotateHandle() {
      this.removeRotateHandle();

      var el = this.state.selected;
      if (!el) return;

      var handle = document.createElement('div');
      handle.className = 'cc-rotate-handle';
      handle.style.cssText = 'position:absolute;width:14px;height:14px;' +
        'background:#fff;border:2px solid #1890ff;border-radius:50%;' +
        'z-index:99996;cursor:crosshair;left:50%;margin-left:-7px;top:-' +
        ROTATE_HANDLE_OFFSET + 'px;';

      var self = this;
      handle.addEventListener('mousedown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        self._startRotate(e);
      });

      el.appendChild(handle);
    }

    positionRotateHandle() {
      // Position is CSS-driven (relative to selected el), no update needed
    }

    removeRotateHandle() {
      var el = this.state.selected;
      if (!el) return;
      var rh = el.querySelector('.cc-rotate-handle');
      if (rh) rh.remove();
    }

    // ── Drag move ────────────────────────────────────────────

    onDragMoveStart(e) {
      var el = this.state.selected;
      if (!el) return;

      var pos = this.domUtils.getElPosition(el);
      this.state.set('drag', {
        type: 'move',
        el: el,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: pos.left,
        origTop: pos.top
      });

      this.eventBus.emit('drag:move:start', { element: el, x: pos.left, y: pos.top });
    }

    onDragMoveMove(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'move') return;

      var zoom = this.state.zoom || 1;
      var dx = (e.clientX - d.startX) / zoom;
      var dy = (e.clientY - d.startY) / zoom;

      var newLeft = d.origLeft + dx;
      var newTop = d.origTop + dy;

      d.el.style.left = newLeft + 'px';
      d.el.style.top = newTop + 'px';

      this.eventBus.emit('drag:move:progress', { element: d.el, x: newLeft, y: newTop });
    }

    onDragMoveEnd(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'move') return;

      var pos = this.domUtils.getElPosition(d.el);

      if (pos.left !== d.origLeft || pos.top !== d.origTop) {
        this.changeTracker.record('move', {
          element: d.el,
          left: pos.left,
          top: pos.top
        }, {
          element: d.el,
          left: d.origLeft,
          top: d.origTop
        }, { elementId: d.el.id });
      }

      this.eventBus.emit('drag:move:end', { element: d.el, x: pos.left, y: pos.top });
      this.state.set('drag', null);
    }

    // ── Resize internal ──────────────────────────────────────

    _startResize(e, dir) {
      var el = this.state.selected;
      if (!el) return;

      var pos = this.domUtils.getElPosition(el);
      var w = parseFloat(el.style.width) || el.offsetWidth;
      var h = parseFloat(el.style.height) || el.offsetHeight;

      this.state.set('drag', {
        type: 'resize',
        el: el,
        dir: dir,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: pos.left,
        origTop: pos.top,
        origWidth: w,
        origHeight: h
      });
    }

    _doResize(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'resize') return;

      var zoom = this.state.zoom || 1;
      var dx = (e.clientX - d.startX) / zoom;
      var dy = (e.clientY - d.startY) / zoom;
      var dir = d.dir;

      var newLeft = d.origLeft;
      var newTop = d.origTop;
      var newW = d.origWidth;
      var newH = d.origHeight;

      if (dir.indexOf('e') !== -1) {
        newW = Math.max(MIN_SIZE, d.origWidth + dx);
      }
      if (dir.indexOf('w') !== -1) {
        newW = Math.max(MIN_SIZE, d.origWidth - dx);
        newLeft = d.origLeft + (d.origWidth - newW);
      }
      if (dir.indexOf('s') !== -1) {
        newH = Math.max(MIN_SIZE, d.origHeight + dy);
      }
      if (dir.indexOf('n') !== -1) {
        newH = Math.max(MIN_SIZE, d.origHeight - dy);
        newTop = d.origTop + (d.origHeight - newH);
      }

      d.el.style.left = newLeft + 'px';
      d.el.style.top = newTop + 'px';
      d.el.style.width = newW + 'px';
      d.el.style.height = newH + 'px';

      this.positionResizeHandles();
    }

    _endResize(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'resize') return;

      var pos = this.domUtils.getElPosition(d.el);
      var w = parseFloat(d.el.style.width) || d.el.offsetWidth;
      var h = parseFloat(d.el.style.height) || d.el.offsetHeight;

      this.changeTracker.record('resize', {
        element: d.el,
        left: pos.left,
        top: pos.top,
        width: w,
        height: h
      }, {
        element: d.el,
        left: d.origLeft,
        top: d.origTop,
        width: d.origWidth,
        height: d.origHeight
      }, { elementId: d.el.id });

      this.positionResizeHandles();
      this.state.set('drag', null);
    }

    // ── Rotate internal ──────────────────────────────────────

    _startRotate(e) {
      var el = this.state.selected;
      if (!el) return;

      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;

      var currentRotation = this._getRotation(el);

      this.state.set('drag', {
        type: 'rotate',
        el: el,
        cx: cx,
        cy: cy,
        startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
        origRotation: currentRotation
      });
    }

    _doRotate(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'rotate') return;

      var angle = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
      var delta = (angle - d.startAngle) * (180 / Math.PI);
      var rotation = d.origRotation + delta;

      d.el.style.transform = 'rotate(' + rotation + 'deg)';
    }

    _endRotate(e) {
      var d = this.state.get('drag');
      if (!d || d.type !== 'rotate') return;

      var newRotation = this._getRotation(d.el);

      this.changeTracker.record('rotate', {
        element: d.el,
        rotation: newRotation
      }, {
        element: d.el,
        rotation: d.origRotation
      }, { elementId: d.el.id });

      this.state.set('drag', null);
    }

    _getRotation(el) {
      var st = window.getComputedStyle(el);
      var tr = st.transform || st.webkitTransform || '';
      if (!tr || tr === 'none') return 0;
      var vals = tr.match(/matrix\(([^)]+)\)/);
      if (!vals) return 0;
      var parts = vals[1].split(',');
      var a = parseFloat(parts[0]);
      var b = parseFloat(parts[1]);
      return Math.round(Math.atan2(b, a) * (180 / Math.PI));
    }

    // ── Unified drag dispatcher ──────────────────────────────

    handleDragMove(e) {
      var d = this.state.get('drag');
      if (!d) return;

      if (d.type === 'move') this.onDragMoveMove(e);
      else if (d.type === 'resize') this._doResize(e);
      else if (d.type === 'rotate') this._doRotate(e);
    }

    handleDragEnd(e) {
      var d = this.state.get('drag');
      if (!d) return;

      if (d.type === 'move') this.onDragMoveEnd(e);
      else if (d.type === 'resize') this._endResize(e);
      else if (d.type === 'rotate') this._endRotate(e);
    }
  }

  window.CCTransformManager = TransformManager;
})();
