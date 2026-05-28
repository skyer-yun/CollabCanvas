/**
 * CollabCanvas — Annotator
 * CRUD for annotations, stores in state.annotations.list
 */
(function() {
  'use strict';

  var STATUSES = ['pending', 'in-progress', 'resolved'];

  function Annotator(state, eventBus) {
    this._state = state;
    this._bus = eventBus;
    this._nextId = 1;
  }

  /**
   * Generate a unique annotation ID.
   */
  Annotator.prototype._genId = function() {
    return 'ann-' + (this._nextId++);
  };

  /**
   * Validate annotation data fields.
   */
  Annotator.prototype._validate = function(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('[CCAnnotator] create requires a data object');
    }
    if (data.type === undefined) {
      throw new Error('[CCAnnotator] annotation data must include a type');
    }
  };

  /**
   * Create a new annotation and add it to state.
   * @param {Object} data - {type, x, y, w, h, text, color, status, assignee}
   * @returns {Object} the created annotation (with id and timestamp)
   */
  Annotator.prototype.create = function(data) {
    this._validate(data);

    var annotation = {
      id: this._genId(),
      type: data.type,
      x: data.x || 0,
      y: data.y || 0,
      w: data.w || 0,
      h: data.h || 0,
      text: data.text || '',
      color: data.color || '#1677ff',
      status: (STATUSES.indexOf(data.status) !== -1) ? data.status : 'pending',
      assignee: data.assignee || '',
      module: data.module || '',
      priority: data.priority || 'medium',
      requirementType: data.requirementType || 'functional',
      acceptanceCriteria: data.acceptanceCriteria || '',
      timestamp: Date.now()
    };

    var list = this._state.get('annotations.list') || [];
    list.push(annotation);
    this._state.set('annotations.list', list);

    if (this._bus) {
      this._bus.emit('annotation:created', annotation);
    }

    return annotation;
  };

  /**
   * Update an existing annotation by id.
   * @param {string} id - annotation id
   * @param {Object} changes - fields to merge
   * @returns {Object|null} updated annotation or null if not found
   */
  Annotator.prototype.update = function(id, changes) {
    if (!id || !changes) return null;

    var list = this._state.get('annotations.list') || [];
    var annotation = null;
    var index = -1;

    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        annotation = list[i];
        index = i;
        break;
      }
    }

    if (!annotation) return null;

    // Whitelist of updatable fields
    var allowed = ['type', 'x', 'y', 'w', 'h', 'text', 'color', 'status', 'assignee', 'module', 'priority', 'requirementType', 'acceptanceCriteria'];
    for (var j = 0; j < allowed.length; j++) {
      var key = allowed[j];
      if (changes[key] !== undefined) {
        annotation[key] = changes[key];
      }
    }
    annotation.timestamp = Date.now();

    list[index] = annotation;
    this._state.set('annotations.list', list);

    if (this._bus) {
      this._bus.emit('annotation:updated', annotation);
    }

    return annotation;
  };

  /**
   * Remove an annotation by id.
   * @param {string} id
   * @returns {boolean} true if removed, false if not found
   */
  Annotator.prototype.remove = function(id) {
    if (!id) return false;

    var list = this._state.get('annotations.list') || [];
    var newList = [];
    var found = false;

    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        found = true;
      } else {
        newList.push(list[i]);
      }
    }

    if (found) {
      this._state.set('annotations.list', newList);
      if (this._bus) {
        this._bus.emit('annotation:removed', { id: id });
      }
    }

    return found;
  };

  /**
   * List annotations, optionally filtered.
   * @param {Object} [filter] - {status, assignee, type}
   * @returns {Array}
   */
  Annotator.prototype.list = function(filter) {
    var list = this._state.get('annotations.list') || [];
    if (!filter) return list.slice();

    return list.filter(function(ann) {
      if (filter.status && ann.status !== filter.status) return false;
      if (filter.assignee && ann.assignee !== filter.assignee) return false;
      if (filter.type && ann.type !== filter.type) return false;
      if (filter.module && ann.module !== filter.module) return false;
      if (filter.priority && ann.priority !== filter.priority) return false;
      if (filter.requirementType && ann.requirementType !== filter.requirementType) return false;
      return true;
    });
  };

  /**
   * Get a single annotation by id.
   * @param {string} id
   * @returns {Object|null}
   */
  Annotator.prototype.getById = function(id) {
    if (!id) return null;
    var list = this._state.get('annotations.list') || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  // Export
  window.CCAnnotator = Annotator;
})();
