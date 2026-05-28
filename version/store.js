/**
 * CollabCanvas - Version Store Module
 * IndexedDB-backed persistence for projects and snapshots
 * IIFE exporting to window.CCVersionStore
 */
(function (global) {
  'use strict';

  var DB_NAME = 'collabcanvas';
  var DB_VERSION = 1;

  /**
   * VersionStore class
   * @param {object} app - CollabCanvas app reference for accessing pages/tokens
   */
  function VersionStore(app) {
    this._app = app;
    this._db = null;
  }

  /** Open (or create) the IndexedDB database. */
  VersionStore.prototype.openDB = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          var snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };

      request.onsuccess = function (e) {
        self._db = e.target.result;
        resolve(self._db);
      };

      request.onerror = function (e) {
        reject(e.target.error);
      };
    });
  };

  /** Ensure DB is open before any operation. */
  VersionStore.prototype._ensureDB = function () {
    var self = this;
    if (this._db) return Promise.resolve(this._db);
    return this.openDB();
  };

  /** Generic save. @param {string} storeName @param {object} data */
  VersionStore.prototype.save = function (storeName, data) {
    return this._ensureDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var req = store.put(data);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  };

  /** Generic load by id. */
  VersionStore.prototype.load = function (storeName, id) {
    return this._ensureDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.get(id);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  };

  /** Generic delete by id. */
  VersionStore.prototype['delete'] = function (storeName, id) {
    return this._ensureDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var req = store.delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  };

  /** List all records in a store. */
  VersionStore.prototype.list = function (storeName) {
    return this._ensureDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.getAll();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  };

  /** Export current project as JSON. */
  VersionStore.prototype.exportProject = function () {
    var app = this._app;
    var data = {
      meta: {
        name: (app.projectName || 'Untitled'),
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tool: 'CollabCanvas'
      },
      pages: (app.pages || []).map(function (p) {
        return { id: p.id, name: p.name, html: p.html || '' };
      }),
      snapshots: (app.snapshots || []).map(function (s) {
        return { id: s.id, label: s.label, timestamp: s.timestamp, html: s.html, zoom: s.zoom };
      }),
      tokens: app.designTokens || {}
    };

    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (data.meta.name || 'project') + '.ccp';
    a.click();
    URL.revokeObjectURL(url);
    return data;
  };

  /** Import project from .ccp JSON file. */
  VersionStore.prototype.importProject = function (json) {
    var data = (typeof json === 'string') ? JSON.parse(json) : json;
    if (!data.meta || !data.pages) {
      throw new Error('Invalid .ccp file: missing meta or pages');
    }

    var self = this;
    var app = this._app;

    // Save project record
    var project = {
      id: data.meta.name || 'imported-' + Date.now(),
      name: data.meta.name,
      importedAt: Date.now(),
      pageCount: data.pages.length,
      snapshotCount: (data.snapshots || []).length
    };

    return self.save('projects', project).then(function () {
      // Restore pages to app
      if (app.setPages && data.pages) {
        app.setPages(data.pages);
      }

      // Restore snapshots
      if (data.snapshots && data.snapshots.length) {
        var chain = Promise.resolve();
        data.snapshots.forEach(function (snap) {
          snap.projectId = project.id;
          chain = chain.then(function () {
            return self.save('snapshots', snap);
          });
        });
        return chain.then(function () { return project; });
      }

      return project;
    });
  };

  global.CCVersionStore = VersionStore;
})(window);
