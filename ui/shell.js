;(function () {
  function Shell(state, bus) {
    this.state = state;
    this.bus = bus;
    this.refs = null;
  }

  Shell.prototype.create = function () {
    var self = this;

    var root = document.createElement('div');
    root.className = 'cc-root';

    var toolbar = document.createElement('div');
    toolbar.className = 'cc-toolbar';

    var body = document.createElement('div');
    body.className = 'cc-body';

    var leftPanel = document.createElement('div');
    leftPanel.className = 'cc-left-panel';

    var viewport = document.createElement('div');
    viewport.className = 'cc-viewport';

    var canvas = document.createElement('div');
    canvas.className = 'cc-canvas';
    viewport.appendChild(canvas);

    var rightPanel = document.createElement('div');
    rightPanel.className = 'cc-right-panel';

    body.appendChild(leftPanel);
    body.appendChild(viewport);
    body.appendChild(rightPanel);

    var statusbar = document.createElement('div');
    statusbar.className = 'cc-statusbar';

    root.appendChild(toolbar);
    root.appendChild(body);
    root.appendChild(statusbar);

    this._addToggle(leftPanel, 'cc-left-collapsed', body);
    this._addToggle(rightPanel, 'cc-right-collapsed', body);

    this.refs = {
      root: root,
      toolbar: toolbar,
      leftPanel: leftPanel,
      viewport: viewport,
      canvas: canvas,
      rightPanel: rightPanel,
      statusbar: statusbar
    };

    return this.refs;
  };

  Shell.prototype._addToggle = function (panel, collapsedCls, body) {
    var btn = document.createElement('button');
    btn.className = 'cc-panel-toggle';
    btn.textContent = '◀';
    btn.addEventListener('click', function () {
      var collapsed = panel.classList.toggle(collapsedCls);
      btn.textContent = collapsed ? '▶' : '◀';
    });
    panel.appendChild(btn);
  };

  window.CCShell = Shell;
})();
