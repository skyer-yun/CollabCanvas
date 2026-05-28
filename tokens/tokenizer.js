/**
 * CollabCanvas — Tokenizer
 * Manage design tokens: add, remove, update, apply, list
 */
(function() {
  'use strict';

  var CATEGORIES = ['colors', 'typography', 'spacing', 'shadows', 'radius'];

  function Tokenizer(state) {
    this._state = state;
    this._nextId = 1;
  }

  /**
   * Generate unique token ID.
   */
  Tokenizer.prototype._genId = function() {
    return 'token-' + (this._nextId++);
  };

  /**
   * Add a design token.
   * @param {string} category - colors|typography|spacing|shadows|radius
   * @param {string} name - display name
   * @param {string} value - CSS value
   * @returns {Object} the created token
   */
  Tokenizer.prototype.add = function(category, name, value) {
    if (CATEGORIES.indexOf(category) === -1) {
      console.warn('[CCTokenizer] invalid category:', category);
      return null;
    }

    var token = {
      id: this._genId(),
      category: category,
      name: name,
      value: value
    };

    var path = 'tokens.' + category;
    var list = this._state.get(path) || [];
    list.push(token);
    this._state.set(path, list);

    return token;
  };

  /**
   * Remove a token by id.
   * @param {string} id - token id
   * @returns {boolean}
   */
  Tokenizer.prototype.remove = function(id) {
    if (!id) return false;

    for (var i = 0; i < CATEGORIES.length; i++) {
      var path = 'tokens.' + CATEGORIES[i];
      var list = this._state.get(path) || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) {
          list.splice(j, 1);
          this._state.set(path, list);
          return true;
        }
      }
    }
    return false;
  };

  /**
   * Update a token's value.
   * @param {string} id - token id
   * @param {string} value - new value
   * @returns {Object|null} updated token or null
   */
  Tokenizer.prototype.update = function(id, value) {
    if (!id) return null;

    for (var i = 0; i < CATEGORIES.length; i++) {
      var path = 'tokens.' + CATEGORIES[i];
      var list = this._state.get(path) || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) {
          list[j].value = value;
          this._state.set(path, list);
          return list[j];
        }
      }
    }
    return null;
  };

  /**
   * Apply a token's value to a DOM element's style.
   * @param {string} id - token id
   * @param {HTMLElement} element - target element
   * @returns {boolean} true if applied
   */
  Tokenizer.prototype.applyToElement = function(id, element) {
    var token = this.findById(id);
    if (!token || !element) return false;

    var prop = this._categoryToCSSProp(token.category, token.name);
    if (prop) {
      element.style[prop] = token.value;
      return true;
    }

    // Fallback: set as CSS variable on the element
    element.style.setProperty(token.name, token.value);
    return true;
  };

  /**
   * List tokens, optionally filtered by category.
   * @param {string} [category] - filter by category
   * @returns {Array}
   */
  Tokenizer.prototype.list = function(category) {
    if (category) {
      return (this._state.get('tokens.' + category) || []).slice();
    }

    // Return all
    var all = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      var list = this._state.get('tokens.' + CATEGORIES[i]) || [];
      all = all.concat(list);
    }
    return all;
  };

  /**
   * Find a token by id.
   * @param {string} id
   * @returns {Object|null}
   */
  Tokenizer.prototype.findById = function(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      var list = this._state.get('tokens.' + CATEGORIES[i]) || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) return list[j];
      }
    }
    return null;
  };

  /**
   * Map category + name to a CSS property name.
   */
  Tokenizer.prototype._categoryToCSSProp = function(category, name) {
    switch (category) {
      case 'colors':
        if (/bg|background/i.test(name)) return 'backgroundColor';
        if (/border/i.test(name)) return 'borderColor';
        return 'color';
      case 'typography':
        if (/size/i.test(name)) return 'fontSize';
        if (/weight/i.test(name)) return 'fontWeight';
        if (/family/i.test(name)) return 'fontFamily';
        if (/height/i.test(name)) return 'lineHeight';
        if (/spacing/i.test(name)) return 'letterSpacing';
        return 'font';
      case 'spacing':
        if (/margin/i.test(name)) return 'margin';
        if (/padding/i.test(name)) return 'padding';
        if (/gap/i.test(name)) return 'gap';
        return 'margin';
      case 'shadows':
        return 'boxShadow';
      case 'radius':
        return 'borderRadius';
      default:
        return null;
    }
  };

  // Export
  window.CCTokenizer = Tokenizer;
})();
