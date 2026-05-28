/**
 * CollabCanvas - Mode Machine
 * Manages application modes: preview, edit, annotate, compare
 * IIFE exporting window.CCModeMachine
 */
;(function () {
  'use strict';

  var MODES = ['preview', 'edit', 'annotate', 'compare'];

  var TRANSITIONS = {
    preview:  ['edit', 'compare'],
    edit:     ['preview', 'annotate', 'compare'],
    annotate: ['edit', 'preview'],
    compare:  ['preview', 'edit']
  };

  /**
   * @param {object} state    - StateManager instance (has get/set)
   * @param {object} eventBus - event emitter instance
   */
  function ModeMachine(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;

    // Ensure initial mode is set
    if (!state.get('mode.current')) {
      state.set('mode.current', 'edit');
    }
    if (state.get('mode.paused') === undefined) {
      state.set('mode.paused', false);
    }
  }

  /**
   * Transition to a new mode.
   * @param {string} mode - target mode name
   * @returns {boolean} true if transition succeeded
   */
  ModeMachine.prototype.transition = function (mode) {
    var currentName = this.state.get('mode.current');

    if (currentName === mode) return true;
    if (MODES.indexOf(mode) === -1) return false;

    var allowed = TRANSITIONS[currentName];
    if (!allowed || allowed.indexOf(mode) === -1) return false;

    // Emit exit event for old mode
    this.eventBus.emit('mode:exit:' + currentName, {
      from: currentName,
      to: mode
    });

    // update state
    this.state.set('mode.previous', currentName);
    this.state.set('mode.current', mode);

    // Emit general mode:changed event
    this.eventBus.emit('mode:changed', {
      from: currentName,
      to: mode
    });

    // Emit enter event for new mode
    this.eventBus.emit('mode:enter:' + mode, {
      from: currentName,
      to: mode
    });

    return true;
  };

  /**
   * Toggle paused state.
   */
  ModeMachine.prototype.togglePause = function () {
    var paused = !this.state.get('mode.paused');
    this.state.set('mode.paused', paused);
    this.eventBus.emit('mode:paused', { paused: paused });
  };

  /**
   * Get the current mode name.
   * @returns {string}
   */
  ModeMachine.prototype.current = function () {
    return this.state.get('mode.current');
  };

  /**
   * Check whether a transition is allowed without performing it.
   * @param {string} mode
   * @returns {boolean}
   */
  ModeMachine.prototype.canTransition = function (mode) {
    var currentName = this.state.get('mode.current');
    var allowed = TRANSITIONS[currentName];
    if (!allowed) return false;
    return allowed.indexOf(mode) !== -1;
  };

  window.CCModeMachine = ModeMachine;
})();
