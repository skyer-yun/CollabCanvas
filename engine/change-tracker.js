;(function () {
  'use strict';

  class ChangeTracker {
    constructor(state, eventBus) {
      this.state = state;
      this.eventBus = eventBus;
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
        newVal: newVal,
        oldVal: oldVal,
        timestamp: Date.now()
      };

      if (extra) {
        Object.keys(extra).forEach(function (k) {
          entry[k] = extra[k];
        });
      }

      this.state.changes.push(entry);

      // Invalidate redo history
      this.state.undoStack.length = 0;

      this.eventBus.emit('history:recorded', entry);
    }

    /**
     * Push a raw entry object directly onto the changes stack.
     * Used when the caller builds the change record manually.
     */
    pushRaw(entry) {
      if (!entry) return;
      if (!entry.timestamp) entry.timestamp = Date.now();
      this.state.changes.push(entry);
      this.state.undoStack.length = 0;
      this.eventBus.emit('history:recorded', entry);
    }
  }

  window.CCChangeTracker = ChangeTracker;
})();
