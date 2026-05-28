/**
 * CollabCanvas - Archive Loader Module
 * Load ZIP archives or multiple HTML files into the project
 * IIFE exporting to window.CCArchiveLoader
 */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} canvas - The main canvas element
   * @param {object} app - App reference with addPage/notify methods
   */
  function ArchiveLoader(canvas, app) {
    this._canvas = canvas;
    this._app = app;
  }

  /**
   * Load from a ZIP file (requires JSZip) or fallback to individual files.
   * @param {File|FileList} input - ZIP file or FileList of HTML files
   * @returns {Promise<object>} { pages: [], errors: [] }
   */
  ArchiveLoader.prototype.load = function (input) {
    var self = this;

    // FileList (multiple files selected)
    if (input instanceof FileList || (input && input.length && !(input instanceof File))) {
      return this._loadMultipleFiles(input);
    }

    // Single ZIP file
    if (input instanceof File && input.name && input.name.toLowerCase().endsWith('.zip')) {
      return this._loadZip(input);
    }

    // Single HTML file
    if (input instanceof File) {
      return this._loadSingleFile(input);
    }

    return Promise.reject(new Error('Unsupported input type'));
  };

  /**
   * Load a ZIP file using JSZip if available, otherwise reject with guidance.
   */
  ArchiveLoader.prototype._loadZip = function (file) {
    if (typeof JSZip === 'undefined') {
      // Fallback: suggest using multi-file selection instead
      return Promise.reject(
        new Error('JSZip not loaded. Please select multiple HTML files instead of a ZIP archive.')
      );
    }

    var self = this;
    var pages = [];
    var errors = [];

    return JSZip.loadAsync(file).then(function (zip) {
      var promises = [];

      zip.forEach(function (relativePath, zipEntry) {
        if (zipEntry.dir) return;
        if (!relativePath.toLowerCase().match(/\.html?$/)) return;

        var p = zipEntry.async('string').then(function (content) {
          var page = self._createPage(relativePath, content);
          pages.push(page);
        }).catch(function (err) {
          errors.push({ file: relativePath, error: err.message });
        });

        promises.push(p);
      });

      return Promise.all(promises);
    }).then(function () {
      self._notify(pages.length + ' pages loaded from archive');
      return { pages: pages, errors: errors };
    });
  };

  /**
   * Load multiple HTML files from a FileList.
   */
  ArchiveLoader.prototype._loadMultipleFiles = function (fileList) {
    var self = this;
    var pages = [];
    var errors = [];
    var promises = [];

    for (var i = 0; i < fileList.length; i++) {
      (function (file) {
        var p = self._readFile(file).then(function (content) {
          var page = self._createPage(file.name, content);
          pages.push(page);
        }).catch(function (err) {
          errors.push({ file: file.name, error: err.message });
        });
        promises.push(p);
      })(fileList[i]);
    }

    return Promise.all(promises).then(function () {
      self._notify(pages.length + ' pages loaded');
      return { pages: pages, errors: errors };
    });
  };

  /** Load a single file. */
  ArchiveLoader.prototype._loadSingleFile = function (file) {
    var self = this;
    return this._readFile(file).then(function (content) {
      var page = self._createPage(file.name, content);
      self._notify('1 page loaded: ' + file.name);
      return { pages: [page], errors: [] };
    });
  };

  /** Read a File as text. */
  ArchiveLoader.prototype._readFile = function (file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error('Failed to read ' + file.name)); };
      reader.readAsText(file);
    });
  };

  /** Create a page record from file content. */
  ArchiveLoader.prototype._createPage = function (fileName, htmlContent) {
    var parts = fileName.replace(/\\/g, '/').split('/');
    var name = parts[parts.length - 1].replace(/\.html?$/i, '');
    var module = parts.length > 1 ? parts[0] : '';

    return {
      id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name,
      module: module,
      html: htmlContent,
      path: fileName
    };
  };

  /** Send notification via app. */
  ArchiveLoader.prototype._notify = function (msg) {
    if (this._app && typeof this._app.notify === 'function') {
      this._app.notify(msg);
    }
  };

  global.CCArchiveLoader = ArchiveLoader;
})(window);
