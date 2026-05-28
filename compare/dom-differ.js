/**
 * CollabCanvas — DOM Differ
 * Traverse and compare two DOM trees, report added/removed/modified nodes
 */
(function() {
  'use strict';

  var DIFF_TYPES = {
    added:    { className: 'cc-diff-added',    color: '#52c41a' },  // green
    removed:  { className: 'cc-diff-removed',  color: '#ff4d4f' },  // red
    modified: { className: 'cc-diff-modified', color: '#faad14' }   // yellow
  };

  function DOMDiffer() {}

  /**
   * Compare two DOM trees and return differences.
   * @param {Node} dom1 - original DOM tree
   * @param {Node} dom2 - modified DOM tree
   * @returns {Object} {added: [], removed: [], modified: []}
   *   Each item: {path: string, type: string, details: string}
   */
  DOMDiffer.prototype.diff = function(dom1, dom2) {
    var result = {
      added: [],
      removed: [],
      modified: []
    };

    this._walk(dom1, dom2, '', result);
    return result;
  };

  /**
   * Recursive walk comparing two node trees.
   */
  DOMDiffer.prototype._walk = function(node1, node2, path, result) {
    // Handle null/undefined
    if (!node1 && !node2) return;

    if (!node1 && node2) {
      result.added.push({
        path: path,
        type: node2.nodeType === 1 ? node2.tagName.toLowerCase() : 'text',
        details: node2.nodeType === 1 ? '<' + node2.tagName.toLowerCase() + '>' : this._truncate(node2.textContent)
      });
      return;
    }

    if (node1 && !node2) {
      result.removed.push({
        path: path,
        type: node1.nodeType === 1 ? node1.tagName.toLowerCase() : 'text',
        details: node1.nodeType === 1 ? '<' + node1.tagName.toLowerCase() + '>' : this._truncate(node1.textContent)
      });
      return;
    }

    // Compare text nodes
    if (node1.nodeType === 3 && node2.nodeType === 3) {
      if (node1.textContent !== node2.textContent) {
        result.modified.push({
          path: path,
          type: 'text',
          details: '"' + this._truncate(node1.textContent) + '" -> "' + this._truncate(node2.textContent) + '"'
        });
      }
      return;
    }

    // Compare element nodes
    if (node1.nodeType === 1 && node2.nodeType === 1) {
      var tag1 = node1.tagName;
      var tag2 = node2.tagName;

      if (tag1 !== tag2) {
        result.modified.push({
          path: path,
          type: 'tag',
          details: '<' + tag1.toLowerCase() + '> -> <' + tag2.toLowerCase() + '>'
        });
        return;
      }

      // Compare attributes
      this._diffAttributes(node1, node2, path, result);

      // Compare children
      var children1 = this._getChildren(node1);
      var children2 = this._getChildren(node2);
      var maxLen = Math.max(children1.length, children2.length);
      var tagName = tag1.toLowerCase();

      for (var i = 0; i < maxLen; i++) {
        var childPath = path + '/' + tagName + '[' + i + ']';
        this._walk(children1[i] || null, children2[i] || null, childPath, result);
      }
    }
  };

  /**
   * Compare attributes of two elements.
   */
  DOMDiffer.prototype._diffAttributes = function(el1, el2, path, result) {
    var attrs1 = this._getAttrMap(el1);
    var attrs2 = this._getAttrMap(el2);

    // Check for added/modified attributes
    for (var key in attrs2) {
      if (!attrs2.hasOwnProperty(key)) continue;
      if (!(key in attrs1)) {
        result.added.push({
          path: path + '@' + key,
          type: 'attr',
          details: key + '="' + attrs2[key] + '"'
        });
      } else if (attrs1[key] !== attrs2[key]) {
        result.modified.push({
          path: path + '@' + key,
          type: 'attr',
          details: key + ': "' + attrs1[key] + '" -> "' + attrs2[key] + '"'
        });
      }
    }

    // Check for removed attributes
    for (var k in attrs1) {
      if (!attrs1.hasOwnProperty(k)) continue;
      if (!(k in attrs2)) {
        result.removed.push({
          path: path + '@' + k,
          type: 'attr',
          details: k + '="' + attrs1[k] + '"'
        });
      }
    }
  };

  /**
   * Get element attributes as a plain object.
   */
  DOMDiffer.prototype._getAttrMap = function(el) {
    var map = {};
    var attrs = el.attributes;
    for (var i = 0; i < attrs.length; i++) {
      map[attrs[i].name] = attrs[i].value;
    }
    return map;
  };

  /**
   * Get meaningful child nodes (skip whitespace-only text).
   */
  DOMDiffer.prototype._getChildren = function(node) {
    var result = [];
    if (!node || !node.childNodes) return result;
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType === 3 && child.textContent.trim() === '') continue;
      result.push(child);
    }
    return result;
  };

  /**
   * Truncate string for display.
   */
  DOMDiffer.prototype._truncate = function(str, len) {
    len = len || 40;
    str = (str || '').trim();
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
  };

  /**
   * Apply visual highlights to elements based on diff type.
   * @param {Array} elements - array of diff items with path info
   * @param {string} type - 'added' | 'removed' | 'modified'
   */
  DOMDiffer.prototype.highlight = function(elements, type) {
    var config = DIFF_TYPES[type];
    if (!config) return;

    for (var i = 0; i < elements.length; i++) {
      var item = elements[i];
      // For element-level diffs, we find the element by path
      if (item.type === 'attr') continue; // skip attribute-only diffs for visual

      var el = document.querySelector('[data-diff-path="' + item.path + '"]');
      if (el) {
        el.classList.add(config.className);
        el.style.outline = '2px solid ' + config.color;
        el.style.outlineOffset = '2px';
      }
    }
  };

  /**
   * Remove all diff highlights from the document.
   */
  DOMDiffer.prototype.clearHighlights = function() {
    var classes = ['cc-diff-added', 'cc-diff-removed', 'cc-diff-modified'];
    for (var i = 0; i < classes.length; i++) {
      var els = document.querySelectorAll('.' + classes[i]);
      for (var j = 0; j < els.length; j++) {
        els[j].classList.remove(classes[i]);
        els[j].style.outline = '';
        els[j].style.outlineOffset = '';
      }
    }
  };

  // Export
  window.CCDOMDiffer = DOMDiffer;
})();
