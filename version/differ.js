/**
 * CollabCanvas - Version Differ Module
 * Compare two snapshot HTML strings and report differences
 * IIFE exporting to window.CCVersionDiffer
 */
(function (global) {
  'use strict';

  /**
   * Parse an HTML string into a map of element signatures.
   * Key = tag:id.class (or tag[index]), Value = outerHTML simplified.
   */
  function parseToMap(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var body = doc.body;
    var map = {};

    walkNodes(body, '', map);
    return map;
  }

  function walkNodes(parent, prefix, map) {
    var children = parent.children;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var sig = elementSignature(el, i);
      var path = prefix ? (prefix + '/' + sig) : sig;

      map[path] = {
        tag: el.tagName,
        id: el.id,
        className: el.className,
        textContent: (el.textContent || '').trim().substring(0, 200),
        attributeHash: attributeHash(el),
        childCount: el.children.length
      };

      if (el.children.length > 0) {
        walkNodes(el, path, map);
      }
    }
  }

  function elementSignature(el, index) {
    var sig = el.tagName.toLowerCase();
    if (el.id) {
      sig += '#' + el.id;
    } else {
      sig += '[' + index + ']';
    }
    if (el.className && typeof el.className === 'string') {
      var mainClass = el.className.trim().split(/\s+/)[0];
      if (mainClass) sig += '.' + mainClass;
    }
    return sig;
  }

  function attributeHash(el) {
    var attrs = [];
    if (el.attributes) {
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.name !== 'class') {
          attrs.push(a.name + '=' + a.value);
        }
      }
    }
    attrs.sort();
    return attrs.join('|');
  }

  /**
   * VersionDiffer class
   */
  function VersionDiffer() {}

  /**
   * Compare two snapshot objects (must have .html property).
   * @param {object} snap1 - First snapshot
   * @param {object} snap2 - Second snapshot
   * @returns {object} { added, removed, modified, details }
   */
  VersionDiffer.prototype.compare = function (snap1, snap2) {
    var map1 = parseToMap(snap1.html || '');
    var map2 = parseToMap(snap2.html || '');

    var keys1 = Object.keys(map1);
    var keys2 = Object.keys(map2);

    var added = 0;
    var removed = 0;
    var modified = 0;
    var details = [];

    // Find removed and modified
    for (var i = 0; i < keys1.length; i++) {
      var key = keys1[i];
      if (!map2[key]) {
        removed++;
        details.push({ path: key, change: 'removed', element: map1[key] });
      } else if (map1[key].attributeHash !== map2[key].attributeHash ||
                 map1[key].textContent !== map2[key].textContent ||
                 map1[key].childCount !== map2[key].childCount) {
        modified++;
        details.push({
          path: key,
          change: 'modified',
          before: map1[key],
          after: map2[key]
        });
      }
    }

    // Find added
    for (var j = 0; j < keys2.length; j++) {
      var key2 = keys2[j];
      if (!map1[key2]) {
        added++;
        details.push({ path: key2, change: 'added', element: map2[key2] });
      }
    }

    return {
      added: added,
      removed: removed,
      modified: modified,
      details: details,
      summary: 'Added ' + added + ', Removed ' + removed + ', Modified ' + modified
    };
  };

  /**
   * Generate a human-readable diff text.
   * @param {object} result - Output from compare()
   * @returns {string}
   */
  VersionDiffer.prototype.formatDiff = function (result) {
    var lines = [result.summary, '---'];
    for (var i = 0; i < result.details.length; i++) {
      var d = result.details[i];
      var prefix = d.change === 'added' ? '+ ' : d.change === 'removed' ? '- ' : '~ ';
      lines.push(prefix + d.path);
    }
    return lines.join('\n');
  };

  global.CCVersionDiffer = VersionDiffer;
})(window);
