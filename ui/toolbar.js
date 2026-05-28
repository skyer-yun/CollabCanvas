;(function () {
  function Toolbar(state, bus) {
    this.state = state;
    this.bus = bus;
    this.el = null;
    this._pauseBtn = null;
  }

  Toolbar.prototype.create = function () {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-toolbar';

    bar.innerHTML =
      '<span class="cc-toolbar-logo" data-action="home">CC</span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn cc-btn-mode" data-mode="preview">预览</button>' +
        '<button class="cc-btn cc-btn-mode active" data-mode="edit">编辑</button>' +
        '<button class="cc-btn cc-btn-mode" data-mode="annotate">标注</button>' +
        '<button class="cc-btn cc-btn-mode" data-mode="compare">对比</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="undo" title="撤销">↶</button>' +
        '<button class="cc-btn" data-action="redo" title="重做">↷</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn cc-btn-pause" data-action="pause" title="暂停/恢复">⏸</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="bold" title="加粗"><b>B</b></button>' +
        '<button class="cc-btn" data-action="italic" title="斜体"><i>I</i></button>' +
        '<button class="cc-btn" data-action="strike" title="删除线"><s>S</s></button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="zoom-out" title="缩小">−</button>' +
        '<span class="cc-zoom-label">100%</span>' +
        '<button class="cc-btn" data-action="zoom-in" title="放大">+</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="import">导入</button>' +
        '<button class="cc-btn" data-action="export">导出</button>' +
        '<button class="cc-btn" data-action="image">图片</button>' +
        '<button class="cc-btn cc-btn-primary" data-action="save">保存</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="toggle-sticky" title="显示/隐藏便签">📝</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +
      '<div class="cc-toolbar-group cc-toolbar-end">' +
        '<button class="cc-btn" data-action="settings" title="设置">\u2699</button>' +
        '<button class="cc-btn" data-action="help" title="帮助">?</button>' +
        '<button class="cc-btn" data-action="close" title="关闭">\u2715</button>' +
      '</div>';

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (btn) self.bus.emit('toolbar:' + btn.dataset.action, btn);

      var modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        bar.querySelectorAll('.cc-btn-mode').forEach(function (b) { b.classList.remove('active'); });
        modeBtn.classList.add('active');
        // Let ModeMachine handle state change via mode:change event
        self.bus.emit('mode:change', modeBtn.dataset.mode);
      }
    });

    this._pauseBtn = bar.querySelector('[data-action="pause"]');
    this.el = bar;
    return bar;
  };

  Toolbar.prototype.updateBadge = function () {
    var badge = this.el.querySelector('.cc-toolbar-logo');
    if (!badge) return;
    var mode = this.state.get('mode.current') || 'edit';
    badge.setAttribute('data-badge', mode.charAt(0).toUpperCase());
  };

  Toolbar.prototype.updateModeButtons = function (mode) {
    if (!this.el) return;
    this.el.querySelectorAll('.cc-btn-mode').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
  };

  Toolbar.prototype.updateFormatButtons = function (el) {
    if (!el) return;
    this._toggleBtn('bold', el.style.fontWeight === 'bold');
    this._toggleBtn('italic', el.style.fontStyle === 'italic');
    this._toggleBtn('strike', el.style.textDecoration && el.style.textDecoration.indexOf('line-through') >= 0);
  };

  Toolbar.prototype._toggleBtn = function (action, active) {
    var btn = this.el.querySelector('[data-action="' + action + '"]');
    if (btn) btn.classList.toggle('active', !!active);
  };

  Toolbar.prototype.updateZoomLabel = function () {
    var label = this.el.querySelector('.cc-zoom-label');
    if (label) label.textContent = Math.round((this.state.get('canvas.zoom') || 1) * 100) + '%';
  };

  Toolbar.prototype.togglePause = function () {
    var paused = !(this.state.get('mode.paused'));
    this.state.set('mode.paused', paused);
    if (this._pauseBtn) {
      this._pauseBtn.textContent = paused ? '▶' : '⏸';
      this._pauseBtn.classList.toggle('cc-btn-active', paused);
    }
    this.bus.emit('pause:toggle', paused);
  };

  window.CCToolbar = Toolbar;
})();
