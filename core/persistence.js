/**
 * CollabCanvas -- Persistence Module
 * 统一异步持久化接口，自动检测 chrome.storage.local / localStorage
 * key 统一前缀 cc-
 */
(function() {
  'use strict';

  var PREFIX = 'cc-';
  var _timers = {};

  // Detect storage backend
  var _useChrome = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

  var Persistence = {
    /**
     * Save data to storage.
     * @param {string} key - storage key (without prefix)
     * @param {*} data - JSON-serializable data
     */
    save: function(key, data) {
      var fullKey = PREFIX + key;
      var json;
      try {
        json = JSON.stringify(data);
      } catch (e) {
        console.warn('[CCPersistence] Cannot serialize:', key, e);
        return;
      }
      if (_useChrome) {
        try {
          var obj = {};
          obj[fullKey] = json;
          chrome.storage.local.set(obj);
        } catch (e) {
          console.warn('[CCPersistence] chrome.storage write failed:', e);
          _fallbackSet(fullKey, json);
        }
      } else {
        _fallbackSet(fullKey, json);
      }
    },

    /**
     * Load data from storage (async, callback-based).
     * @param {string} key - storage key (without prefix)
     * @param {function} callback - callback(data|null)
     */
    load: function(key, callback) {
      var fullKey = PREFIX + key;
      if (_useChrome) {
        try {
          chrome.storage.local.get(fullKey, function(result) {
            var raw = result && result[fullKey];
            if (raw) {
              try { callback(JSON.parse(raw)); }
              catch (e) { callback(null); }
            } else {
              callback(null);
            }
          });
        } catch (e) {
          callback(_fallbackGet(fullKey));
        }
      } else {
        callback(_fallbackGet(fullKey));
      }
    },

    /**
     * Remove a key from storage.
     * @param {string} key
     */
    remove: function(key) {
      var fullKey = PREFIX + key;
      if (_useChrome) {
        try { chrome.storage.local.remove(fullKey); }
        catch (e) { _fallbackRemove(fullKey); }
      } else {
        _fallbackRemove(fullKey);
      }
    },

    /**
     * Debounced save — coalesces rapid writes.
     * @param {string} key
     * @param {*} data
     * @param {number} [delay=2000] - debounce delay in ms
     */
    debounceSave: function(key, data, delay) {
      if (_timers[key]) clearTimeout(_timers[key]);
      _timers[key] = setTimeout(function() {
        Persistence.save(key, data);
        delete _timers[key];
      }, delay || 2000);
    }
  };

  // -- localStorage fallback --
  function _fallbackSet(fullKey, json) {
    try {
      localStorage.setItem(fullKey, json);
    } catch (e) {
      // QuotaExceededError — clear old cc- keys as recovery
      console.warn('[CCPersistence] localStorage quota exceeded');
      _emergencyClear();
      try { localStorage.setItem(fullKey, json); }
      catch (e2) { /* give up */ }
    }
  }

  function _fallbackGet(fullKey) {
    try {
      var raw = localStorage.getItem(fullKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _fallbackRemove(fullKey) {
    try { localStorage.removeItem(fullKey); }
    catch (e) { /* ignore */ }
  }

  function _emergencyClear() {
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) toRemove.push(k);
    }
    toRemove.forEach(function(k) { localStorage.removeItem(k); });
  }

  window.CCPersistence = Persistence;
})();
