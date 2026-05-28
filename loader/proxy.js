/**
 * CollabCanvas - Proxy Helper Module
 * Fetch URLs with extension background fallback
 * IIFE exporting to window.CCProxyHelper
 */
(function (global) {
  'use strict';

  var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  /**
   * ProxyHelper class
   * Attempts direct fetch, falls back to extension messaging.
   */
  function ProxyHelper() {}

  /**
   * Fetch a URL, trying direct request first.
   * Falls back to extension background service worker on CORS failure.
   * @param {string} url - URL to fetch
   * @param {object} [options] - Fetch options
   * @returns {Promise<Response>}
   */
  ProxyHelper.prototype.fetch = function (url, options) {
    var self = this;

    return fetch(url, options).catch(function (err) {
      if (IS_EXTENSION) {
        return self._fetchViaExtension(url, options);
      }
      throw err;
    });
  };

  /**
   * Fetch via extension background service worker.
   */
  ProxyHelper.prototype._fetchViaExtension = function (url, options) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        {
          type: 'PROXY_FETCH',
          url: url,
          options: {
            method: (options && options.method) || 'GET',
            headers: (options && options.headers) || {}
          }
        },
        function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error('Proxy fetch failed: ' + (response && response.statusText)));
            return;
          }
          resolve(new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers || {})
          }));
        }
      );
    });
  };

  /** Check if running in extension context. */
  ProxyHelper.prototype.isExtension = function () {
    return IS_EXTENSION;
  };

  global.CCProxyHelper = ProxyHelper;
})(window);
