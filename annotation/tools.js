/**
 * CollabCanvas — Annotation Tools
 * 9 annotation tools: arrow, rect, text, measure, sticky, number, brush, mosaic, region
 * SVG overlay rendering with pointer events
 */
(function() {
  'use strict';

  var TOOLS = ['arrow', 'rect', 'text', 'measure', 'sticky', 'number', 'brush', 'mosaic', 'region'];

  function AnnotationTools(state, eventBus) {
    this._state = state;
    this._bus = eventBus;
    this._active = null;
    this._overlay = null;
    this._drawing = false;
    this._startX = 0;
    this._startY = 0;
    this._currentEl = null;
    this._brushPoints = [];
  }

  // ---- Overlay management ----

  AnnotationTools.prototype.getOverlay = function() {
    if (this._overlay) return this._overlay;
    var existing = document.querySelector('.cc-annotation-overlay');
    if (existing) {
      this._overlay = existing;
      return existing;
    }
    return null;
  };

  AnnotationTools.prototype.setOverlay = function(svg) {
    this._overlay = svg;
  };

  // ---- Tool activation ----

  AnnotationTools.prototype.activate = function(toolName) {
    if (TOOLS.indexOf(toolName) === -1) {
      console.warn('[CCAnnotationTools] unknown tool:', toolName);
      return;
    }
    this.deactivate();
    this._active = toolName;
    this._state.set('annotations.currentTool', toolName);

    var overlay = this.getOverlay();
    if (overlay) {
      overlay.style.pointerEvents = 'auto';
      overlay.style.cursor = 'crosshair';
    }
  };

  AnnotationTools.prototype.deactivate = function() {
    this._active = null;
    this._drawing = false;
    this._currentEl = null;
    this._brushPoints = [];
    this._state.set('annotations.currentTool', null);

    var overlay = this.getOverlay();
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.cursor = 'default';
    }
  };

  AnnotationTools.prototype.getActiveTool = function() {
    return this._active;
  };

  // ---- Pointer events ----

  AnnotationTools.prototype.onMouseDown = function(e) {
    if (!this._active) return;
    this._drawing = true;

    var pt = this._toSVG(e);
    this._startX = pt.x;
    this._startY = pt.y;

    switch (this._active) {
      case 'arrow':   this._startArrow(pt); break;
      case 'rect':    this._startRect(pt); break;
      case 'text':    this._startText(pt); break;
      case 'measure': this._startMeasure(pt); break;
      case 'sticky':  this._startSticky(pt); break;
      case 'number':  this._startNumber(pt); break;
      case 'brush':   this._startBrush(pt); break;
      case 'mosaic':  this._startMosaic(pt); break;
      case 'region':  this._startRegion(pt); break;
    }
  };

  AnnotationTools.prototype.onMouseMove = function(e) {
    if (!this._drawing || !this._active) return;
    var pt = this._toSVG(e);

    switch (this._active) {
      case 'arrow':   this._moveArrow(pt); break;
      case 'rect':    this._moveRect(pt); break;
      case 'measure': this._moveMeasure(pt); break;
      case 'brush':   this._moveBrush(pt); break;
      case 'mosaic':  this._moveMosaic(pt); break;
      case 'region':  this._moveRegion(pt); break;
    }
  };

  AnnotationTools.prototype.onMouseUp = function(e) {
    if (!this._drawing || !this._active) return;
    var pt = this._toSVG(e);

    this._drawing = false;

    switch (this._active) {
      case 'arrow':   this._endArrow(pt); break;
      case 'rect':    this._endRect(pt); break;
      case 'measure': this._endMeasure(pt); break;
      case 'brush':   this._endBrush(pt); break;
      case 'mosaic':  this._endMosaic(pt); break;
      case 'region':  this._endRegion(pt); break;
    }

    if (this._bus && this._currentEl) {
      this._bus.emit('annotation:tool-complete', {
        tool: this._active,
        element: this._currentEl,
        start: { x: this._startX, y: this._startY },
        end: { x: pt.x, y: pt.y }
      });
    }

    this._currentEl = null;
  };

  // ---- SVG coordinate helper ----

  AnnotationTools.prototype._toSVG = function(e) {
    var svg = this.getOverlay();
    if (!svg) return { x: e.clientX, y: e.clientY };
    var pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    var ctm = svg.getScreenCTM();
    if (ctm) {
      pt = pt.matrixTransform(ctm.inverse());
    }
    return { x: pt.x, y: pt.y };
  };

  AnnotationTools.prototype._svgEl = function(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  };

  // ---- Arrow tool ----

  AnnotationTools.prototype._startArrow = function(pt) {
    var g = this._svgEl('g', { 'class': 'cc-ann-arrow' });
    var line = this._svgEl('line', {
      x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y,
      stroke: '#ff4d4f', 'stroke-width': 3
    });
    var defs = this._svgEl('defs', {});
    var marker = this._svgEl('marker', {
      id: 'cc-arrowhead-' + Date.now(), markerWidth: 12, markerHeight: 9,
      refX: 12, refY: 4.5, orient: 'auto'
    });
    var polygon = this._svgEl('polygon', { points: '0 0, 12 4.5, 0 9', fill: '#ff4d4f' });
    marker.appendChild(polygon);
    defs.appendChild(marker);
    line.setAttribute('marker-end', 'url(#' + marker.getAttribute('id') + ')');
    g.appendChild(defs);
    g.appendChild(line);
    var text = this._svgEl('text', {
      x: pt.x, y: pt.y - 10, 'font-size': 13, fill: '#ff4d4f', 'font-weight': '600', 'pointer-events': 'none'
    });
    g.appendChild(text);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  AnnotationTools.prototype._moveArrow = function(pt) {
    if (!this._currentEl) return;
    var line = this._currentEl.querySelector('line');
    if (line) { line.setAttribute('x2', pt.x); line.setAttribute('y2', pt.y); }
  };

  AnnotationTools.prototype._endArrow = function(pt) {
    // arrow stays as-is; user can type label via annotation edit
  };

  // ---- Rect tool ----

  AnnotationTools.prototype._startRect = function(pt) {
    var g = this._svgEl('g', { 'class': 'cc-ann-rect' });
    var rect = this._svgEl('rect', {
      x: pt.x, y: pt.y, width: 0, height: 0,
      fill: 'rgba(22,119,255,0.12)', stroke: '#1677ff', 'stroke-width': 2.5, rx: 4
    });
    var text = this._svgEl('text', {
      x: pt.x, y: pt.y, 'font-size': 13, fill: '#1677ff', 'font-weight': '500', 'pointer-events': 'none'
    });
    g.appendChild(rect);
    g.appendChild(text);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  AnnotationTools.prototype._moveRect = function(pt) {
    if (!this._currentEl) return;
    var rect = this._currentEl.querySelector('rect');
    if (!rect) return;
    var x = Math.min(this._startX, pt.x);
    var y = Math.min(this._startY, pt.y);
    var w = Math.abs(pt.x - this._startX);
    var h = Math.abs(pt.y - this._startY);
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    var text = this._currentEl.querySelector('text');
    if (text) { text.setAttribute('x', x + 6); text.setAttribute('y', y + 16); }
  };

  AnnotationTools.prototype._endRect = function() {};

  // ---- Text tool ----

  AnnotationTools.prototype._startText = function(pt) {
    // Prevent mouseup from emitting tool-complete immediately
    this._drawing = false;
    // Guard: don't create another text if one is being edited
    if (this._currentEl) return;

    // Temporarily disable overlay so contentEditable div can receive focus
    var overlay = this.getOverlay();
    if (overlay) {
      overlay.style.pointerEvents = 'none';
    }

    var div = document.createElement('div');
    div.className = 'cc-ann-text';
    div.contentEditable = true;
    div.style.cssText = 'position:absolute;left:' + pt.x + 'px;top:' + pt.y +
      'px;min-width:80px;min-height:28px;padding:6px 10px;font-size:14px;' +
      'color:#1f1f1f;background:rgba(255,255,255,0.95);border:2px solid #8c8c8c;' +
      'border-radius:4px;outline:none;z-index:20;white-space:pre-wrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    var svg = this.getOverlay();
    svg.parentNode.appendChild(div);
    div.focus();
    this._currentEl = div;

    var self = this;
    var startX = this._startX;
    var startY = this._startY;
    div.addEventListener('blur', function() {
      var text = div.textContent.trim();
      if (text === '') {
        if (div.parentNode) div.parentNode.removeChild(div);
      } else if (self._bus) {
        self._bus.emit('annotation:tool-complete', {
          tool: 'text',
          element: div,
          start: { x: startX, y: startY },
          end: { x: startX + 60, y: startY + 20 }
        });
      }
      self._currentEl = null;
      // Restore overlay pointer events
      var ol = self.getOverlay();
      if (ol && self._active) {
        ol.style.pointerEvents = 'auto';
        ol.style.cursor = 'crosshair';
      }
    });
  };

  // ---- Measure tool ----

  AnnotationTools.prototype._startMeasure = function(pt) {
    var g = this._svgEl('g', { 'class': 'cc-ann-measure' });
    var line = this._svgEl('line', {
      x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y,
      stroke: '#faad14', 'stroke-width': 1.5, 'stroke-dasharray': '5,4'
    });
    var text = this._svgEl('text', {
      x: pt.x, y: pt.y - 8, 'font-size': 13, fill: '#d48806', 'font-weight': '600',
      'pointer-events': 'none'
    });
    var dot1 = this._svgEl('circle', { cx: pt.x, cy: pt.y, r: 4, fill: '#faad14' });
    var dot2 = this._svgEl('circle', { cx: pt.x, cy: pt.y, r: 4, fill: '#faad14' });
    g.appendChild(line);
    g.appendChild(dot1);
    g.appendChild(dot2);
    g.appendChild(text);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  AnnotationTools.prototype._moveMeasure = function(pt) {
    if (!this._currentEl) return;
    var line = this._currentEl.querySelector('line');
    if (line) { line.setAttribute('x2', pt.x); line.setAttribute('y2', pt.y); }
    var dots = this._currentEl.querySelectorAll('circle');
    if (dots[1]) { dots[1].setAttribute('cx', pt.x); dots[1].setAttribute('cy', pt.y); }
    var text = this._currentEl.querySelector('text');
    if (text) {
      var dx = pt.x - this._startX;
      var dy = pt.y - this._startY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      text.textContent = Math.round(dist) + 'px';
      text.setAttribute('x', (this._startX + pt.x) / 2);
      text.setAttribute('y', (this._startY + pt.y) / 2 - 8);
    }
  };

  AnnotationTools.prototype._endMeasure = function() {};

  // ---- Sticky tool ----

  AnnotationTools.prototype._startSticky = function(pt) {
    // Prevent mouseup from emitting tool-complete immediately
    this._drawing = false;
    // Guard: don't create another sticky if one is being edited
    if (this._currentEl) return;

    // Temporarily disable overlay so contentEditable div can receive focus
    var overlay = this.getOverlay();
    if (overlay) {
      overlay.style.pointerEvents = 'none';
    }

    var div = document.createElement('div');
    div.className = 'cc-ann-sticky';
    div.style.cssText = 'position:absolute;left:' + pt.x + 'px;top:' + pt.y +
      'px;width:180px;min-height:100px;padding:14px;font-size:14px;' +
      'background:#fffbe6;border:2px solid #ffe58f;border-radius:6px;' +
      'box-shadow:0 3px 12px rgba(0,0,0,0.15);z-index:20;outline:none;' +
      'color:#1f1f1f;word-wrap:break-word;';
    div.contentEditable = true;
    div.textContent = '备注...';
    var svg = this.getOverlay();
    svg.parentNode.appendChild(div);
    div.focus();

    // Select all text on first focus
    var range = document.createRange();
    range.selectNodeContents(div);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    this._currentEl = div;

    var self = this;
    var startX = this._startX;
    var startY = this._startY;
    div.addEventListener('blur', function() {
      var text = div.textContent.trim();
      if (text === '' || text === '备注...') {
        if (div.parentNode) div.parentNode.removeChild(div);
      } else if (self._bus) {
        self._bus.emit('annotation:tool-complete', {
          tool: 'sticky',
          element: div,
          start: { x: startX, y: startY },
          end: { x: startX + 180, y: startY + 100 }
        });
      }
      self._currentEl = null;
      // Restore overlay pointer events
      var ol = self.getOverlay();
      if (ol && self._active) {
        ol.style.pointerEvents = 'auto';
        ol.style.cursor = 'crosshair';
      }
    });
  };

  // ---- Number tool ----

  AnnotationTools.prototype._startNumber = function(pt) {
    var g = this._svgEl('g', { 'class': 'cc-ann-number' });
    var list = this._state.get('annotations.list') || [];
    var num = list.length + 1;
    var circle = this._svgEl('circle', {
      cx: pt.x, cy: pt.y, r: 16, fill: '#1677ff', stroke: '#fff', 'stroke-width': 2
    });
    var text = this._svgEl('text', {
      x: pt.x, y: pt.y + 5, 'font-size': 13, fill: '#fff', 'text-anchor': 'middle',
      'font-weight': '600', 'pointer-events': 'none'
    });
    text.textContent = num;
    g.appendChild(circle);
    g.appendChild(text);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  // ---- Brush tool ----

  AnnotationTools.prototype._startBrush = function(pt) {
    this._brushPoints = [{ x: pt.x, y: pt.y }];
    var path = this._svgEl('path', {
      d: 'M' + pt.x + ' ' + pt.y,
      fill: 'none', stroke: '#ff4d4f', 'stroke-width': 3,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    this.getOverlay().appendChild(path);
    this._currentEl = path;
  };

  AnnotationTools.prototype._moveBrush = function(pt) {
    if (!this._currentEl) return;
    this._brushPoints.push({ x: pt.x, y: pt.y });
    var d = 'M' + this._brushPoints[0].x + ' ' + this._brushPoints[0].y;
    for (var i = 1; i < this._brushPoints.length; i++) {
      d += ' L' + this._brushPoints[i].x + ' ' + this._brushPoints[i].y;
    }
    this._currentEl.setAttribute('d', d);
  };

  AnnotationTools.prototype._endBrush = function() {
    this._brushPoints = [];
  };

  // ---- Mosaic tool ----

  AnnotationTools.prototype._startMosaic = function(pt) {
    var NS = 'http://www.w3.org/2000/svg';
    var g = this._svgEl('g', { 'class': 'cc-ann-mosaic' });
    var fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('x', pt.x);
    fo.setAttribute('y', pt.y);
    fo.setAttribute('width', 0);
    fo.setAttribute('height', 0);
    var canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
    fo.appendChild(canvas);
    g.appendChild(fo);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  AnnotationTools.prototype._moveMosaic = function(pt) {
    if (!this._currentEl) return;
    var fo = this._currentEl.querySelector('foreignObject');
    if (!fo) return;
    var x = Math.min(this._startX, pt.x);
    var y = Math.min(this._startY, pt.y);
    var w = Math.abs(pt.x - this._startX);
    var h = Math.abs(pt.y - this._startY);
    fo.setAttribute('x', x);
    fo.setAttribute('y', y);
    fo.setAttribute('width', w);
    fo.setAttribute('height', h);
    // Draw pixelated mosaic pattern
    var c = fo.querySelector('canvas');
    if (c && w > 4 && h > 4) {
      c.width = Math.max(8, Math.floor(w / 8));
      c.height = Math.max(8, Math.floor(h / 8));
      var ctx = c.getContext('2d');
      // Sample from underlying page content
      ctx.fillStyle = '#888';
      for (var px = 0; px < c.width; px++) {
        for (var py = 0; py < c.height; py++) {
          var shade = Math.floor(Math.random() * 60) + 100;
          ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  };

  AnnotationTools.prototype._endMosaic = function() {
    // Finalize: try to capture real pixels from the page under the mosaic area
    var g = this._currentEl;
    if (!g) return;
    var fo = g.querySelector('foreignObject');
    if (!fo) return;
    var x = parseFloat(fo.getAttribute('x')) || 0;
    var y = parseFloat(fo.getAttribute('y')) || 0;
    var w = parseFloat(fo.getAttribute('width')) || 0;
    var h = parseFloat(fo.getAttribute('height')) || 0;
    if (w < 4 || h < 4) return;

    var c = fo.querySelector('canvas');
    if (!c) return;
    var blockSize = 8;
    c.width = Math.max(4, Math.floor(w / blockSize));
    c.height = Math.max(4, Math.floor(h / blockSize));

    // Use a temporary canvas to sample the page
    try {
      var svg = this.getOverlay();
      var canvasEl = svg ? svg.parentElement : null;
      if (canvasEl) {
        // Sample from the real canvas content
        var zoom = this._state.get('canvas.zoom') || 1;
        var panX = this._state.get('canvas.panX') || 0;
        var panY = this._state.get('canvas.panY') || 0;
        var rect = canvasEl.getBoundingClientRect();
        var ctx = c.getContext('2d');
        ctx.drawImage(canvasEl,
          (x - panX / zoom) + rect.left, (y - panY / zoom) + rect.top, w / zoom, h / zoom,
          0, 0, c.width, c.height
        );
      }
    } catch (e) {
      // Cross-origin or other error: keep random mosaic
    }
  };

  // ---- Region tool (drag-to-create dashed rect with label) ----

  AnnotationTools.prototype._startRegion = function(pt) {
    var g = this._svgEl('g', { 'class': 'cc-ann-region' });
    var rect = this._svgEl('rect', {
      x: pt.x, y: pt.y, width: 0, height: 0,
      fill: 'rgba(114,46,209,0.08)', stroke: '#722ed1', 'stroke-width': 2, 'stroke-dasharray': '6,3', rx: 6
    });
    g.appendChild(rect);
    this.getOverlay().appendChild(g);
    this._currentEl = g;
  };

  AnnotationTools.prototype._moveRegion = function(pt) {
    if (!this._currentEl) return;
    var rect = this._currentEl.querySelector('rect');
    if (!rect) return;
    var x = Math.min(this._startX, pt.x);
    var y = Math.min(this._startY, pt.y);
    var w = Math.abs(pt.x - this._startX);
    var h = Math.abs(pt.y - this._startY);
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
  };

  AnnotationTools.prototype._endRegion = function() {
    // Region stays as-is; user can add label via annotation edit
  };

  // Export
  window.CCAnnotationTools = AnnotationTools;
})();
