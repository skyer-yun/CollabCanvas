/**
 * CollabCanvas — State Manager
 * 响应式状态管理，变更自动通过 EventBus 广播
 */
(function() {
  'use strict';

  function StateManager(eventBus) {
    this._bus = eventBus;
    this._batchDepth = 0;
    this._batchChanges = [];
    this._data = {
      mode: { current: 'edit', previous: null, paused: false },
      selection: { current: null, hover: null, multiSelect: [] },
      canvas: { wrapper: null, canvas: null, zoom: 1, panX: 0, panY: 0 },
      history: { changes: [], undoStack: [] },
      clipboard: { data: [], mousePos: null },
      ui: { leftTab: 'layers', rightTab: 'properties', leftPanelOpen: true, rightPanelOpen: true },
      drag: { move: null, resize: null, rotate: null },
      placement: { type: null },
      editing: { text: false },
      handles: { resize: [], rotate: null, rotateLine: null, smartGuides: [], distLabels: [] },
      pages: { list: [], current: 0 },
      versions: { snapshots: [], currentId: null },
      tokens: { colors: [], typography: [], spacing: [], shadows: [], radius: [] },
      annotations: { list: [], currentTool: null },
      settings: {
        project: { name: '', version: '1.0', author: '', description: '', pageUrl: '' },
        ai: { provider: 'none', apiKey: '', endpoint: '', model: '', conversationHistory: [], lastError: null },
        export: { format: 'markdown', includeScreenshots: true, includeAnnotations: true, annotationNumberFormat: 'auto' },
        annotations: { autoNumber: true, defaultColor: '#1677ff', defaultStatus: 'pending', showCoordinates: true, showPRDIndicators: true, defaultModule: '', defaultPriority: 'medium', defaultRequirementType: 'functional' }
      },
      nudgeTimer: null,
      nudgeStartPositions: {},
      contextMenu: null,
      tip: null,
      bar: null,
      panel: null,
      snapThreshold: 5
    };
  }

  StateManager.prototype.get = function(path) {
    var parts = path.split('.');
    var cur = this._data;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  };

  StateManager.prototype.set = function(path, value) {
    var parts = path.split('.');
    var cur = this._data;
    for (var i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    var key = parts[parts.length - 1];
    var old = cur[key];

    // Identity check — skip noop sets
    if (old === value) return this;

    cur[key] = value;

    // Auto-emit state change event
    if (this._bus) {
      var change = { path: path, oldVal: old, newVal: value };
      if (this._batchDepth > 0) {
        this._batchChanges.push(change);
      } else {
        this._bus.emit('state:changed', change);
      }
    }
    return this;
  };

  StateManager.prototype.getAll = function() {
    return this._data;
  };

  StateManager.prototype.batch = function() {
    this._batchDepth++;
    return this;
  };

  StateManager.prototype.endBatch = function() {
    if (this._batchDepth <= 0) return this;
    this._batchDepth--;
    if (this._batchDepth === 0 && this._bus && this._batchChanges.length > 0) {
      this._bus.emit('state:changed', { batch: true, changes: this._batchChanges });
      this._batchChanges = [];
    }
    return this;
  };

  // Shorthand accessors for frequently used paths
  Object.defineProperties(StateManager.prototype, {
    zoom: { get: function() { return this._data.canvas.zoom; } },
    selected: { get: function() { return this._data.selection.current; } },
    canvas: { get: function() { return this._data.canvas.canvas; } },
    mode: { get: function() { return this._data.mode.current; } },
    paused: { get: function() { return this._data.mode.paused; } },
    changes: { get: function() { return this._data.history.changes; } },
    undoStack: { get: function() { return this._data.history.undoStack; } }
  });

  window.CCStateManager = StateManager;
})();
