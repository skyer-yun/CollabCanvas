/**
 * CollabCanvas — Annotation Renderer
 * Creates and manages SVG overlay for annotation visuals
 */
(function() {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var OVERLAY_CLASS = 'cc-annotation-overlay';

  function AnnotationRenderer(state) {
    this._state = state;
    this._overlay = null;
    this._elements = {};
  }

  /**
   * Create the SVG overlay on top of the canvas.
   * @param {HTMLElement} canvas - the canvas container element
   * @returns {SVGSVGElement} the created overlay
   */
  AnnotationRenderer.prototype.createOverlay = function(canvas) {
    // Remove existing overlay if any
    this.clear();

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', OVERLAY_CLASS);
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;overflow:visible;z-index:10;';

    canvas.style.position = 'relative';
    canvas.appendChild(svg);

    this._overlay = svg;
    return svg;
  };

  /**
   * Get the current overlay element.
   * @returns {SVGSVGElement|null}
   */
  AnnotationRenderer.prototype.getOverlay = function() {
    return this._overlay;
  };

  /**
   * Render an annotation onto the overlay.
   * @param {Object} ann - annotation data {id, type, x, y, w, h, text, color, ...}
   * @returns {SVGElement|HTMLElement} the rendered element
   */
  AnnotationRenderer.prototype.render = function(ann) {
    if (!this._overlay) return null;
    if (this._elements[ann.id]) {
      this.remove(ann.id);
    }

    var el;

    switch (ann.type) {
      case 'rect':
        el = this._renderRect(ann);
        break;
      case 'arrow':
        el = this._renderArrow(ann);
        break;
      case 'measure':
        el = this._renderMeasure(ann);
        break;
      case 'number':
        el = this._renderNumber(ann);
        break;
      case 'text':
        el = this._renderText(ann);
        break;
      case 'sticky':
        el = this._renderSticky(ann);
        break;
      case 'brush':
        el = this._renderBrush(ann);
        break;
      case 'mosaic':
        el = this._renderMosaic(ann);
        break;
      default:
        el = this._renderRect(ann);
    }

    if (el) {
      el.setAttribute('data-ann-id', ann.id);
      this._overlay.appendChild(el);
      this._elements[ann.id] = el;
    }

    return el;
  };

  AnnotationRenderer.prototype._svgEl = function(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  };

  AnnotationRenderer.prototype._renderRect = function(ann) {
    var g = this._svgEl('g', {});
    var r = this._svgEl('rect', {
      x: ann.x, y: ann.y, width: ann.w, height: ann.h,
      fill: this._hexToRGBA(ann.color || '#1677ff', 0.12),
      stroke: ann.color || '#1677ff', 'stroke-width': 2.5, rx: 4
    });
    g.appendChild(r);
    if (ann.text) {
      var t = this._svgEl('text', {
        x: ann.x + 6, y: ann.y + 16, 'font-size': 13,
        fill: ann.color || '#1677ff', 'font-weight': '500'
      });
      t.textContent = ann.text;
      g.appendChild(t);
    }
    return g;
  };

  AnnotationRenderer.prototype._renderArrow = function(ann) {
    var g = this._svgEl('g', {});
    var defs = this._svgEl('defs', {});
    var marker = this._svgEl('marker', {
      id: 'cc-arrowhead-rendered-' + ann.id, markerWidth: 12, markerHeight: 9,
      refX: 12, refY: 4.5, orient: 'auto'
    });
    var polygon = this._svgEl('polygon', { points: '0 0, 12 4.5, 0 9', fill: ann.color || '#ff4d4f' });
    marker.appendChild(polygon);
    defs.appendChild(marker);
    g.appendChild(defs);
    var line = this._svgEl('line', {
      x1: ann.x, y1: ann.y, x2: ann.x + ann.w, y2: ann.y + ann.h,
      stroke: ann.color || '#ff4d4f', 'stroke-width': 3
    });
    line.setAttribute('marker-end', 'url(#cc-arrowhead-rendered-' + ann.id + ')');
    g.appendChild(line);
    if (ann.text) {
      var t = this._svgEl('text', {
        x: (ann.x + ann.x + ann.w) / 2, y: ann.y + ann.h / 2 - 10,
        'font-size': 13, fill: ann.color || '#ff4d4f', 'font-weight': '600', 'text-anchor': 'middle'
      });
      t.textContent = ann.text;
      g.appendChild(t);
    }
    return g;
  };

  AnnotationRenderer.prototype._renderMeasure = function(ann) {
    var g = this._svgEl('g', {});
    var line = this._svgEl('line', {
      x1: ann.x, y1: ann.y, x2: ann.x + ann.w, y2: ann.y + ann.h,
      stroke: '#faad14', 'stroke-width': 1.5, 'stroke-dasharray': '5,4'
    });
    g.appendChild(line);
    // Distance label
    var dx = ann.w || 0;
    var dy = ann.h || 0;
    var dist = Math.round(Math.sqrt(dx * dx + dy * dy));
    var label = this._svgEl('text', {
      x: ann.x + dx / 2, y: ann.y + dy / 2 - 8, 'font-size': 13,
      fill: '#d48806', 'font-weight': '600', 'text-anchor': 'middle'
    });
    label.textContent = dist + 'px';
    g.appendChild(label);
    return g;
  };

  AnnotationRenderer.prototype._renderNumber = function(ann) {
    var g = this._svgEl('g', {});
    var c = this._svgEl('circle', {
      cx: ann.x, cy: ann.y, r: 16,
      fill: ann.color || '#1677ff', stroke: '#fff', 'stroke-width': 2
    });
    g.appendChild(c);
    if (ann.text) {
      var t = this._svgEl('text', {
        x: ann.x, y: ann.y + 5, 'font-size': 13, fill: '#fff',
        'text-anchor': 'middle', 'font-weight': '600'
      });
      t.textContent = ann.text;
      g.appendChild(t);
    }
    return g;
  };

  AnnotationRenderer.prototype._renderText = function(ann) {
    var g = this._svgEl('g', {});
    var t = this._svgEl('text', {
      x: ann.x, y: ann.y, 'font-size': 14, fill: '#1f1f1f', 'font-weight': '500'
    });
    t.textContent = ann.text || '';
    g.appendChild(t);
    return g;
  };

  AnnotationRenderer.prototype._renderSticky = function(ann) {
    var g = this._svgEl('g', {});
    var r = this._svgEl('rect', {
      x: ann.x, y: ann.y, width: ann.w || 180, height: ann.h || 100,
      fill: '#fffbe6', stroke: '#ffe58f', 'stroke-width': 2, rx: 6
    });
    g.appendChild(r);
    if (ann.text) {
      var t = this._svgEl('text', {
        x: ann.x + 10, y: ann.y + 20, 'font-size': 14, fill: '#1f1f1f'
      });
      t.textContent = ann.text;
      g.appendChild(t);
    }
    return g;
  };

  AnnotationRenderer.prototype._renderBrush = function(ann) {
    var g = this._svgEl('g', {});
    if (ann.text) {
      var p = this._svgEl('path', {
        d: ann.text, fill: 'none', stroke: ann.color || '#ff4d4f',
        'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      });
      g.appendChild(p);
    }
    return g;
  };

  AnnotationRenderer.prototype._renderMosaic = function(ann) {
    var NS = 'http://www.w3.org/2000/svg';
    var g = this._svgEl('g', { 'class': 'cc-ann-mosaic' });
    var w = ann.w || 80;
    var h = ann.h || 60;
    var fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('x', ann.x);
    fo.setAttribute('y', ann.y);
    fo.setAttribute('width', w);
    fo.setAttribute('height', h);
    var c = document.createElement('canvas');
    c.width = Math.max(4, Math.floor(w / 8));
    c.height = Math.max(4, Math.floor(h / 8));
    c.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
    // Fill with gray mosaic pattern
    var ctx = c.getContext('2d');
    for (var px = 0; px < c.width; px++) {
      for (var py = 0; py < c.height; py++) {
        var shade = Math.floor(Math.random() * 60) + 100;
        ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
        ctx.fillRect(px, py, 1, 1);
      }
    }
    fo.appendChild(c);
    g.appendChild(fo);
    // Border
    var border = this._svgEl('rect', {
      x: ann.x, y: ann.y, width: w, height: h,
      fill: 'none', stroke: '#ff4d4f', 'stroke-width': 1, 'stroke-dasharray': '3,2', rx: 2
    });
    g.appendChild(border);
    return g;
  };

  /**
   * Highlight a specific annotation.
   * @param {string} id - annotation id
   */
  AnnotationRenderer.prototype.highlight = function(id) {
    // Remove previous highlights
    this._clearHighlights();

    var el = this._elements[id];
    if (!el) return;

    el.classList.add('cc-ann-highlight');
    el.style.filter = 'drop-shadow(0 0 4px rgba(22,119,255,0.6))';
  };

  AnnotationRenderer.prototype._clearHighlights = function() {
    if (!this._overlay) return;
    var highlighted = this._overlay.querySelectorAll('.cc-ann-highlight');
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove('cc-ann-highlight');
      highlighted[i].style.filter = '';
    }
  };

  /**
   * Remove an annotation visual by id.
   * @param {string} id
   */
  AnnotationRenderer.prototype.remove = function(id) {
    var el = this._elements[id];
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    delete this._elements[id];
  };

  /**
   * Remove all annotation visuals from the overlay.
   */
  AnnotationRenderer.prototype.clear = function() {
    if (this._overlay) {
      while (this._overlay.firstChild) {
        this._overlay.removeChild(this._overlay.firstChild);
      }
    }
    this._elements = {};
  };

  /**
   * Helper: hex color to rgba string.
   */
  AnnotationRenderer.prototype._hexToRGBA = function(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  };

  // Export
  window.CCAnnotationRenderer = AnnotationRenderer;
})();
