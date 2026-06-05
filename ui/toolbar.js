/**
 * CollabCanvas — Toolbar v2.1
 * 2 modes (preview/edit) + annotation toggle sub-bar + import/save dropdowns
 * No emoji — all Unicode geometric symbols
 */
;(function () {
  // Annotation tool definitions (shown in sub-bar when toggle is active)
  var ANN_TOOLS = [
    { id: 'arrow',   label: '\u2192', title: '\u7BAD\u5934' },
    { id: 'rect',    label: '\u25A1', title: '\u77E9\u5F62' },
    { id: 'text',    label: 'T',      title: '\u6587\u5B57' },
    { id: 'measure', label: '\u2571', title: '\u6D4B\u91CF' },
    { id: 'sticky',  label: '\u25A3', title: '\u4FBF\u7B7E' },
    { id: 'number',  label: '\u2460', title: '\u7F16\u53F7' },
    { id: 'brush',   label: '\u270E', title: '\u753B\u7B14' },
    { id: 'mosaic',  label: '\u2592', title: '\u9A6C\u8D5B\u514B' },
    { id: 'region',  label: '\u2504', title: '\u533A\u57DF' }
  ];

  function Toolbar(state, bus) {
    this.state = state;
    this.bus = bus;
    this.el = null;
    this._pauseBtn = null;
    this._annBar = null;
    this._importDrop = null;
    this._saveDrop = null;
  }

  Toolbar.prototype.create = function () {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-toolbar';

    // ── Logo ──
    bar.innerHTML =
      '<span class="cc-toolbar-logo" data-action="home">CC</span>' +

      // ── Mode group (2 buttons: preview + edit) ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn cc-btn-mode" data-mode="preview">\u9884\u89C8</button>' +
        '<button class="cc-btn cc-btn-mode active" data-mode="edit">\u7F16\u8F91</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Undo / Redo ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="undo" title="\u64A4\u9500">\u21B6</button>' +
        '<button class="cc-btn" data-action="redo" title="\u91CD\u505A">\u21B7</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Pause ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn cc-btn-pause" data-action="pause" title="\u6682\u505C/\u6062\u590D">' +
          '<span class="cc-pause-icon">\u258C\u258C</span>' +
        '</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Annotation toggle (edit mode only) ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn cc-btn-ann-toggle" data-action="toggle-annotation" title="\u6807\u6CE8\u5DE5\u5177">\u25C0 \u6807\u6CE8</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Format ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="bold" title="\u52A0\u7C97"><b>B</b></button>' +
        '<button class="cc-btn" data-action="italic" title="\u659C\u4F53"><i>I</i></button>' +
        '<button class="cc-btn" data-action="strike" title="\u5220\u9664\u7EBF"><s>S</s></button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Zoom ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="zoom-out" title="\u7F29\u5C0F">\u2212</button>' +
        '<span class="cc-zoom-label">100%</span>' +
        '<button class="cc-btn" data-action="zoom-in" title="\u653E\u5927">+</button>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── Import dropdown ──
      '<div class="cc-toolbar-group cc-dropdown-wrap">' +
        '<button class="cc-btn" data-action="toggle-import">\u5BFC\u5165 \u25BE</button>' +
        '<div class="cc-dropdown cc-dropdown-import" style="display:none;">' +
          '<div class="cc-dropdown-item" data-action="import-html">HTML \u6587\u4EF6</div>' +
          '<div class="cc-dropdown-item" data-action="import-image">\u56FE\u7247</div>' +
          '<div class="cc-dropdown-item" data-action="import-url">\u4ECE URL \u52A0\u8F7D</div>' +
        '</div>' +
      '</div>' +

      // ── Save dropdown ──
      '<div class="cc-toolbar-group cc-dropdown-wrap">' +
        '<button class="cc-btn cc-btn-primary" data-action="toggle-save">\u4FDD\u5B58 \u25BE</button>' +
        '<div class="cc-dropdown cc-dropdown-save" style="display:none;">' +
          '<div class="cc-dropdown-item" data-action="save">\u4FDD\u5B58</div>' +
          '<div class="cc-dropdown-item" data-action="save-as">\u53E6\u5B58\u4E3A</div>' +
          '<div class="cc-dropdown-sep"></div>' +
          '<div class="cc-dropdown-item" data-action="export-html">\u5BFC\u51FA HTML</div>' +
          '<div class="cc-dropdown-item" data-action="export-png">\u5BFC\u51FA PNG</div>' +
          '<div class="cc-dropdown-item" data-action="export-md">\u5BFC\u51FA MD</div>' +
          '<div class="cc-dropdown-sep"></div>' +
          '<div class="cc-dropdown-item" data-action="version-compare">\u7248\u672C\u5BF9\u6BD4</div>' +
        '</div>' +
      '</div>' +
      '<span class="cc-toolbar-sep"></span>' +

      // ── More (help) ──
      '<div class="cc-toolbar-group">' +
        '<button class="cc-btn" data-action="help" title="\u5E2E\u52A9">?</button>' +
      '</div>' +

      // ── Right end: Settings + Close ──
      '<div class="cc-toolbar-group cc-toolbar-end">' +
        '<button class="cc-btn" data-action="settings" title="\u8BBE\u7F6E">\u2699</button>' +
        '<button class="cc-btn" data-action="close" title="\u5173\u95ED">\u2715</button>' +
      '</div>';

    // ── Annotation sub-bar (hidden by default) ──
    var annBar = document.createElement('div');
    annBar.className = 'cc-toolbar-annotate-bar';
    annBar.style.display = 'none';

    ANN_TOOLS.forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'cc-btn cc-ann-tool-btn';
      btn.dataset.annTool = t.id;
      btn.textContent = t.label;
      btn.title = t.title;
      btn.addEventListener('click', function () {
        annBar.querySelectorAll('.cc-ann-tool-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.bus.emit('annotation:tool-select', t.id);
      });
      annBar.appendChild(btn);
    });

    // Display mode toggle inside annotation bar
    var modeSep = document.createElement('span');
    modeSep.className = 'cc-toolbar-sep';
    annBar.appendChild(modeSep);

    ['full', 'compact', 'hidden'].forEach(function (m) {
      var mBtn = document.createElement('button');
      mBtn.className = 'cc-btn cc-ann-display-btn';
      mBtn.dataset.displayMode = m;
      mBtn.textContent = m === 'full' ? '\u5B8C\u6574' : m === 'compact' ? '\u7D27\u51D1' : '\u9690\u85CF';
      mBtn.title = '\u663E\u793A: ' + mBtn.textContent;
      if (m === 'full') mBtn.classList.add('active');
      mBtn.addEventListener('click', function () {
        annBar.querySelectorAll('.cc-ann-display-btn').forEach(function (b) { b.classList.remove('active'); });
        mBtn.classList.add('active');
        self.bus.emit('annotation:display-mode', m);
      });
      annBar.appendChild(mBtn);
    });

    this._annBar = annBar;

    // ── Events ──
    bar.addEventListener('click', function (e) {
      // Close any open dropdown first
      var dropdowns = bar.querySelectorAll('.cc-dropdown');
      var clickedInsideDropdown = e.target.closest('.cc-dropdown');

      // Handle dropdown toggles
      var importToggle = e.target.closest('[data-action="toggle-import"]');
      var saveToggle = e.target.closest('[data-action="toggle-save"]');

      if (importToggle) {
        var impDrop = bar.querySelector('.cc-dropdown-import');
        var wasHidden = impDrop.style.display === 'none';
        dropdowns.forEach(function (d) { d.style.display = 'none'; });
        impDrop.style.display = wasHidden ? '' : 'none';
        return;
      }

      if (saveToggle) {
        var saveDrop = bar.querySelector('.cc-dropdown-save');
        var wasHidden2 = saveDrop.style.display === 'none';
        dropdowns.forEach(function (d) { d.style.display = 'none'; });
        saveDrop.style.display = wasHidden2 ? '' : 'none';
        return;
      }

      // Close dropdowns if clicking elsewhere
      if (!clickedInsideDropdown) {
        dropdowns.forEach(function (d) { d.style.display = 'none'; });
      }

      // Handle dropdown items
      var dropItem = e.target.closest('.cc-dropdown-item');
      if (dropItem && dropItem.dataset.action) {
        dropdowns.forEach(function (d) { d.style.display = 'none'; });
        self.bus.emit('toolbar:' + dropItem.dataset.action, dropItem);
        return;
      }

      // Handle regular actions
      var btn = e.target.closest('[data-action]');
      if (btn && !importToggle && !saveToggle) {
        self.bus.emit('toolbar:' + btn.dataset.action, btn);
      }

      // Handle mode buttons
      var modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        bar.querySelectorAll('.cc-btn-mode').forEach(function (b) { b.classList.remove('active'); });
        modeBtn.classList.add('active');
        self.bus.emit('mode:change', modeBtn.dataset.mode);
      }
    });

    this._pauseBtn = bar.querySelector('[data-action="pause"]');
    this.el = bar;
    this._annBar = annBar;
    return { toolbar: bar, annBar: annBar };
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
    // Annotation toggle: only enabled in edit mode
    var annToggle = this.el.querySelector('.cc-btn-ann-toggle');
    if (annToggle) {
      if (mode === 'preview') {
        annToggle.disabled = true;
        annToggle.classList.remove('active');
        // Collapse annotation sub-bar when switching to preview
        if (this._annBar) this._annBar.style.display = 'none';
      } else {
        annToggle.disabled = false;
      }
    }
  };

  /**
   * Toggle annotation sub-bar visibility.
   * Called from main.js via toolbar:toggle-annotation event.
   */
  Toolbar.prototype._toggleAnnotationBar = function () {
    if (!this._annBar) return;
    var isVisible = this._annBar.style.display !== 'none';
    this._annBar.style.display = isVisible ? 'none' : 'flex';
    // Update toggle button active state
    var annToggle = this.el.querySelector('.cc-btn-ann-toggle');
    if (annToggle) {
      annToggle.classList.toggle('active', !isVisible);
    }
    // When collapsing, deactivate active tool
    if (isVisible) {
      this._annBar.querySelectorAll('.cc-ann-tool-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      this.bus.emit('annotation:tool-deactivate');
    }
    return !isVisible; // return new state
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
      var icon = this._pauseBtn.querySelector('.cc-pause-icon');
      if (icon) {
        icon.textContent = paused ? '\u25B6' : '\u258C\u258C';
      }
      this._pauseBtn.classList.toggle('cc-btn-active', paused);
    }
    this.bus.emit('pause:toggle', paused);
  };

  window.CCToolbar = Toolbar;
})();
