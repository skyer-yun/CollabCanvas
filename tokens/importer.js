/**
 * CollabCanvas — Token Importer
 * Import design tokens from CSS text, JSON, or preset templates
 */
(function() {
  'use strict';

  /**
   * Preset token templates for popular design systems.
   */
  var PRESETS = {
    'ant-design': {
      colors: [
        { name: '--ant-primary', value: '#1677ff' },
        { name: '--ant-primary-hover', value: '#4096ff' },
        { name: '--ant-success', value: '#52c41a' },
        { name: '--ant-warning', value: '#faad14' },
        { name: '--ant-error', value: '#ff4d4f' },
        { name: '--ant-text', value: '#1f1f1f' },
        { name: '--ant-text-secondary', value: '#8c8c8c' },
        { name: '--ant-border', value: '#e8e8e8' },
        { name: '--ant-bg', value: '#ffffff' },
        { name: '--ant-bg-secondary', value: '#f5f5f5' }
      ],
      typography: [
        { name: '--ant-font-size-sm', value: '12px' },
        { name: '--ant-font-size-base', value: '14px' },
        { name: '--ant-font-size-lg', value: '16px' },
        { name: '--ant-font-family', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
        { name: '--ant-line-height', value: '1.5715' }
      ],
      spacing: [
        { name: '--ant-spacing-xs', value: '4px' },
        { name: '--ant-spacing-sm', value: '8px' },
        { name: '--ant-spacing-md', value: '16px' },
        { name: '--ant-spacing-lg', value: '24px' },
        { name: '--ant-spacing-xl', value: '32px' }
      ],
      shadows: [
        { name: '--ant-shadow-sm', value: '0 1px 2px rgba(0,0,0,0.06)' },
        { name: '--ant-shadow-md', value: '0 4px 12px rgba(0,0,0,0.08)' }
      ],
      radius: [
        { name: '--ant-radius-sm', value: '4px' },
        { name: '--ant-radius-md', value: '6px' },
        { name: '--ant-radius-lg', value: '8px' }
      ]
    },
    'tailwind': {
      colors: [
        { name: '--tw-blue-500', value: '#3b82f6' },
        { name: '--tw-green-500', value: '#22c55e' },
        { name: '--tw-red-500', value: '#ef4444' },
        { name: '--tw-yellow-500', value: '#eab308' },
        { name: '--tw-gray-500', value: '#6b7280' },
        { name: '--tw-gray-900', value: '#111827' }
      ],
      typography: [
        { name: '--tw-text-xs', value: '12px' },
        { name: '--tw-text-sm', value: '14px' },
        { name: '--tw-text-base', value: '16px' },
        { name: '--tw-text-lg', value: '18px' }
      ],
      spacing: [
        { name: '--tw-spacing-1', value: '4px' },
        { name: '--tw-spacing-2', value: '8px' },
        { name: '--tw-spacing-4', value: '16px' },
        { name: '--tw-spacing-8', value: '32px' }
      ],
      shadows: [
        { name: '--tw-shadow', value: '0 1px 3px rgba(0,0,0,0.12)' },
        { name: '--tw-shadow-md', value: '0 4px 6px rgba(0,0,0,0.1)' }
      ],
      radius: [
        { name: '--tw-rounded', value: '4px' },
        { name: '--tw-rounded-md', value: '6px' },
        { name: '--tw-rounded-lg', value: '8px' }
      ]
    },
    'element-plus': {
      colors: [
        { name: '--el-primary', value: '#409eff' },
        { name: '--el-success', value: '#67c23a' },
        { name: '--el-warning', value: '#e6a23c' },
        { name: '--el-danger', value: '#f56c6c' },
        { name: '--el-text-primary', value: '#303133' },
        { name: '--el-border', value: '#dcdfe6' }
      ],
      typography: [
        { name: '--el-font-size-base', value: '14px' },
        { name: '--el-font-size-sm', value: '13px' },
        { name: '--el-font-size-lg', value: '16px' }
      ],
      spacing: [
        { name: '--el-spacing-sm', value: '8px' },
        { name: '--el-spacing-md', value: '16px' },
        { name: '--el-spacing-lg', value: '24px' }
      ],
      shadows: [
        { name: '--el-shadow-base', value: '0 2px 4px rgba(0,0,0,0.12)' }
      ],
      radius: [
        { name: '--el-border-radius-base', value: '4px' },
        { name: '--el-border-radius-sm', value: '2px' }
      ]
    }
  };

  function TokenImporter() {
    this._designSystems = null; // Set by main.js after CCDesignSystems instantiation
  }

  /**
   * Parse CSS variable declarations from text.
   * Format: --name: value;
   * @param {string} text - CSS text content
   * @returns {Array} normalized token array [{name, value, category}]
   */
  TokenImporter.prototype.importCSS = function(text) {
    if (!text) return [];

    var tokens = [];
    var re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
    var match;

    while ((match = re.exec(text)) !== null) {
      var name = match[1].trim();
      var value = match[2].trim();
      tokens.push({
        name: name,
        value: value,
        category: this._guessCategory(name, value)
      });
    }

    return tokens;
  };

  /**
   * Parse a JSON token object.
   * Format: {"colors": {"primary": "#1677ff"}, "spacing": {"sm": "8px"}}
   * @param {Object|string} json - token map or JSON string
   * @returns {Array} normalized token array
   */
  TokenImporter.prototype.importJSON = function(json) {
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch (e) {
        console.error('[CCTokenImporter] invalid JSON:', e);
        return [];
      }
    }

    var tokens = [];
    for (var category in json) {
      if (!json.hasOwnProperty(category)) continue;
      var group = json[category];
      if (typeof group !== 'object') continue;

      for (var name in group) {
        if (!group.hasOwnProperty(name)) continue;
        tokens.push({
          name: '--' + category + '-' + name,
          value: String(group[name]),
          category: category
        });
      }
    }

    return tokens;
  };

  /**
   * Get a preset template by name.
   * v1.4: Delegates to CCDesignSystems first, falls back to embedded PRESETS.
   * @param {string} presetName - 'ant-design' | 'tailwind' | 'element-plus' | any DS id
   * @returns {Array} normalized token array
   */
  TokenImporter.prototype.getPreset = function(presetName) {
    // v1.4: Try CCDesignSystems (6 built-in)
    if (this._designSystems) {
      var dsTokens = this._designSystems.getTokens(presetName);
      if (dsTokens) return dsTokens;
    }

    // Map old preset names to new DS ids
    var mapped = presetName;
    if (presetName === 'ant-design') mapped = 'ant-design-pro';

    var preset = PRESETS[mapped];
    if (!preset) {
      console.warn('[CCTokenImporter] unknown preset:', presetName);
      return [];
    }

    var tokens = [];
    for (var category in preset) {
      if (!preset.hasOwnProperty(category)) continue;
      var items = preset[category];
      for (var i = 0; i < items.length; i++) {
        tokens.push({
          name: items[i].name,
          value: items[i].value,
          category: category
        });
      }
    }

    return tokens;
  };

  /**
   * Get list of available preset names.
   * v1.4: Merges embedded + CCDesignSystems systems.
   * @returns {Array<{id: string, name: string}>}
   */
  TokenImporter.prototype.listPresets = function() {
    var result = [];
    var seen = {};

    // CCDesignSystems first (6 systems)
    if (this._designSystems) {
      var systems = this._designSystems.listSystems();
      for (var i = 0; i < systems.length; i++) {
        result.push({ id: systems[i].id, name: systems[i].name });
        seen[systems[i].id] = true;
      }
    }

    // Embedded PRESETS (3 systems)
    for (var key in PRESETS) {
      if (PRESETS.hasOwnProperty(key) && !seen[key]) {
        result.push({ id: key, name: key });
      }
    }

    return result;
  };

  /**
   * v1.4: Auto-detect and import from text (CSS/JSON/Markdown).
   * Delegates to CCDesignSystems.importAuto().
   * @param {string} text - File content
   * @param {string} [filename] - Filename for format hint
   * @returns {Array|null} flat token array or null
   */
  TokenImporter.prototype.importAuto = function(text, filename) {
    if (this._designSystems) {
      var parsed = this._designSystems.importAuto(text, filename);
      if (parsed) {
        var flat = [];
        var cats = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
        for (var i = 0; i < cats.length; i++) {
          var items = parsed.tokens[cats[i]];
          if (items) {
            for (var j = 0; j < items.length; j++) {
              flat.push({ name: items[j].name, value: items[j].value, category: cats[i] });
            }
          }
        }
        return flat;
      }
    }
    // Fallback: try JSON then CSS
    if (filename && filename.endsWith('.json')) {
      return this.importJSON(text);
    }
    return this.importCSS(text);
  };

  /**
   * Guess category from variable name and value.
   */
  TokenImporter.prototype._guessCategory = function(name, value) {
    if (/color|bg|background|fill/i.test(name) || /^#|rgb|hsl/.test(value)) return 'colors';
    if (/font|text|line-height|letter/i.test(name)) return 'typography';
    if (/shadow/i.test(name) || /shadow/i.test(value)) return 'shadows';
    if (/radius/i.test(name)) return 'radius';
    if (/margin|padding|gap|spacing|width|height/i.test(name)) return 'spacing';
    if (/px|rem|em|%/.test(value)) return 'spacing';
    return 'spacing'; // default fallback
  };

  // Export
  window.CCTokenImporter = TokenImporter;
})();
