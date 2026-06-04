/**
 * CollabCanvas — Design Audit (v1.5)
 * Detect style deviations from active design system in imported HTML
 */
(function () {
  'use strict';

  /**
   * @param {Object} state - CCStateManager instance
   * @param {Object} bus - EventBus instance
   */
  function DesignAudit(state, bus) {
    this._state = state;
    this._bus = bus;
  }

  /**
   * Run a design audit on the current canvas content.
   * Compares computed styles against the active design system tokens.
   *
   * @param {Object} [options] - {scope: 'all'|'selected', maxDeviations: 50}
   * @returns {{deviations: Array, summary: Object}}
   */
  DesignAudit.prototype.audit = function (options) {
    var opts = options || {};
    var activeDS = this._state.get('settings.activeDesignSystem');
    if (!activeDS || typeof CCDesignSystems === 'undefined') {
      return { deviations: [], summary: { error: 'No active design system' } };
    }

    var systems = new CCDesignSystems(this._state, this._bus);
    var tokens = systems.getTokens(activeDS);
    if (!tokens || tokens.length === 0) {
      return { deviations: [], summary: { error: 'No tokens loaded' } };
    }

    // Build value→token lookup map
    var colorMap = {};
    var sizeMap = {};
    var shadowMap = {};
    var radiusMap = {};

    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var val = (t.value || '').toLowerCase().trim();
      if (t.category === 'colors') colorMap[val] = t.name;
      else if (t.category === 'spacing') sizeMap[val] = t.name;
      else if (t.category === 'shadows') shadowMap[val] = t.name;
      else if (t.category === 'radius') radiusMap[val] = t.name;
    }

    // Also add computed CSS variable values to the map
    var rootStyle = getComputedStyle(document.documentElement);
    var tokenNames = Object.keys(colorMap);
    for (var j = 0; j < tokenNames.length; j++) {
      var computed = rootStyle.getPropertyValue(tokenNames[j]).trim().toLowerCase();
      if (computed && !colorMap[computed]) {
        colorMap[computed] = tokenNames[j];
      }
    }

    // Collect elements to audit
    var canvas = this._state.get('canvas.canvas');
    if (!canvas) return { deviations: [], summary: { error: 'No canvas' } };

    var scope = opts.scope || 'all';
    var elements;
    if (scope === 'selected') {
      var sel = this._state.get('selection.current');
      elements = sel ? [sel] : [];
    } else {
      elements = canvas.querySelectorAll('*');
    }

    var deviations = [];
    var maxDeviations = opts.maxDeviations || 50;

    for (var k = 0; k < elements.length && deviations.length < maxDeviations; k++) {
      var el = elements[k];
      if (el.classList && (
        el.classList.contains('cc-annotation') ||
        el.classList.contains('cc-overlay') ||
        el.tagName === 'svg' ||
        el.tagName === 'path'
      )) continue;

      var style = getComputedStyle(el);

      // Check colors
      this._checkColor(style.color, 'color', el, colorMap, deviations);
      this._checkColor(style.backgroundColor, 'background-color', el, colorMap, deviations);
      this._checkColor(style.borderColor, 'border-color', el, colorMap, deviations);

      // Check border-radius
      this._checkValue(style.borderRadius, 'border-radius', el, radiusMap, deviations);

      // Check box-shadow
      if (style.boxShadow && style.boxShadow !== 'none') {
        this._checkValue(style.boxShadow, 'box-shadow', el, shadowMap, deviations);
      }
    }

    var summary = this._buildSummary(deviations, tokens.length);
    return { deviations: deviations, summary: summary };
  };

  /**
   * Check a color value against the design system color map.
   */
  DesignAudit.prototype._checkColor = function (value, prop, el, colorMap, deviations) {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return;

    var normalized = this._normalizeColor(value);
    if (!normalized) return;

    // Skip if value is already a CSS variable reference
    if (normalized.indexOf('var(') !== -1) return;

    // Skip if this is a token value (exact match)
    if (colorMap[normalized]) return;

    // Also check hex equivalents
    var hex = this._rgbToHex(normalized);
    if (hex && colorMap[hex]) return;

    deviations.push({
      element: this._describeElement(el),
      property: prop,
      value: value,
      suggestion: this._suggestClosest(normalized, colorMap),
      severity: 'warning'
    });
  };

  /**
   * Check a generic value against a token map.
   */
  DesignAudit.prototype._checkValue = function (value, prop, el, tokenMap, deviations) {
    if (!value || value === 'none' || value === 'auto' || value === '0px') return;
    if (value.indexOf('var(') !== -1) return;

    var normalized = value.toLowerCase().trim();
    if (tokenMap[normalized]) return;

    deviations.push({
      element: this._describeElement(el),
      property: prop,
      value: value,
      suggestion: tokenMap[normalized] || null,
      severity: 'info'
    });
  };

  /**
   * Normalize a color value for comparison.
   */
  DesignAudit.prototype._normalizeColor = function (value) {
    if (!value) return null;
    var v = value.toLowerCase().trim();
    // Normalize rgb/rgba
    v = v.replace(/\s+/g, '');
    return v;
  };

  /**
   * Convert rgb() to hex for comparison.
   */
  DesignAudit.prototype._rgbToHex = function (rgb) {
    if (!rgb) return null;
    var match = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!match) return null;
    var r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    var g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    var b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  };

  /**
   * Suggest the closest design system token for a given value.
   */
  DesignAudit.prototype._suggestClosest = function (value, colorMap) {
    var keys = Object.keys(colorMap);
    if (keys.length === 0) return null;

    // Simple: just return the first token that seems relevant
    // A more sophisticated approach would use color distance
    var hex = this._rgbToHex(value);
    if (hex && colorMap[hex]) return 'var(' + colorMap[hex] + ')';

    return null;
  };

  /**
   * Describe an element for the audit report.
   */
  DesignAudit.prototype._describeElement = function (el) {
    var desc = el.tagName.toLowerCase();
    if (el.id) desc += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) desc += '.' + classes.join('.');
    }
    return desc;
  };

  /**
   * Build a summary of the audit results.
   */
  DesignAudit.prototype._buildSummary = function (deviations, totalTokens) {
    var byProperty = {};
    var bySeverity = { warning: 0, info: 0 };

    for (var i = 0; i < deviations.length; i++) {
      var d = deviations[i];
      byProperty[d.property] = (byProperty[d.property] || 0) + 1;
      if (bySeverity[d.severity] !== undefined) bySeverity[d.severity]++;
    }

    return {
      totalDeviations: deviations.length,
      totalTokens: totalTokens,
      byProperty: byProperty,
      bySeverity: bySeverity,
      compliance: totalTokens > 0 ? Math.round((1 - deviations.length / (totalTokens * 3)) * 100) : 100
    };
  };

  window.CCDesignAudit = DesignAudit;
})();
