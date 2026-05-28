/**
 * CollabCanvas — Event Bus (pub/sub)
 * 轻量级事件系统，模块间解耦通信
 */
(function() {
  'use strict';

  function EventBus() {
    this._listeners = {};
  }

  EventBus.prototype.on = function(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  };

  EventBus.prototype.off = function(event, fn) {
    var list = this._listeners[event];
    if (!list) return this;
    this._listeners[event] = list.filter(function(f) { return f !== fn; });
    return this;
  };

  EventBus.prototype.emit = function(event, data) {
    var list = this._listeners[event];
    if (!list) return this;
    list.forEach(function(fn) {
      try { fn(data); } catch (e) { console.error('[CC EventBus] Error in handler for "' + event + '":', e); }
    });
    return this;
  };

  EventBus.prototype.once = function(event, fn) {
    var self = this;
    function wrapper(data) {
      self.off(event, wrapper);
      fn(data);
    }
    this.on(event, wrapper);
    return this;
  };

  EventBus.prototype.destroy = function() {
    this._listeners = {};
    return this;
  };

  // Export
  window.CCEventBus = EventBus;
})();
