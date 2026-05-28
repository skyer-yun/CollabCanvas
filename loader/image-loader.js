/**
 * CollabCanvas - Image Loader Module
 * Load images from File or URL onto the canvas
 * IIFE exporting to window.CCImageLoader
 */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} canvas - The main canvas element
   * @param {object} app - App reference with notify/getState methods
   */
  function ImageLoader(canvas, app) {
    this._canvas = canvas;
    this._app = app;
  }

  /**
   * Load an image from a File object and place on canvas.
   * @param {File} file - Image file from input
   * @returns {Promise<HTMLElement>}
   */
  ImageLoader.prototype.load = function (file) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        self._placeImage(e.target.result, file.name).then(resolve, reject);
      };
      reader.onerror = function () {
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Load an image from a URL and place on canvas.
   * @param {string} url - Image URL
   * @returns {Promise<HTMLElement>}
   */
  ImageLoader.prototype.loadURL = function (url) {
    return this._placeImage(url, url.split('/').pop() || 'image');
  };

  /**
   * Create an img element and place it on the canvas.
   * @param {string} src - Image source (data URL or remote URL)
   * @param {string} name - Display name
   * @returns {Promise<HTMLElement>}
   */
  ImageLoader.prototype._placeImage = function (src, name) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = name || 'image';
      img.className = 'cc-canvas-image';
      img.setAttribute('data-name', name);
      img.style.maxWidth = '100%';
      img.style.position = 'absolute';
      img.style.left = '20px';
      img.style.top = '20px';
      img.style.cursor = 'move';
      img.draggable = true;

      img.onload = function () {
        self._canvas.appendChild(img);
        if (self._app && typeof self._app.notify === 'function') {
          self._app.notify('Image loaded: ' + name);
        }
        resolve(img);
      };

      img.onerror = function () {
        reject(new Error('Failed to load image: ' + name));
      };
    });
  };

  global.CCImageLoader = ImageLoader;
})(window);
