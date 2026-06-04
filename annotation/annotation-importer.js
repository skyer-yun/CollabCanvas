/**
 * CollabCanvas — Annotation Importer (v1.5)
 * Import annotations from Product Copilot format (CSS selector-based)
 * and resolve selectors to canvas coordinates via getBoundingClientRect()
 */
(function () {
  'use strict';

  /**
   * @param {Object} state - CCStateManager instance
   * @param {Object} bus - EventBus instance
   */
  function AnnotationImporter(state, bus) {
    this._state = state;
    this._bus = bus;
  }

  /**
   * Import annotations from Product Copilot JSON format.
   * Copilot format: {pageId: [{id, title, target, content, priority, module, ...}]}
   *
   * @param {Object|string} data - Copilot annotations object or JSON string
   * @param {Object} [options] - {pageIdMap: {copilotPageId: ccPageId}}
   * @returns {{imported: number, skipped: number, errors: Array}}
   */
  AnnotationImporter.prototype.importCopilotFormat = function (data, options) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch (e) { return { imported: 0, skipped: 0, errors: ['Invalid JSON: ' + e.message] }; }
    }

    var opts = options || {};
    var pageIdMap = opts.pageIdMap || {};
    var result = { imported: 0, skipped: 0, errors: [] };
    var annotator = window.__CC && window.__CC.annotator;

    if (!annotator) {
      result.errors.push('Annotator module not available');
      return result;
    }

    var pageIds = Object.keys(data);
    for (var p = 0; p < pageIds.length; p++) {
      var copilotPageId = pageIds[p];
      var ccPageId = pageIdMap[copilotPageId] || copilotPageId;
      var annotations = data[copilotPageId];

      if (!Array.isArray(annotations)) {
        result.skipped++;
        continue;
      }

      for (var i = 0; i < annotations.length; i++) {
        var ann = annotations[i];
        try {
          var coords = this._resolveTarget(ann.target);
          if (!coords) {
            result.skipped++;
            result.errors.push('Cannot resolve target: ' + (ann.target || '(none)'));
            continue;
          }

          annotator.create({
            type: 'text',
            x: coords.x,
            y: coords.y,
            w: coords.w || 120,
            h: coords.h || 40,
            text: ann.content || ann.title || '',
            color: this._priorityToColor(ann.priority),
            status: 'pending',
            assignee: ann.assignee || '',
            module: ann.module || '',
            priority: ann.priority || 'medium',
            requirementType: ann.requirementType || 'functional',
            acceptanceCriteria: ann.acceptanceCriteria || '',
            requirementId: ann.id || '',
            pageId: ccPageId,
            target: ann.target || null
          });
          result.imported++;
        } catch (e) {
          result.skipped++;
          result.errors.push('Error importing annotation: ' + e.message);
        }
      }
    }

    if (this._bus) {
      this._bus.emit('annotation:imported', result);
    }

    return result;
  };

  /**
   * Import a flat array of annotations.
   * Flat format: [{id, title, target, content, pageId, priority, module, ...}]
   *
   * @param {Array|string} data - Flat annotation array or JSON string
   * @param {string} [defaultPageId] - Default page to assign if no pageId in annotation
   * @returns {{imported: number, skipped: number, errors: Array}}
   */
  AnnotationImporter.prototype.importFlatFormat = function (data, defaultPageId) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch (e) { return { imported: 0, skipped: 0, errors: ['Invalid JSON: ' + e.message] }; }
    }

    if (!Array.isArray(data)) {
      return { imported: 0, skipped: 0, errors: ['Expected array, got ' + typeof data] };
    }

    var result = { imported: 0, skipped: 0, errors: [] };
    var annotator = window.__CC && window.__CC.annotator;
    if (!annotator) {
      result.errors.push('Annotator module not available');
      return result;
    }

    var currentPageId = defaultPageId || this._state.get('annotations.currentPageId');

    for (var i = 0; i < data.length; i++) {
      var ann = data[i];
      try {
        var coords = this._resolveTarget(ann.target);

        annotator.create({
          type: ann.type || 'text',
          x: coords ? coords.x : (ann.x || 50),
          y: coords ? coords.y : (ann.y || 50 + i * 60),
          w: ann.w || (coords ? coords.w : 120),
          h: ann.h || (coords ? coords.h : 40),
          text: ann.content || ann.text || ann.title || '',
          color: ann.color || this._priorityToColor(ann.priority),
          status: ann.status || 'pending',
          assignee: ann.assignee || '',
          module: ann.module || '',
          priority: ann.priority || 'medium',
          requirementType: ann.requirementType || 'functional',
          acceptanceCriteria: ann.acceptanceCriteria || '',
          requirementId: ann.id || '',
          pageId: ann.pageId || currentPageId,
          target: ann.target || null
        });
        result.imported++;
      } catch (e) {
        result.skipped++;
        result.errors.push('Error: ' + e.message);
      }
    }

    if (this._bus) {
      this._bus.emit('annotation:imported', result);
    }

    return result;
  };

  /**
   * Import from a feature list (PRD-style).
   * featureList format: [{id, title, description, module, priority, targetPage}]
   *
   * @param {Array|string} features - Feature list array or JSON string
   * @param {Object} [options] - {pageIdMap: {targetPage: ccPageId}}
   * @returns {{imported: number, skipped: number, errors: Array}}
   */
  AnnotationImporter.prototype.importFeatureList = function (features, options) {
    if (typeof features === 'string') {
      try { features = JSON.parse(features); }
      catch (e) { return { imported: 0, skipped: 0, errors: ['Invalid JSON: ' + e.message] }; }
    }

    if (!Array.isArray(features)) {
      return { imported: 0, skipped: 0, errors: ['Expected array'] };
    }

    var opts = options || {};
    var pageIdMap = opts.pageIdMap || {};
    var result = { imported: 0, skipped: 0, errors: [] };
    var annotator = window.__CC && window.__CC.annotator;
    if (!annotator) {
      result.errors.push('Annotator module not available');
      return result;
    }

    for (var i = 0; i < features.length; i++) {
      var feat = features[i];
      var ccPageId = pageIdMap[feat.targetPage] || feat.targetPage || null;

      try {
        annotator.create({
          type: 'text',
          x: 50,
          y: 50 + i * 80,
          w: 200,
          h: 60,
          text: feat.title + (feat.description ? '\n' + feat.description : ''),
          color: this._priorityToColor(feat.priority),
          status: 'pending',
          module: feat.module || '',
          priority: feat.priority || 'medium',
          requirementType: 'functional',
          acceptanceCriteria: feat.acceptanceCriteria || '',
          requirementId: feat.id || '',
          pageId: ccPageId,
          target: null
        });
        result.imported++;
      } catch (e) {
        result.skipped++;
        result.errors.push('Error: ' + e.message);
      }
    }

    if (this._bus) {
      this._bus.emit('annotation:imported', result);
    }

    return result;
  };

  // ── Internal helpers ───────────────────────────────────────────

  /**
   * Resolve a CSS selector to canvas coordinates.
   * @param {string} [selector] - CSS selector
   * @returns {{x: number, y: number, w: number, h: number}|null}
   */
  AnnotationImporter.prototype._resolveTarget = function (selector) {
    if (!selector) return null;

    var el = document.querySelector(selector);
    if (!el) return null;

    var canvas = this._state.get('canvas.canvas');
    if (!canvas) return null;

    var canvasRect = canvas.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();

    // Convert viewport coordinates to canvas-relative coordinates
    var x = elRect.left - canvasRect.left;
    var y = elRect.top - canvasRect.top;

    // Account for zoom and pan
    var zoom = this._state.get('canvas.zoom') || 1;
    var panX = this._state.get('canvas.panX') || 0;
    var panY = this._state.get('canvas.panY') || 0;

    return {
      x: Math.round((x - panX) / zoom),
      y: Math.round((y - panY) / zoom),
      w: Math.round(elRect.width / zoom),
      h: Math.round(elRect.height / zoom)
    };
  };

  /**
   * Map priority to annotation color.
   */
  AnnotationImporter.prototype._priorityToColor = function (priority) {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1677ff';
    }
  };

  window.CCAnnotationImporter = AnnotationImporter;
})();
