/**
 * CollabCanvas — Token Extractor
 * Scan page styles and extract design tokens (CSS variables)
 */
(function() {
  'use strict';

  var CATEGORIES = {
    colors:    /color|bg|background|fill|border-color|stroke/i,
    typography: /font|line-height|letter-spacing|text/i,
    spacing:   /margin|padding|gap|width|height|top|left|right|bottom/i,
    shadows:   /shadow/i,
    radius:    /radius|border-radius/i
  };

  function TokenExtractor() {}

  /**
   * Extract all design tokens from the current page.
   * Scans <style> blocks and getComputedStyle for CSS variables.
   * @returns {Object} categorized token map
   */
  TokenExtractor.prototype.extractFromPage = function() {
    var vars = this.extractCSSVariables();
    return this.categorize(vars);
  };

  /**
   * Find all CSS custom properties (--*) from stylesheets and inline styles.
   * @returns {Array} [{name, value, source}]
   */
  TokenExtractor.prototype.extractCSSVariables = function() {
    var found = {};
    var self = this;

    // 1. Scan document stylesheets
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      try {
        var rules = sheets[i].cssRules || sheets[i].rules;
        if (!rules) continue;
        for (var j = 0; j < rules.length; j++) {
          var rule = rules[j];
          if (rule.selectorText && rule.style) {
            self._extractVarsFromStyle(rule.style, found, 'stylesheet');
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }

    // 2. Scan <style> elements directly
    var styleEls = document.querySelectorAll('style');
    for (var k = 0; k < styleEls.length; k++) {
      var text = styleEls[k].textContent;
      self._parseCSSText(text, found);
    }

    // 3. Scan :root computed style for CSS variables
    var rootStyle = getComputedStyle(document.documentElement);
    var allProps = this._getCustomProperties(rootStyle);
    for (var m = 0; m < allProps.length; m++) {
      var name = allProps[m];
      if (!found[name]) {
        found[name] = {
          name: name,
          value: rootStyle.getPropertyValue(name).trim(),
          source: 'computed'
        };
      }
    }

    // Convert to array
    var result = [];
    for (var key in found) {
      if (found.hasOwnProperty(key)) result.push(found[key]);
    }
    return result;
  };

  /**
   * Extract variables from a CSSStyleDeclaration.
   */
  TokenExtractor.prototype._extractVarsFromStyle = function(style, found, source) {
    for (var i = 0; i < style.length; i++) {
      var prop = style[i];
      if (prop.indexOf('--') === 0) {
        found[prop] = {
          name: prop,
          value: style.getPropertyValue(prop).trim(),
          source: source
        };
      }
    }
  };

  /**
   * Parse raw CSS text for variable declarations.
   */
  TokenExtractor.prototype._parseCSSText = function(text, found) {
    var re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      found[match[1]] = {
        name: match[1],
        value: match[2].trim(),
        source: 'style-element'
      };
    }
  };

  /**
   * Get custom property names from a computed style.
   */
  TokenExtractor.prototype._getCustomProperties = function(computedStyle) {
    var props = [];
    // Iterate all properties looking for -- prefix
    for (var i = 0; i < computedStyle.length; i++) {
      if (computedStyle[i].indexOf('--') === 0) {
        props.push(computedStyle[i]);
      }
    }
    return props;
  };

  /**
   * Categorize tokens into colors/typography/spacing/shadows/radius.
   * @param {Array} tokens - [{name, value, source}]
   * @returns {Object} {colors:[], typography:[], spacing:[], shadows:[], radius:[]}
   */
  TokenExtractor.prototype.categorize = function(tokens) {
    var result = {
      colors: [],
      typography: [],
      spacing: [],
      shadows: [],
      radius: []
    };

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var categorized = false;

      for (var cat in CATEGORIES) {
        if (!CATEGORIES.hasOwnProperty(cat)) continue;
        if (CATEGORIES[cat].test(token.name)) {
          result[cat].push(token);
          categorized = true;
          break;
        }
      }

      // Default: try to categorize by value
      if (!categorized) {
        if (/^#|rgb|hsl/.test(token.value)) {
          result.colors.push(token);
        } else if (/^\d+(\.\d+)?px$|^\d+(\.\d+)?rem$|^\d+(\.\d+)?em$/.test(token.value)) {
          result.spacing.push(token);
        } else {
          // Uncategorized goes to spacing as fallback
          result.spacing.push(token);
        }
      }
    }

    return result;
  };

  // Export
  window.CCTokenExtractor = TokenExtractor;
})();
