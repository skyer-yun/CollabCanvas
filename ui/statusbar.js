;(function () {
  function StatusBar(state, bus) {
    this.state = state;
    this.bus = bus;
    this.el = null;
    this._zoom = null;
    this._coords = null;
    this._elem = null;
    this._mode = null;
    this._version = null;
  }

  StatusBar.prototype.create = function () {
    var bar = document.createElement('div');
    bar.className = 'cc-statusbar';

    this._zoom = document.createElement('span');
    this._zoom.className = 'cc-status-item cc-status-zoom';
    this._zoom.textContent = '100%';

    this._coords = document.createElement('span');
    this._coords.className = 'cc-status-item cc-status-coords';
    this._coords.textContent = '0, 0';

    this._elem = document.createElement('span');
    this._elem.className = 'cc-status-item cc-status-elem';
    this._elem.textContent = '';

    var spacer = document.createElement('span');
    spacer.className = 'cc-status-spacer';

    this._mode = document.createElement('span');
    this._mode.className = 'cc-status-item cc-status-mode';
    this._mode.textContent = '预览';

    this._version = document.createElement('span');
    this._version.className = 'cc-status-item cc-status-version';
    this._version.textContent = 'v1.0';

    bar.appendChild(this._zoom);
    bar.appendChild(this._coords);
    bar.appendChild(this._elem);
    bar.appendChild(spacer);
    bar.appendChild(this._mode);
    bar.appendChild(this._version);

    this.el = bar;
    return bar;
  };

  StatusBar.prototype.updateZoom = function (zoom) {
    if (this._zoom) this._zoom.textContent = Math.round(zoom * 100) + '%';
  };

  StatusBar.prototype.updateCoords = function (x, y) {
    if (this._coords) this._coords.textContent = Math.round(x) + ', ' + Math.round(y);
  };

  StatusBar.prototype.updateElement = function (tag, w, h) {
    if (this._elem) {
      this._elem.textContent = tag ? tag + ' ' + Math.round(w) + '×' + Math.round(h) : '';
    }
  };

  StatusBar.prototype.updateMode = function (mode) {
    var MAP = { preview: '预览', edit: '编辑', annotate: '标注', compare: '对比' };
    if (this._mode) this._mode.textContent = MAP[mode] || (mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : '');
  };

  window.CCStatusBar = StatusBar;
})();
