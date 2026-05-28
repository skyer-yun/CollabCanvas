/**
 * CollabCanvas — Canvas Wrapper
 * 将宿主页面内容包裹进 .cc-canvas 容器，提供无限画布挂载点
 */
(function() {
  'use strict';

  /**
   * @param {StateManager} state
   * @param {EventBus}     eventBus
   * @param {object}       domUtils  — DomUtils.$ / DomUtils.$$
   */
  function CanvasWrapper(state, eventBus, domUtils) {
    this._state = state;
    this._bus   = eventBus;
    this._dom   = domUtils;
  }

  /**
   * Take an existing host element (page content), wrap it into a .cc-canvas div,
   * and insert a .cc-canvas-wrapper around both.
   *
   * @param  {HTMLElement} hostCanvas  — the element containing page content
   * @return {HTMLElement} the .cc-canvas element now wrapping the content
   */
  CanvasWrapper.prototype.wrapCanvas = function(hostCanvas) {
    if (!hostCanvas) {
      console.error('[CC CanvasWrapper] wrapCanvas: hostCanvas is null');
      return null;
    }

    var parent = hostCanvas.parentElement;
    if (!parent) {
      console.error('[CC CanvasWrapper] wrapCanvas: hostCanvas has no parent');
      return null;
    }

    // 1. Create wrapper (overflow container)
    var wrapper = document.createElement('div');
    wrapper.className = 'cc-canvas-wrapper';
    wrapper.style.cssText =
      'position:relative;width:100%;height:100%;overflow:hidden;';

    // 2. Create canvas (transform target)
    var canvas = document.createElement('div');
    canvas.className = 'cc-canvas';
    canvas.style.cssText =
      'position:absolute;top:0;left:0;transform-origin:0 0;';

    // 3. Preserve all child nodes from host into canvas
    while (hostCanvas.firstChild) {
      canvas.appendChild(hostCanvas.firstChild);
    }

    // 4. If host had positioning or sizing, transfer to canvas
    var hostStyle = getComputedStyle(hostCanvas);
    if (hostStyle.width  && hostStyle.width  !== 'auto') canvas.style.width  = hostStyle.width;
    if (hostStyle.height && hostStyle.height !== 'auto') canvas.style.height = hostStyle.height;

    // 5. Assemble: replace host with wrapper > canvas
    wrapper.appendChild(canvas);
    parent.replaceChild(wrapper, hostCanvas);

    // 6. Store references in state
    this._state.set('canvas.wrapper', wrapper);
    this._state.set('canvas.canvas',  canvas);

    this._bus.emit('canvas:ready', { wrapper: wrapper, canvas: canvas });

    return canvas;
  };

  /**
   * Remove the wrapper, restore original content back into the host element.
   * @param {HTMLElement} originalHost  — the original host element to restore into
   */
  CanvasWrapper.prototype.unwrapCanvas = function(originalHost) {
    var wrapper = this._state.get('canvas.wrapper');
    var canvas  = this._state.get('canvas.canvas');

    if (!wrapper || !canvas) return;

    var parent = wrapper.parentElement;
    if (!parent) return;

    // Move children back to original host
    while (canvas.firstChild) {
      originalHost.appendChild(canvas.firstChild);
    }

    parent.replaceChild(originalHost, wrapper);

    this._state.set('canvas.wrapper', null);
    this._state.set('canvas.canvas',  null);

    this._bus.emit('canvas:destroyed');
  };

  // ---- Export ----
  window.CCCanvasWrapper = CanvasWrapper;
})();
