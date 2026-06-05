;(function () {
  function Toast() {
    this._container = null;
  }

  Toast.prototype._ensureContainer = function () {
    if (this._container) return this._container;
    var c = document.querySelector('.cc-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'cc-toast-container';
      document.body.appendChild(c);
    }
    this._container = c;
    return c;
  };

  Toast.prototype.show = function (msg, type) {
    type = type || 'info';
    var container = this._ensureContainer();

    var el = document.createElement('div');
    el.className = 'cc-toast cc-toast-' + type;
    el.textContent = msg;
    container.appendChild(el);

    setTimeout(function () {
      el.classList.add('cc-toast-fade');
    }, 1500);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
  };

  window.CCToast = Toast;
})();
