;(function () {
  var ACTION_MAP = {
    'z-top':    { label: '置于顶层',  icon: '↑↑' },
    'z-bottom': { label: '置于底层',  icon: '↓↓' },
    'z-up':     { label: '上移一层',  icon: '↑' },
    'z-down':   { label: '下移一层',  icon: '↓' },
    copy:       { label: '复制',      icon: '⎘' },
    cut:        { label: '剪切',      icon: '✂' },
    paste:      { label: '粘贴',      icon: '📋' },
    delete:     { label: '删除',      icon: '✕' },
    'promote-to-annotation': { label: '转为标注', icon: '◉' }
  };

  var Z_GROUP = ['z-top', 'z-bottom', 'z-up', 'z-down'];
  var EDIT_GROUP = ['copy', 'cut', 'paste', 'delete'];

  function ContextMenu(state, bus) {
    this.state = state;
    this.bus = bus;
    this.el = null;
  }

  ContextMenu.prototype.show = function (e, targetEl, actions) {
    this.remove();

    e.preventDefault();
    e.stopPropagation();

    var menu = document.createElement('div');
    menu.className = 'cc-context-menu';

    this._addGroup(menu, Z_GROUP, actions, targetEl);
    this._addSeparator(menu);
    this._addGroup(menu, EDIT_GROUP, actions, targetEl);

    // Extra actions (e.g. "promote sticky to annotation")
    var extraKeys = Object.keys(actions).filter(function (k) {
      return Z_GROUP.indexOf(k) < 0 && EDIT_GROUP.indexOf(k) < 0;
    });
    if (extraKeys.length) {
      this._addSeparator(menu);
      this._addGroup(menu, extraKeys, actions, targetEl);
    }

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    document.body.appendChild(menu);
    this.el = menu;

    var self = this;
    setTimeout(function () {
      document.addEventListener('click', self._boundClose = function () { self.remove(); });
      document.addEventListener('contextmenu', self._boundCtx = function () { self.remove(); });
    }, 0);
  };

  ContextMenu.prototype._addGroup = function (menu, group, actions, targetEl) {
    var self = this;
    group.forEach(function (key) {
      if (!actions || !actions[key]) return;
      var item = document.createElement('div');
      item.className = 'cc-context-item';
      var info = ACTION_MAP[key] || { label: key, icon: '' };
      item.innerHTML = '<span class="cc-context-icon">' + info.icon + '</span>' +
                       '<span class="cc-context-label">' + info.label + '</span>';
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        self.remove();
        actions[key](targetEl);
      });
      menu.appendChild(item);
    });
  };

  ContextMenu.prototype._addSeparator = function (menu) {
    var sep = document.createElement('div');
    sep.className = 'cc-context-sep';
    menu.appendChild(sep);
  };

  ContextMenu.prototype.remove = function () {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    if (this._boundClose) document.removeEventListener('click', this._boundClose);
    if (this._boundCtx) document.removeEventListener('contextmenu', this._boundCtx);
    this._boundClose = null;
    this._boundCtx = null;
  };

  window.CCContextMenu = ContextMenu;
})();
