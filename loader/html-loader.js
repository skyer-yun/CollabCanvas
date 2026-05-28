/**
 * CollabCanvas - HTML Loader Module
 * Load HTML from URL or File into the canvas
 * IIFE exporting to window.CCHTMLLoader
 */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} canvas - The main canvas element
   * @param {object} app - App reference with notify/addPage methods
   */
  function HTMLLoader(canvas, app) {
    this._canvas = canvas;
    this._app = app;
  }

  /**
   * Load HTML from a URL and inject into canvas.
   * @param {string} url - URL to fetch HTML from
   * @returns {Promise<HTMLElement>}
   */
  HTMLLoader.prototype.loadURL = function (url) {
    var self = this;
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
        return res.text();
      })
      .then(function (html) {
        return self._inject(html);
      });
  };

  /**
   * Load HTML from a File object and inject into canvas.
   * @param {File} file - File object from input
   * @returns {Promise<HTMLElement>}
   */
  HTMLLoader.prototype.loadFile = function (file) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var result = self._inject(e.target.result);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  };

  /**
   * Parse HTML string and inject content into canvas.
   * Preserves existing page structure by appending, not replacing.
   * @param {string} html - Raw HTML string
   * @returns {HTMLElement} The injected wrapper element
   */
  HTMLLoader.prototype._inject = function (html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var body = doc.body;

    // Create wrapper to isolate imported content
    var wrapper = document.createElement('div');
    wrapper.className = 'cc-imported-content';
    wrapper.setAttribute('data-imported-at', new Date().toISOString());

    // Copy nodes from parsed body
    var children = body.children;
    for (var i = 0; i < children.length; i++) {
      // Deep clone to detach from parsed document
      wrapper.appendChild(children[i].cloneNode(true));
    }

    // If there are text nodes, capture them too
    if (body.textContent && body.textContent.trim() && children.length === 0) {
      wrapper.textContent = body.textContent;
    }

    // Inject into canvas (append to preserve existing content)
    this._canvas.appendChild(wrapper);

    // Notify app
    if (this._app && typeof this._app.notify === 'function') {
      this._app.notify('HTML loaded: ' + wrapper.children.length + ' elements');
    }

    return wrapper;
  };

  /**
   * Replace canvas content entirely with new HTML.
   * @param {string} html - Raw HTML string
   */
  HTMLLoader.prototype.replace = function (html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    this._canvas.innerHTML = doc.body.innerHTML;
  };

  global.CCHTMLLoader = HTMLLoader;
})(window);
