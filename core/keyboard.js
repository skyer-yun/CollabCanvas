/**
 * CollabCanvas - Keyboard Manager
 * Registers and dispatches keyboard shortcuts per application mode
 * IIFE exporting window.CCKeyboard
 */
;(function () {
  'use strict';

  // shortcuts allowed in preview mode (whitelist)
  var PREVIEW_ALLOWED = ['keyboard:togglePause', 'keyboard:escape'];

  /**
   * @param {object} state    - shared application state
   * @param {object} eventBus - event emitter instance
   */
  function KeyboardManager(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    this._bindings = [];
    this._bound = false;
  }

  /**
   * Register a key binding.
   * @param {string}   key     - e.g. 'z', 'ArrowUp', 'Escape'
   * @param {string}   event   - event name to emit, e.g. 'keyboard:undo'
   * @param {object}   [opts]
   * @param {boolean}  [opts.ctrl]
   * @param {boolean}  [opts.shift]
   * @param {string[]} [opts.modes] - modes where this binding is active (omit = all)
   */
  KeyboardManager.prototype.register = function (key, event, opts) {
    opts = opts || {};
    this._bindings.push({
      key: key.toLowerCase(),
      ctrl: !!opts.ctrl,
      shift: !!opts.shift,
      modes: opts.modes || null,   // null = all modes
      event: event
    });
  };

  /**
   * Bind the global keydown listener.
   */
  KeyboardManager.prototype.setup = function () {
    if (this._bound) return;
    this._bound = true;
    var self = this;
    this._handler = function (e) {
      self.dispatch(e);
    };
    document.addEventListener('keydown', this._handler);
  };

  /**
   * Unbind the listener.
   */
  KeyboardManager.prototype.teardown = function () {
    if (!this._bound) return;
    this._bound = false;
    document.removeEventListener('keydown', this._handler);
  };

  /**
   * Dispatch a KeyboardEvent.
   * @param {KeyboardEvent} e
   */
  KeyboardManager.prototype.dispatch = function (e) {
    var key = e.key.toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    var shift = e.shiftKey;
    var currentMode = this.state.get('mode.current') || 'edit';

    for (var i = 0; i < this._bindings.length; i++) {
      var b = this._bindings[i];
      if (b.key !== key) continue;
      if (b.ctrl !== ctrl) continue;
      if (b.shift !== shift) continue;

      // mode filter
      if (b.modes && b.modes.indexOf(currentMode) === -1) continue;

      var eventName = b.event;

      // in preview mode, only allow whitelisted events
      if (currentMode === 'preview' && PREVIEW_ALLOWED.indexOf(eventName) === -1) {
        continue;
      }

      e.preventDefault();
      this.eventBus.emit(eventName, { key: e.key, ctrl: ctrl, shift: shift });
      return;
    }
  };

  // --- Pre-register all shortcuts ---

  function registerDefaults(kb) {
    // undo / redo / save / export / pause
    kb.register('z', 'keyboard:undo', { ctrl: true });
    kb.register('y', 'keyboard:redo', { ctrl: true });
    kb.register('s', 'keyboard:save', { ctrl: true });
    kb.register('e', 'keyboard:export', { ctrl: true });
    kb.register('p', 'keyboard:togglePause', { ctrl: true });

    // clipboard
    kb.register('c', 'keyboard:copy', { ctrl: true, modes: ['edit'] });
    kb.register('x', 'keyboard:cut', { ctrl: true, modes: ['edit'] });
    kb.register('v', 'keyboard:paste', { ctrl: true, modes: ['edit'] });

    // formatting
    kb.register('b', 'keyboard:bold', { ctrl: true, modes: ['edit'] });
    kb.register('i', 'keyboard:italic', { ctrl: true, modes: ['edit'] });

    // duplicate / group / ungroup
    kb.register('d', 'keyboard:duplicate', { ctrl: true, modes: ['edit'] });
    kb.register('g', 'keyboard:group', { ctrl: true, modes: ['edit'] });
    kb.register('g', 'keyboard:ungroup', { ctrl: true, shift: true, modes: ['edit'] });

    // z-order
    kb.register(']', 'keyboard:z-up', { ctrl: true, modes: ['edit'] });
    kb.register('[', 'keyboard:z-down', { ctrl: true, modes: ['edit'] });
    kb.register(']', 'keyboard:z-top', { ctrl: true, shift: true, modes: ['edit'] });
    kb.register('[', 'keyboard:z-bottom', { ctrl: true, shift: true, modes: ['edit'] });

    // zoom
    kb.register('=', 'keyboard:zoom-in', { ctrl: true });
    kb.register('-', 'keyboard:zoom-out', { ctrl: true });
    kb.register('0', 'keyboard:zoom-reset', { ctrl: true });

    // nudge (arrow keys)
    kb.register('arrowup', 'keyboard:nudge-up', { modes: ['edit', 'annotate'] });
    kb.register('arrowdown', 'keyboard:nudge-down', { modes: ['edit', 'annotate'] });
    kb.register('arrowleft', 'keyboard:nudge-left', { modes: ['edit', 'annotate'] });
    kb.register('arrowright', 'keyboard:nudge-right', { modes: ['edit', 'annotate'] });

    // shift+nudge (10px) — shift flag is checked during dispatch
    kb.register('arrowup', 'keyboard:nudge-up-10', { shift: true, modes: ['edit', 'annotate'] });
    kb.register('arrowdown', 'keyboard:nudge-down-10', { shift: true, modes: ['edit', 'annotate'] });
    kb.register('arrowleft', 'keyboard:nudge-left-10', { shift: true, modes: ['edit', 'annotate'] });
    kb.register('arrowright', 'keyboard:nudge-right-10', { shift: true, modes: ['edit', 'annotate'] });

    // delete / escape / help
    kb.register('delete', 'keyboard:delete', { modes: ['edit'] });
    kb.register('backspace', 'keyboard:delete', { modes: ['edit'] });
    kb.register('escape', 'keyboard:escape');
    kb.register('f1', 'keyboard:help');
  }

  // auto-register defaults on construction
  var _origInit = KeyboardManager;
  KeyboardManager = function (state, eventBus) {
    _origInit.call(this, state, eventBus);
    registerDefaults(this);
  };
  KeyboardManager.prototype = _origInit.prototype;

  window.CCKeyboard = KeyboardManager;
})();
