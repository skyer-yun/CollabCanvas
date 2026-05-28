;(function () {
  'use strict';

  // Classes and attributes to strip when exporting
  var EDITOR_ARTIFACTS = [
    'cc-el-select', 'cc-el-hover', 'cc-el-multi',
    'cc-inline-edit', 'cc-resize-handle', 'cc-rotate-handle',
    'cc-smart-guide', 'cc-group', 'cc-el'
  ];
  var EDITOR_SELECTORS =
    '.cc-resize-handle,.cc-rotate-handle,.cc-smart-guide,#cc-tooltip';

  var HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

  class ExportEngine {
    constructor(state, eventBus, domUtils) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
    }

    // ── Export as instructions (markdown) ────────────────────

    /**
     * Format all recorded changes as a markdown document.
     */
    exportInstructions() {
      var changes = this.state.changes || [];
      var lines = [];

      lines.push('# CollabCanvas - Change Log');
      lines.push('');
      lines.push('Generated: ' + new Date().toLocaleString());
      lines.push('Total changes: ' + changes.length);
      lines.push('');
      lines.push('---');
      lines.push('');

      changes.forEach(function (entry, idx) {
        lines.push('## ' + (idx + 1) + '. ' + _formatProp(entry.prop));
        lines.push('');
        lines.push('- **Time**: ' + new Date(entry.timestamp).toLocaleTimeString());
        if (entry.elementId) {
          lines.push('- **Element**: #' + entry.elementId);
        }
        lines.push('');
        lines.push('**New value**:');
        lines.push('```');
        lines.push(_stringify(entry.newVal));
        lines.push('```');
        lines.push('');
        lines.push('**Previous value**:');
        lines.push('```');
        lines.push(_stringify(entry.oldVal));
        lines.push('```');
        lines.push('');
        lines.push('---');
        lines.push('');
      });

      return lines.join('\n');
    }

    // ── Save as HTML file ────────────────────────────────────

    /**
     * Clean the canvas of all editor artifacts and trigger a download as .html.
     */
    saveFile() {
      var canvas = this.state.canvas;
      if (!canvas) return;

      // Clone the canvas to avoid modifying the live DOM
      var clone = canvas.cloneNode(true);

      // Remove editor-only elements
      EDITOR_SELECTORS.split(',').forEach(function (sel) {
        clone.querySelectorAll(sel).forEach(function (el) { el.remove(); });
      });

      // Remove editor classes
      var allEls = clone.querySelectorAll('*');
      allEls.forEach(function (el) {
        EDITOR_ARTIFACTS.forEach(function (cls) {
          el.classList.remove(cls);
        });
        // Remove contentEditable
        el.removeAttribute('contenteditable');
      });

      // Build full HTML document
      var html =
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n<head>\n' +
        '<meta charset="UTF-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '<title>CollabCanvas Export</title>\n' +
        '<style>\n' +
        '  body { margin: 0; background: #f5f5f5; display: flex; justify-content: center; padding: 20px; }\n' +
        '  .cc-canvas { position: relative; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.1); }\n' +
        '</style>\n' +
        '</head>\n<body>\n' +
        clone.outerHTML + '\n' +
        '</body>\n</html>';

      this._downloadBlob(html, 'collabcanvas-export.html', 'text/html');

      this.eventBus.emit('export:save', { format: 'html' });
    }

    // ── Export as PNG ────────────────────────────────────────

    /**
     * Load html2canvas from CDN (if not already loaded), capture the canvas,
     * and trigger a download as .png.
     */
    exportPNG() {
      var self = this;
      var canvas = this.state.canvas;

      if (!canvas) return;

      this._loadHTML2Canvas()
        .then(function () {
          // Temporarily hide editor overlays
          var overlays = canvas.querySelectorAll(EDITOR_SELECTORS);
          overlays.forEach(function (el) { el.style.display = 'none'; });

          return window.html2canvas(canvas, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
          }).then(function (rendered) {
            // Restore overlays
            overlays.forEach(function (el) { el.style.display = ''; });

            rendered.toBlob(function (blob) {
              if (!blob) return;
              var url = URL.createObjectURL(blob);
              self._downloadBlob(url, 'collabcanvas-export.png', 'image/png');
              URL.revokeObjectURL(url);

              self.eventBus.emit('export:png', { format: 'png' });
            }, 'image/png');
          }).catch(function (err) {
            // Restore overlays even on error
            overlays.forEach(function (el) { el.style.display = ''; });
            throw err;
          });
        })
        .catch(function (err) {
          console.error('[ExportEngine] PNG export failed:', err);
          self.eventBus.emit('export:error', { format: 'png', error: err.message });
        });
    }

    // ── Helpers ──────────────────────────────────────────────

    _loadHTML2Canvas() {
      return new Promise(function (resolve, reject) {
        if (window.html2canvas) {
          resolve();
          return;
        }

        var script = document.createElement('script');
        script.src = HTML2CANVAS_CDN;
        script.onload = resolve;
        script.onerror = function () {
          reject(new Error('Failed to load html2canvas from CDN'));
        };
        document.head.appendChild(script);
      });
    }

    _downloadBlob(content, filename, mimeType) {
      var blob;
      if (content instanceof Blob) {
        blob = content;
      } else if (typeof content === 'string' && content.startsWith('blob:')) {
        // URL string - use directly
        var a = document.createElement('a');
        a.href = content;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      } else {
        blob = new Blob([content], { type: mimeType });
      }

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke after a short delay to ensure download starts
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }

  // ── Utility functions ─────────────────────────────────────

  function _formatProp(prop) {
    var labels = {
      css: 'Style Change',
      resize: 'Resize',
      text: 'Text Edit',
      move: 'Move',
      rotate: 'Rotate',
      delete: 'Delete',
      insert: 'Insert',
      duplicate: 'Duplicate',
      group: 'Group',
      ungroup: 'Ungroup',
      zindex: 'Z-Order Change',
      align: 'Align'
    };
    return labels[prop] || prop;
  }

  function _stringify(val) {
    if (val === null || val === undefined) return '(none)';
    if (typeof val === 'string') return val;
    if (val instanceof HTMLElement) return val.outerHTML.substring(0, 200);
    try {
      var s = JSON.stringify(val, function (key, v) {
        if (v instanceof HTMLElement) return '[HTMLElement:' + (v.id || v.tagName) + ']';
        return v;
      }, 2);
      return s;
    } catch (e) {
      return String(val);
    }
  }

  window.CCExportEngine = ExportEngine;
})();
