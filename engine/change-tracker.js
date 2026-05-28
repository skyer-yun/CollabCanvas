;(function () {
  'use strict';

  class ChangeTracker {
    constructor(state, eventBus) {
      this.state = state;
      this.eventBus = eventBus;
      this._maxChanges = 100;
    }

    /**
     * Serialize a value, replacing HTMLElement refs with stable identifiers.
     */
    _serializeValue(val) {
      if (val == null) return val;
      if (typeof val !== 'object') return val;

      // Direct HTMLElement
      if (val instanceof HTMLElement) {
        return { __ccRef: true, id: val.id || '' };
      }

      // Array
      if (Array.isArray(val)) {
        return val.map(function (item) {
          if (item instanceof HTMLElement) {
            return { __ccRef: true, id: item.id || '' };
          }
          if (item && typeof item === 'object' && item.element instanceof HTMLElement) {
            var copy = {};
            for (var k in item) {
              if (item.hasOwnProperty(k)) copy[k] = k === 'element' ? { __ccRef: true, id: item.element.id || '' } : item[k];
            }
            return copy;
          }
          return item;
        });
      }

      // Plain object — deep clone, replacing HTMLElement fields
      var result = {};
      for (var key in val) {
        if (!val.hasOwnProperty(key)) continue;
        var v = val[key];
        if (v instanceof HTMLElement) {
          result[key] = { __ccRef: true, id: v.id || '' };
        } else if (Array.isArray(v)) {
          result[key] = this._serializeValue(v);
        } else {
          result[key] = v;
        }
      }
      return result;
    }

    /**
     * Record a property change and push it onto the changes stack.
     * Clears the undo stack so redo history is invalidated.
     * @param {string} prop  - Change type / property name (e.g. 'css', 'move')
     * @param {*}      newVal - New value after the change
     * @param {*}      oldVal - Value before the change
     * @param {object} [extra] - Additional data to store alongside
     */
    record(prop, newVal, oldVal, extra) {
      var entry = {
        prop: prop,
        newVal: this._serializeValue(newVal),
        oldVal: this._serializeValue(oldVal),
        timestamp: Date.now()
      };

      if (extra) {
        Object.keys(extra).forEach(function (k) {
          entry[k] = extra[k];
        });
      }

      this._push(entry);
    }

    /**
     * Push a raw entry object directly onto the changes stack.
     * Used when the caller builds the change record manually.
     */
    pushRaw(entry) {
      if (!entry) return;
      if (!entry.timestamp) entry.timestamp = Date.now();
      // Serialize element refs in raw entries too
      if (entry.newVal) entry.newVal = this._serializeValue(entry.newVal);
      if (entry.oldVal) entry.oldVal = this._serializeValue(entry.oldVal);
      this._push(entry);
    }

    /**
     * Internal push with stack limit enforcement.
     */
    _push(entry) {
      this.state.changes.push(entry);
      // Enforce max stack size
      while (this.state.changes.length > this._maxChanges) {
        this.state.changes.shift();
      }
      // Invalidate redo history
      this.state.undoStack.length = 0;
      this.eventBus.emit('history:recorded', entry);
    }
  }

  window.CCChangeTracker = ChangeTracker;
})();
