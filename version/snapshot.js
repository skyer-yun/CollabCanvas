/**
 * CollabCanvas - Snapshot Module
 * Capture and restore canvas state snapshots
 * IIFE exporting to window.CCSnapshot
 */
(function (global) {
  'use strict';

  var MAX_SNAPSHOTS = 50;

  /**
   * @param {HTMLElement} canvas - The main canvas element
   * @param {object} getState - Function returning { zoom, changeCount }
   */
  function Snapshot(canvas, getState) {
    this._canvas = canvas;
    this._getState = getState || function () { return { zoom: 1, changeCount: 0 }; };
    this._snapshots = [];
    this._nextId = 1;
  }

  /**
   * Create a snapshot of the current canvas state.
   * @param {string} label - Human-readable label for the snapshot
   * @returns {object} Snapshot record
   */
  Snapshot.prototype.create = function (label) {
    var state = this._getState();
    var snapshot = {
      id: this._nextId++,
      label: label || 'Snapshot ' + (this._snapshots.length + 1),
      timestamp: Date.now(),
      html: this._canvas.innerHTML,
      zoom: state.zoom || 1,
      changeCount: state.changeCount || 0
    };

    this._snapshots.push(snapshot);

    // Enforce max limit, remove oldest
    if (this._snapshots.length > MAX_SNAPSHOTS) {
      this._snapshots.shift();
    }

    return snapshot;
  };

  /**
   * Restore a snapshot by id.
   * @param {number} id - Snapshot id
   * @returns {boolean} True if restored successfully
   */
  Snapshot.prototype.restore = function (id) {
    var snap = this.get(id);
    if (!snap) return false;

    this._canvas.innerHTML = snap.html;
    var state = this._getState();
    if (typeof state.setZoom === 'function') {
      state.setZoom(snap.zoom);
    }

    return true;
  };

  /** Get a snapshot by id. */
  Snapshot.prototype.get = function (id) {
    for (var i = 0; i < this._snapshots.length; i++) {
      if (this._snapshots[i].id === id) return this._snapshots[i];
    }
    return null;
  };

  /** Get all snapshots (newest last). */
  Snapshot.prototype.list = function () {
    return this._snapshots.slice();
  };

  /** Delete a snapshot by id. */
  Snapshot.prototype.remove = function (id) {
    for (var i = 0; i < this._snapshots.length; i++) {
      if (this._snapshots[i].id === id) {
        this._snapshots.splice(i, 1);
        return true;
      }
    }
    return false;
  };

  /** Clear all snapshots. */
  Snapshot.prototype.clear = function () {
    this._snapshots = [];
    this._nextId = 1;
  };

  /** Get count of snapshots. */
  Snapshot.prototype.count = function () {
    return this._snapshots.length;
  };

  global.CCSnapshot = Snapshot;
})(window);
