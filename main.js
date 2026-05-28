/**
 * CollabCanvas — Main Entry (Standalone Version)
 * 独立版入口，通过 <script> 标签加载
 * 加载所有模块 → 创建实例 → 绑定事件 → 暴露 __CC 门面
 */
(function() {
  'use strict';

  // Guard: prevent double init
  if (window.__cc) return;
  window.__cc = true;

  var CC = window.__CC = {};

  // ==================== Initialization ====================
  function init() {
    // Layer 0: EventBus + DomUtils (no dependencies)
    var bus = CC.bus = new CCEventBus();
    var dom = CC.dom = CCDomUtils;

    // Layer 1: State
    var state = CC.state = new CCStateManager(bus);

    // Layer 2: Engine core
    var changeTracker = CC.changeTracker = new CCChangeTracker(state, bus);
    var textEdit = CC.textEdit = new CCTextEditor(state, bus);
    var selection = CC.selection = new CCSelectionManager(state, bus, dom, textEdit);

    // Layer 3: Engine modules
    var align = CC.align = new CCAlignManager(state, bus, dom, changeTracker);
    var transform = CC.transform = new CCTransformManager(state, bus, dom, changeTracker);
    var group = CC.group = new CCGroupManager(state, bus, dom, changeTracker, selection);
    var clipboard = CC.clipboard = new CCClipboardManager(state, bus, dom, changeTracker, selection);
    var zorder = CC.zorder = new CCZOrderManager(state, bus, dom, changeTracker);
    var factory = CC.factory = new CCElementFactory(state, bus, dom, changeTracker);
    var renderer = CC.renderer = new CCComponentRenderer(state, bus, dom);
    var extractor = CC.extractor = new CCPageExtractor(state, bus, dom, factory, renderer);
    var canvas = CC.canvas = new CCInfiniteCanvas(state, bus, dom);
    var canvasWrapper = CC.canvasWrapper = new CCCanvasWrapper(state, bus, dom);

    // Layer 4: Undo/Redo
    var undoRedo = CC.undoRedo = new CCUndoRedoManager(state, bus, dom);

    // Layer 5: Export
    var exportEngine = CC.export = new CCExportEngine(state, bus, dom);

    // Layer 6: UI
    var toast = CC.toast = new CCToast();
    var modal = CC.modal = new CCModal();
    var contextMenu = CC.contextMenu = new CCContextMenu(state, bus);
    var shell = CC.shell = new CCShell(state, bus);
    var toolbar = CC.toolbar = new CCToolbar(state, bus);
    var leftPanel = CC.leftPanel = new CCLeftPanel(state, bus);
    var rightPanel = CC.rightPanel = new CCRightPanel(state, bus);
    var statusbar = CC.statusbar = new CCStatusBar(state, bus);

    // Mode + Keyboard
    var modeMachine = CC.modeMachine = new CCModeMachine(state, bus);
    var keyboard = CC.keyboard = new CCKeyboard(state, bus);

    // ==================== Setup DOM ====================
    // Build shell (returns {root, toolbar, leftPanel, viewport, canvas, rightPanel, statusbar})
    var shellResult = shell.create();
    var toolbarEl = toolbar.create();
    var leftResult = leftPanel.create();
    var rightResult = rightPanel.create();
    var statusbarEl = statusbar.create();

    // Assemble layout: replace shell placeholder elements with actual UI components
    shellResult.toolbar.replaceWith(toolbarEl);
    shellResult.leftPanel.replaceWith(leftResult.container);
    shellResult.rightPanel.replaceWith(rightResult.container);
    shellResult.statusbar.replaceWith(statusbarEl);

    // Store canvas reference FIRST (needed before moving children)
    var canvasEl = shellResult.canvas;

    // Mount to document
    // Move existing body children into the canvas, then run extractor
    var existingChildren = [];
    for (var ci = document.body.childNodes.length - 1; ci >= 0; ci--) {
      var child = document.body.childNodes[ci];
      // Skip our CSS link and script tags
      if (child.nodeType !== 1) continue;
      if (child.tagName === 'LINK' || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
      if (child.classList && child.classList.contains('cc-root')) continue;
      existingChildren.push(child);
    }
    // First move all children into canvas
    existingChildren.forEach(function(child) {
      canvasEl.appendChild(child);
    });
    // Then run the page extractor to classify + componentize + convertToAbsolute
    if (existingChildren.length > 0 && CCPageExtractor) {
      extractor.extractPage(canvasEl);
    }

    document.body.appendChild(shellResult.root);

    // Store canvas/viewport references in state
    state.set('canvas.viewport', shellResult.viewport);
    state.set('canvas.canvas', shellResult.canvas);
    state.set('canvas.wrapper', shellResult.viewport);
    state.set('bar', toolbarEl);
    state.set('panel', rightResult.container);

    // Bind canvas pan/zoom events (Space+drag, Ctrl+wheel)
    canvas.bindEvents();

    // ==================== Create Tab Instances ====================
    var layersTab = new CCLayersTab(state, bus);
    var componentsTab = new CCComponentsTab(state, bus);
    var propertiesTab = new CCPropertiesTab(state, bus);
    var changesTab = new CCChangesTab(state, bus);
    var notesAnnotationsTab = null;
    if (typeof CCNotesAnnotationsTab !== 'undefined') notesAnnotationsTab = new CCNotesAnnotationsTab(state, bus);

    // Phase 2 tabs (may or may not be loaded)
    var annotationsTab = null;
    var stylesTab = null;
    if (typeof CCAnnotationsTab !== 'undefined') annotationsTab = new CCAnnotationsTab(state, bus);
    if (typeof CCStylesTab !== 'undefined') stylesTab = new CCStylesTab(state, bus);

    // Phase 3 tabs
    var pagesTab = null;
    var versionsTab = null;

    // Annotation system instances
    var annotator = CC.annotator = new CCAnnotator(state, bus);
    var annotationTools = CC.annotationTools = new CCAnnotationTools(state, bus);
    var annotationRenderer = CC.annotationRenderer = new CCAnnotationRenderer(state);

    // Token system instances (Phase 2 optional)
    var tokenExtractor = null;
    var tokenizer = null;
    var tokenImporter = null;
    if (typeof CCTokenExtractor !== 'undefined') { tokenExtractor = CC.tokenExtractor = new CCTokenExtractor(); }
    if (typeof CCTokenizer !== 'undefined') { tokenizer = CC.tokenizer = new CCTokenizer(state); }
    if (typeof CCTokenImporter !== 'undefined') { tokenImporter = CC.tokenImporter = new CCTokenImporter(); }

    // Version system instances
    var snapshot = null;
    var versionDiffer = null;
    if (typeof CCSnapshot !== 'undefined') {
      snapshot = CC.snapshot = new CCSnapshot(canvasEl, function() { return state.getAll(); });
    }
    if (typeof CCVersionDiffer !== 'undefined') {
      versionDiffer = CC.versionDiffer = new CCVersionDiffer();
    }

    // Pages/versions app facade (minimal impl for tab compatibility)
    var appFacade = CC.app = {
      pages: state.get('pages.list') || [],
      currentPage: null,
      snapshot: snapshot,
      differ: versionDiffer,
      addPage: function(name) {
        var pages = state.get('pages.list') || [];
        var id = 'page-' + Date.now();
        pages.push({ id: id, name: name, module: '', html: '' });
        state.set('pages.list', pages);
        appFacade.pages = pages;
        toast.show('页面「' + name + '」已添加', 'success');
      },
      renamePage: function(id, name) {
        var pages = state.get('pages.list') || [];
        for (var i = 0; i < pages.length; i++) {
          if (pages[i].id === id) { pages[i].name = name; break; }
        }
        state.set('pages.list', pages);
        appFacade.pages = pages;
      },
      deletePage: function(id) {
        var pages = state.get('pages.list') || [];
        pages = pages.filter(function(p) { return p.id !== id; });
        state.set('pages.list', pages);
        appFacade.pages = pages;
      },
      switchPage: function(id) {
        appFacade.currentPage = id;
        toast.show('已切换到页面', 'info');
      },
      importPages: function(files) {
        // Delegate to toolbar:import for each file
        if (!files || !files.length) return;
        var count = 0;
        Array.from(files).forEach(function(file) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            var name = file.name.replace(/\.[^.]+$/, '');
            appFacade.addPage(name);
            count++;
          };
          reader.readAsText(file);
        });
        toast.show('已导入 ' + files.length + ' 个文件', 'success');
      },
      restoreSnapshot: function(id) {
        if (snapshot) {
          var snap = snapshot.get(id);
          if (snap) {
            canvasEl.innerHTML = snap.html;
            toast.show('已恢复快照', 'success');
          }
        }
      }
    };

    // Instantiate pages/versions tabs with app facade
    if (typeof CCPagesTab !== 'undefined') pagesTab = new CCPagesTab(appFacade);
    if (typeof CCVersionsTab !== 'undefined') versionsTab = new CCVersionsTab(appFacade);

    // Compare engine
    var compareEngine = null;
    if (typeof CCCompareEngine !== 'undefined') compareEngine = CC.compareEngine = new CCCompareEngine(state, bus);

    // Component dialog instance
    var componentDialog = CC.componentDialog = new CCComponentDialog(state, bus, modal);

    // Settings dialog instance (Phase: Settings Center)
    var settingsDialog = null;
    if (typeof CCSettingsDialog !== 'undefined') {
      settingsDialog = CC.settingsDialog = new CCSettingsDialog(state, bus, modal, toast);
    }

    // Render tabs into their containers
    if (leftResult.tabBodies.layers) layersTab.render(leftResult.tabBodies.layers);
    if (leftResult.tabBodies.components) componentsTab.render(leftResult.tabBodies.components);
    if (leftResult.tabBodies.annotations && annotationsTab) annotationsTab.render(leftResult.tabBodies.annotations);
    if (leftResult.tabBodies.pages && pagesTab) pagesTab.render(leftResult.tabBodies.pages);
    if (rightResult.tabBodies.properties) propertiesTab.render(rightResult.tabBodies.properties);
    if (rightResult.tabBodies.changes) changesTab.render(rightResult.tabBodies.changes);
    if (rightResult.tabBodies.notes && notesAnnotationsTab) notesAnnotationsTab.render(rightResult.tabBodies.notes);
    if (rightResult.tabBodies.styles && stylesTab) stylesTab.render(rightResult.tabBodies.styles);
    if (rightResult.tabBodies.versions && versionsTab) versionsTab.render(rightResult.tabBodies.versions);

    // ==================== Wire Canvas Events ====================

    // mousedown on canvas: select / place element
    canvasEl.addEventListener('mousedown', function(e) {
      if (state.paused || modeMachine.current() !== 'edit') return;
      if (dom.isEditorEl(e.target)) return;

      var target = e.target;

      // Placing mode
      var placingType = state.get('placement.type');
      if (placingType) {
        var pos = canvas.screenToCanvas(e.clientX, e.clientY);
        factory.createElementAt(placingType, pos.x, pos.y);
        state.set('placement.type', null);
        canvasEl.style.cursor = 'default';
        canvasEl.classList.remove('cc-placing');
        return;
      }

      // Select element
      if (e.shiftKey && state.selected) {
        selection.toggleMultiSelect(target);
      } else if (dom.isCanvasChild(target)) {
        selection.select(target);
        transform.createResizeHandles();
        transform.createRotateHandle();
      } else {
        selection.deselect();
        transform.removeResizeHandles();
        transform.removeRotateHandle();
      }

      // Start drag if element selected
      if (state.selected && state.selected.contains(target)) {
        transform.onDragMoveStart(e);
      }
    });

    // mousemove: drag handling
    document.addEventListener('mousemove', function(e) {
      // Update clipboard mouse position
      state.set('clipboard.mousePos', { x: e.clientX, y: e.clientY });

      // Handle active drag
      if (state.get('drag')) {
        transform.handleDragMove(e);
      }
    });

    // mouseup: end drag
    document.addEventListener('mouseup', function(e) {
      if (state.get('drag')) {
        transform.handleDragEnd(e);
      }
    });

    // Double click → component dialog or inline text edit
    canvasEl.addEventListener('dblclick', function(e) {
      if (state.paused || modeMachine.current() !== 'edit') return;
      if (dom.isEditorEl(e.target)) return;
      var target = e.target;
      if (dom.isCanvasChild(target)) {
        // Try component dialog first
        if (componentDialog && componentDialog.open(target)) {
          return;
        }
        // Fall back to inline text edit
        textEdit.startInlineEdit(target);
      }
    });

    // Right click → context menu
    canvasEl.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      if (state.paused) return;

      var actions = {
        'z-top': function() { zorder.bringToFront(state.selected); },
        'z-bottom': function() { zorder.sendToBack(state.selected); },
        'z-up': function() { zorder.bringForward(state.selected); },
        'z-down': function() { zorder.sendBackward(state.selected); },
        copy: function() { clipboard.copySelected(); },
        cut: function() { clipboard.cutSelected(); },
        paste: function() { clipboard.pasteClipboard(); },
        delete: function() { deleteSelected(); }
      };

      // If target is a sticky element, add "promote to annotation" action
      var stickyEl = e.target.closest('[data-type="sticky"]');
      if (stickyEl && annotator) {
        actions['promote-to-annotation'] = function() {
          _promoteStickyToAnnotation(stickyEl);
        };
      }

      contextMenu.show(e, e.target, actions);
    });

    // Click outside → deselect + close context menu
    document.addEventListener('mousedown', function(e) {
      if (dom.isEditorEl(e.target)) return;
      if (!shellResult.root.contains(e.target)) {
        selection.deselect();
        transform.removeResizeHandles();
        transform.removeRotateHandle();
      }
      contextMenu.remove();
    });

    // Wheel → zoom
    shellResult.viewport.addEventListener('wheel', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        canvas.handleWheel(e);
      }
    }, { passive: false });

    // ==================== Wire Keyboard Events ====================
    keyboard.setup();

    bus.on('keyboard:undo', function() { undoRedo.undo(); });
    bus.on('keyboard:redo', function() { undoRedo.redo(); });
    bus.on('keyboard:save', function() { exportEngine.saveFile(); });
    bus.on('keyboard:export', function() { exportEngine.exportInstructions(); });
    bus.on('keyboard:togglePause', function() { modeMachine.togglePause(); });
    bus.on('keyboard:copy', function() { clipboard.copySelected(); });
    bus.on('keyboard:cut', function() { clipboard.cutSelected(); });
    bus.on('keyboard:paste', function() { clipboard.pasteClipboard(); });
    bus.on('keyboard:bold', function() { toggleFormat('bold'); });
    bus.on('keyboard:italic', function() { toggleFormat('italic'); });
    bus.on('keyboard:duplicate', function() { clipboard.copySelected(); clipboard.pasteClipboard(); });
    bus.on('keyboard:group', function() { group.groupSelected(); });
    bus.on('keyboard:ungroup', function() { group.ungroupSelected(); });
    bus.on('keyboard:z-up', function() { zorder.bringForward(state.selected); });
    bus.on('keyboard:z-down', function() { zorder.sendBackward(state.selected); });
    bus.on('keyboard:z-top', function() { zorder.bringToFront(state.selected); });
    bus.on('keyboard:z-bottom', function() { zorder.sendToBack(state.selected); });
    bus.on('keyboard:zoom-in', function() { canvas.setZoom((state.zoom || 1) + 0.1); });
    bus.on('keyboard:zoom-out', function() { canvas.setZoom((state.zoom || 1) - 0.1); });
    bus.on('keyboard:zoom-reset', function() { canvas.setZoom(1); });
    bus.on('keyboard:delete', function() { deleteSelected(); });
    bus.on('keyboard:escape', function() {
      if (state.get('placement.type')) {
        state.set('placement.type', null);
        canvasEl.style.cursor = 'default';
        canvasEl.classList.remove('cc-placing');
      } else {
        selection.deselect();
        transform.removeResizeHandles();
        transform.removeRotateHandle();
      }
    });
    bus.on('keyboard:help', function() { showHelp(); });

    // Nudge: 8 directional events from keyboard
    var NUDGE_MAP = {
      'keyboard:nudge-up':        { dx: 0, dy: -1 },
      'keyboard:nudge-down':      { dx: 0, dy: 1 },
      'keyboard:nudge-left':      { dx: -1, dy: 0 },
      'keyboard:nudge-right':     { dx: 1, dy: 0 },
      'keyboard:nudge-up-10':     { dx: 0, dy: -10 },
      'keyboard:nudge-down-10':   { dx: 0, dy: 10 },
      'keyboard:nudge-left-10':   { dx: -10, dy: 0 },
      'keyboard:nudge-right-10':  { dx: 10, dy: 0 }
    };
    Object.keys(NUDGE_MAP).forEach(function(evt) {
      bus.on(evt, function() { nudgeElements(NUDGE_MAP[evt].dx, NUDGE_MAP[evt].dy); });
    });

    // ==================== Wire UI Events ====================
    bus.on('selection:changed', function(data) {
      var el = data.element;
      if (el) {
        var tag = el.getAttribute('data-type') || el.tagName.toLowerCase();
        var w = el.offsetWidth || 0;
        var h = el.offsetHeight || 0;
        statusbar.updateElement(tag, w, h);
      } else {
        statusbar.updateElement('', 0, 0);
      }
    });

    bus.on('history:recorded', function() {
      toolbar.updateBadge();
      changesTab.refresh();
    });

    bus.on('canvas:zoom', function(data) {
      toolbar.updateZoomLabel();
      statusbar.updateZoom(data.zoom);
    });

    // ModeMachine emits 'mode:changed'
    bus.on('mode:changed', function(data) {
      statusbar.updateMode(data.to);
      toolbar.updateModeButtons(data.to);

      // Re-render all components for the new mode
      if (renderer) {
        var els = canvasEl.querySelectorAll('.cc-el');
        for (var ri = 0; ri < els.length; ri++) {
          renderer.renderComponent(els[ri], data.to);
        }
      }

      var leftPanelEl = leftResult.container;
      var rightPanelEl = rightResult.container;

      switch (data.to) {
        case 'preview':
          // Collapse panels, disable editing
          leftPanelEl.classList.add('cc-left-collapsed');
          rightPanelEl.classList.add('cc-right-collapsed');
          document.body.classList.add('cc-mode-preview');
          document.body.classList.remove('cc-mode-edit', 'cc-mode-annotate', 'cc-mode-compare');
          selection.deselect();
          transform.removeResizeHandles();
          transform.removeRotateHandle();
          toast.show('预览模式 — 页面可交互', 'info');
          break;

        case 'edit':
          // Expand panels, full editing
          leftPanelEl.classList.remove('cc-left-collapsed');
          rightPanelEl.classList.remove('cc-right-collapsed');
          document.body.classList.add('cc-mode-edit');
          document.body.classList.remove('cc-mode-preview', 'cc-mode-annotate', 'cc-mode-compare');
          // Remove annotation overlay display
          var annOverlay = canvasEl.querySelector('.cc-annotation-overlay');
          if (annOverlay) annOverlay.style.display = 'none';
          var annToolbar = document.querySelector('.cc-ann-toolbar');
          if (annToolbar) annToolbar.style.display = 'none';
          // Cleanup compare mode if active
          if (compareEngine && compareEngine.getMode()) {
            compareEngine.cleanup();
          }
          toast.show('编辑模式', 'info');
          break;

        case 'annotate':
          // Activate annotation overlay + toolbar
          document.body.classList.add('cc-mode-annotate');
          document.body.classList.remove('cc-mode-preview', 'cc-mode-edit', 'cc-mode-compare');
          selection.deselect();
          transform.removeResizeHandles();
          transform.removeRotateHandle();
          // Create overlay if needed
          var overlay = annotationRenderer.getOverlay();
          if (!overlay) {
            overlay = annotationRenderer.createOverlay(canvasEl);
          }
          overlay.style.display = '';
          annotationTools.setOverlay(overlay);
          // Re-render all saved annotations onto the overlay
          var savedAnns = state.get('annotations.list') || [];
          for (var si = 0; si < savedAnns.length; si++) {
            annotationRenderer.render(savedAnns[si]);
          }
          // Create annotation toolbar
          _ensureAnnotationToolbar(canvasEl);
          toast.show('标注模式 — 选择工具后绘制', 'info');
          break;

        case 'compare':
          // Compare mode — capture current vs snapshot if available
          document.body.classList.add('cc-mode-compare');
          document.body.classList.remove('cc-mode-preview', 'cc-mode-edit', 'cc-mode-annotate');
          if (compareEngine) {
            // Capture current canvas as "version 2"
            var currentHtml = canvasEl.innerHTML;
            // If we have a snapshot, compare against latest; otherwise self-compare
            var snapList = snapshot ? snapshot.list() : [];
            var v1 = snapList.length > 0 ? snapList[snapList.length - 1].html : currentHtml;
            compareEngine.sideBySide(v1, currentHtml);
            toast.show('对比模式 — 左: 快照 / 右: 当前', 'info');
          } else {
            toast.show('对比模式 — 需要版本快照支持', 'info');
          }
          break;
      }
    });

    // Components tab emits 'placement:start' with {type}
    bus.on('placement:start', function(data) {
      state.set('placement.type', data.type);
      canvasEl.style.cursor = 'crosshair';
      canvasEl.classList.add('cc-placing');
      toast.show('点击画布放置' + data.type, 'info');
    });

    // Render newly created elements in current mode
    bus.on('element:created', function(e) {
      var mode = modeMachine.current();
      if (renderer) renderer.renderComponent(e.element, mode);
    });

    // Toolbar emits 'mode:change' (from mode buttons)
    bus.on('mode:change', function(modeName) {
      modeMachine.transition(modeName);
    });

    // Toolbar action events
    bus.on('toolbar:undo', function() { undoRedo.undo(); });
    bus.on('toolbar:redo', function() { undoRedo.redo(); });
    bus.on('toolbar:pause', function() { modeMachine.togglePause(); });
    bus.on('toolbar:bold', function() { toggleFormat('bold'); });
    bus.on('toolbar:italic', function() { toggleFormat('italic'); });
    bus.on('toolbar:strike', function() { toggleFormat('strike'); });
    bus.on('toolbar:zoom-in', function() { canvas.setZoom((state.zoom || 1) + 0.1); });
    bus.on('toolbar:zoom-out', function() { canvas.setZoom((state.zoom || 1) - 0.1); });
    bus.on('toolbar:save', function() { exportEngine.saveFile(); });

    // Global sticky visibility toggle
    bus.on('toolbar:toggle-sticky', function() {
      var stickies = canvasEl.querySelectorAll('[data-type="sticky"]');
      if (stickies.length === 0) {
        toast.show('画布上没有便签', 'info');
        return;
      }
      // Check current state: if any are visible, hide all; otherwise show all
      var anyVisible = false;
      for (var si = 0; si < stickies.length; si++) {
        if (stickies[si].style.display !== 'none') { anyVisible = true; break; }
      }
      for (var sj = 0; sj < stickies.length; sj++) {
        if (anyVisible) {
          stickies[sj].setAttribute('data-cc-sticky-hidden', 'true');
          stickies[sj].style.display = 'none';
        } else {
          stickies[sj].removeAttribute('data-cc-sticky-hidden');
          stickies[sj].style.display = '';
        }
      }
      toast.show(anyVisible ? '已隐藏 ' + stickies.length + ' 个便签' : '已显示 ' + stickies.length + ' 个便签', 'info');
    });
    bus.on('toolbar:export', function() {
      // Export changelog as .md download
      var md = exportEngine.exportInstructions();
      var blob = new Blob([md], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'collabcanvas-changelog.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      toast.show('变更日志已导出', 'success');
    });
    bus.on('toolbar:help', function() { showHelp(); });
    bus.on('toolbar:close', function() { shutdown(); });

    // Settings dialog
    bus.on('toolbar:settings', function() {
      if (settingsDialog) settingsDialog.open();
    });

    // Toolbar: Export PNG
    bus.on('toolbar:image', function() { exportEngine.exportPNG(); });

    // Toolbar: Import file (HTML or image)
    bus.on('toolbar:import', function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm,.png,.jpg,.jpeg,.gif,.webp';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        if (file.type.indexOf('image') === 0) {
          reader.onload = function(ev) {
            var img = factory.createElementAt('image', 50, 50);
            if (img) {
              img.setAttribute('src', ev.target.result);
              img.style.width = '300px';
              img.style.height = 'auto';
            }
            toast.show('图片已导入', 'success');
          };
          reader.readAsDataURL(file);
        } else {
          reader.onload = function(ev) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = ev.target.result;
            // Extract body content
            var bodyContent = wrapper.querySelector('body');
            var source = bodyContent || wrapper;
            var children = Array.from(source.children);
            children.forEach(function(child) {
              if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') return;
              if (!child.classList.contains('cc-el')) child.classList.add('cc-el');
              if (!child.getAttribute('data-type')) child.setAttribute('data-type', child.tagName.toLowerCase());
              if (!child.style.position || child.style.position === 'static') child.style.position = 'relative';
              canvasEl.appendChild(child);
            });
            toast.show('HTML 已导入（' + children.length + ' 个元素）', 'success');
          };
          reader.readAsText(file);
        }
        document.body.removeChild(input);
      });
      input.click();
    });

    // Property panel changes → record for undo/redo
    bus.on('property:change', function(data) {
      var el = data.element || state.selected;
      if (!el) return;

      // Support both payload formats:
      // Format A (from PropertiesTab): {element, prop, oldVal, newVal}
      // Format B (from ComponentDialog): {element}
      if (data.prop && data.oldVal !== undefined) {
        var props = {};
        props[data.prop] = data.newVal;
        var oldProps = {};
        oldProps[data.prop] = data.oldVal;
        changeTracker.pushRaw({
          prop: 'css',
          elementId: el.id || '',
          oldVal: { element: el, props: oldProps },
          newVal: { element: el, props: props }
        });
      } else if (data.oldProps && data.newProps) {
        changeTracker.pushRaw({
          prop: 'css',
          elementId: el.id || '',
          oldVal: { element: el, props: data.oldProps },
          newVal: { element: el, props: data.newProps }
        });
      }
    });

    // ==================== Annotation Tab Events ====================
    // Tool selected from annotations tab → activate it
    bus.on('annotation:activate-tool', function(data) {
      if (modeMachine.current() !== 'annotate') {
        modeMachine.transition('annotate');
      }
      annotationTools.activate(data.tool);
      // Sync floating toolbar buttons
      var annToolbar = document.querySelector('.cc-ann-toolbar');
      if (annToolbar) {
        annToolbar.querySelectorAll('.cc-ann-tool-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-tool') === data.tool);
        });
      }
    });

    // New annotation request → switch to annotate mode + activate default tool
    bus.on('annotation:new-request', function() {
      if (modeMachine.current() !== 'annotate') {
        modeMachine.transition('annotate');
      }
      // Activate arrow tool by default
      annotationTools.activate('arrow');
      // Highlight the arrow tool button in the toolbar
      var toolbar = document.querySelector('.cc-ann-toolbar');
      if (toolbar) {
        toolbar.querySelectorAll('.cc-ann-tool-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-tool') === 'arrow');
        });
      }
      toast.show('已切换到标注模式 — 选择工具后在画布上绘制', 'info');
    });

    // Tool complete → persist annotation to state
    // Tool complete → persist annotation to state + render via renderer
    bus.on('annotation:tool-complete', function(data) {
      var tool = data.tool;
      var start = data.start;
      var end = data.end;
      var x = Math.min(start.x, end.x);
      var y = Math.min(start.y, end.y);
      var w = Math.abs(end.x - start.x);
      var h = Math.abs(end.y - start.y);

      // Remove tool's temporary visual from overlay
      if (data.element && data.element.parentNode) {
        data.element.parentNode.removeChild(data.element);
      }

      // For text/sticky tools, element was an HTML div with text content
      var text = '';
      if (data.element && data.element.textContent) {
        text = data.element.textContent;
      }

      // For brush, store path in text field
      if (tool === 'brush' && data.element) {
        text = data.element.getAttribute('d') || '';
      }

      // Set default colors per tool type
      var toolColors = {
        'arrow': '#ff4d4f', 'rect': '#1677ff', 'text': '#1f1f1f',
        'measure': '#faad14', 'sticky': '#d48806', 'number': '#1677ff',
        'brush': '#ff4d4f', 'mosaic': '#8c8c8c'
      };

      // Read default color/status from settings
      var annSettings = state.get('settings.annotations') || {};
      var defaultColor = annSettings.defaultColor || toolColors[tool] || '#1677ff';
      var defaultStatus = annSettings.defaultStatus || 'pending';

      var ann = annotator.create({
        type: tool,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
        text: text,
        color: defaultColor,
        status: defaultStatus
      });

      // Render via annotation renderer for persistent display
      if (ann) {
        annotationRenderer.render(ann);
      }
    });

    // Select annotation → highlight it on canvas
    bus.on('annotation:select', function(data) {
      var ann = annotator.getById(data.id);
      if (!ann) return;
      // Use renderer highlight
      annotationRenderer.highlight(data.id);
      setTimeout(function() { annotationRenderer._clearHighlights(); }, 2000);
      // Switch to annotate mode if not already
      if (modeMachine.current() !== 'annotate') {
        modeMachine.transition('annotate');
      }
    });

    // Delete annotation
    bus.on('annotation:delete-request', function(data) {
      if (data.id) {
        annotationRenderer.remove(data.id);
        annotator.remove(data.id);
        toast.show('标注已删除', 'info');
      }
    });

    // Cycle annotation status
    var STATUS_CYCLE = ['pending', 'in-progress', 'resolved'];
    bus.on('annotation:cycle-status', function(data) {
      var ann = annotator.getById(data.id);
      if (!ann) return;
      var idx = STATUS_CYCLE.indexOf(ann.status);
      var nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      annotator.update(data.id, { status: nextStatus });
      toast.show('状态已更新为：' + nextStatus, 'info');
    });

    // Edit annotation properties (text, color, status, assignee)
    bus.on('annotation:edit', function(data) {
      if (!data.id || !data.changes) return;
      var updated = annotator.update(data.id, data.changes);
      if (updated) {
        // Re-render the annotation visual
        annotationRenderer.remove(data.id);
        annotationRenderer.render(updated);
        toast.show('标注已更新', 'info');
      }
    });

    // Edit request (open modal editor for annotation)
    bus.on('annotation:edit-request', function(data) {
      var ann = annotator.getById(data.id);
      if (!ann) return;
      // Reuse annotations tab editor
      if (annotationsTab && annotationsTab._openAnnotationEditor) {
        annotationsTab._openAnnotationEditor(ann);
      }
    });

    // Clear all annotations
    bus.on('annotation:clear-all', function() {
      var list = state.get('annotations.list') || [];
      if (list.length === 0) return;
      state.set('annotations.list', []);
      annotationRenderer.clear();
      toast.show('已清空所有标注', 'info');
      bus.emit('annotation:updated', {});
    });

    // ==================== Styles Tab Events ====================
    // Extract tokens from page
    bus.on('token:extract-request', function() {
      if (!tokenExtractor || !tokenizer) {
        toast.show('令牌模块未加载', 'info');
        return;
      }
      var result = tokenExtractor.extractFromPage();
      var count = 0;
      for (var cat in result) {
        if (!result.hasOwnProperty(cat)) continue;
        var tokens = result[cat];
        for (var i = 0; i < tokens.length; i++) {
          var t = tokens[i];
          tokenizer.add(cat, t.name, t.value);
          count++;
        }
      }
      bus.emit('tokens:changed', {});
      toast.show('已从页面提取 ' + count + ' 个设计令牌', 'success');
    });

    // Import tokens (file picker)
    bus.on('token:import-request', function() {
      if (!tokenImporter || !tokenizer) {
        toast.show('令牌模块未加载', 'info');
        return;
      }
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.css,.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var text = ev.target.result;
          var tokens;
          if (file.name.endsWith('.json')) {
            tokens = tokenImporter.importJSON(text);
          } else {
            tokens = tokenImporter.importCSS(text);
          }
          var count = 0;
          for (var i = 0; i < tokens.length; i++) {
            var t = tokens[i];
            var cat = t.category || 'spacing';
            tokenizer.add(cat, t.name, t.value);
            count++;
          }
          bus.emit('tokens:changed', {});
          toast.show('已导入 ' + count + ' 个令牌', 'success');
        };
        reader.readAsText(file);
        document.body.removeChild(input);
      });
      input.click();
    });

    // Load preset tokens
    bus.on('token:load-preset', function(data) {
      if (!tokenImporter || !tokenizer) {
        toast.show('令牌模块未加载', 'info');
        return;
      }
      var tokens = tokenImporter.getPreset(data.preset);
      var count = 0;
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        tokenizer.add(t.category, t.name, t.value);
        count++;
      }
      bus.emit('tokens:changed', {});
      toast.show('已加载预设「' + data.preset + '」' + count + ' 个令牌', 'success');
    });

    // Apply token to selected element
    bus.on('token:apply', function(data) {
      if (!tokenizer) {
        toast.show('令牌模块未加载', 'info');
        return;
      }
      var el = state.selected;
      if (!el) {
        toast.show('请先选中一个元素', 'info');
        return;
      }
      var applied = tokenizer.applyToElement(data.tokenId, el);
      if (applied) {
        toast.show('令牌已应用到选中元素', 'success');
      }
    });

    // ==================== Engine Facade ====================
    CC.engine = {
      select: function(el) { selection.select(el); },
      deselect: function() { selection.deselect(); },
      createElement: function(t, x, y) { factory.createElementAt(t, x, y); },
      undo: function() { undoRedo.undo(); },
      redo: function() { undoRedo.redo(); },
      setZoom: function(z) { canvas.setZoom(z); },
      setMode: function(m) { modeMachine.transition(m); },
      save: function() { exportEngine.saveFile(); },
      exportInstructions: function() { exportEngine.exportInstructions(); },
      exportPNG: function() { exportEngine.exportPNG(); },
      shutdown: shutdown
    };

    // Mark active
    document.body.classList.add('cc-active');
    bus.emit('cc:init');

    // ── Persistence: restore saved settings + annotations ──
    if (window.CCPersistence) {
      // Restore settings
      CCPersistence.load('settings', function(saved) {
        if (saved && typeof saved === 'object') {
          // Deep merge saved settings into state defaults
          var current = state.get('settings') || {};
          for (var ns in saved) {
            if (!saved.hasOwnProperty(ns)) continue;
            if (typeof saved[ns] === 'object' && saved[ns] !== null) {
              for (var k in saved[ns]) {
                if (saved[ns].hasOwnProperty(k)) {
                  state.set('settings.' + ns + '.' + k, saved[ns][k]);
                }
              }
            }
          }
        }
      });

      // Restore annotations
      CCPersistence.load('annotations', function(saved) {
        if (saved && Array.isArray(saved) && saved.length > 0) {
          state.set('annotations.list', saved);
        }
      });

      // Debounced save on state changes
      var _persistTimer = null;
      bus.on('state:changed', function(ev) {
        // Only persist settings and annotations
        if (ev.path && (ev.path.indexOf('settings.') === 0 || ev.path === 'annotations.list')) {
          if (_persistTimer) clearTimeout(_persistTimer);
          _persistTimer = setTimeout(function() {
            if (ev.path.indexOf('settings.') === 0) {
              CCPersistence.save('settings', state.get('settings'));
            } else if (ev.path === 'annotations.list') {
              CCPersistence.save('annotations', state.get('annotations.list'));
            }
          }, 2000);
        }
      });
    }

    console.log('[CollabCanvas] 初始化成功');
  }

  // ==================== Helper Functions ====================
  function toggleFormat(fmt) {
    var el = CC.state.selected;
    if (!el || CC.modeMachine.current() !== 'edit') return;
    var cs = getComputedStyle(el);
    if (fmt === 'bold') {
      var cur = parseInt(cs.fontWeight) || 400;
      el.style.fontWeight = cur >= 700 ? '400' : '700';
    } else if (fmt === 'italic') {
      el.style.fontStyle = cs.fontStyle === 'italic' ? 'normal' : 'italic';
    } else if (fmt === 'strike') {
      el.style.textDecoration = cs.textDecoration.indexOf('line-through') >= 0 ? 'none' : 'line-through';
    }
    CC.toolbar.updateFormatButtons(el);
  }

  function nudgeElements(dx, dy) {
    var state = CC.state;
    var els = [];
    if (state.selected) els.push(state.selected);
    var multi = state.get('selection.multiSelect') || [];
    multi.forEach(function(el) {
      if (els.indexOf(el) < 0) els.push(el);
    });
    if (!els.length) return;

    var zoom = state.zoom || 1;
    els.forEach(function(el) {
      var pos = CC.dom.getElPosition(el);
      el.style.left = Math.round(pos.left + dx / zoom) + 'px';
      el.style.top = Math.round(pos.top + dy / zoom) + 'px';
    });
    CC.transform.positionResizeHandles();
  }

  function deleteSelected() {
    var el = CC.state.selected;
    if (!el) return;

    CC.changeTracker.pushRaw({
      prop: 'delete',
      newVal: el.outerHTML.substring(0, 100),
      oldVal: null,
      _restoreData: {
        html: el.outerHTML,
        parent: el.parentElement ? CC.dom.buildPath(el.parentElement) : '',
        nextSibling: el.nextElementSibling ? CC.dom.buildPath(el.nextElementSibling) : ''
      },
      elementId: el.id
    });

    el.remove();
    CC.selection.deselect();
    CC.transform.removeResizeHandles();
    CC.transform.removeRotateHandle();
    CC.toast.show('元素已删除', 'info');
  }

  /**
   * Promote a canvas sticky element to a PRD annotation.
   * Copies content + position into annotator, marks sticky as linked.
   */
  function _promoteStickyToAnnotation(stickyEl) {
    if (!annotator) {
      CC.toast.show('标注系统未初始化', 'info');
      return;
    }

    // Already linked?
    if (stickyEl.getAttribute('data-cc-ann-linked')) {
      var existingId = stickyEl.getAttribute('data-cc-ann-id');
      CC.toast.show('此便签已关联标注 ' + (existingId || ''), 'info');
      return;
    }

    // Extract sticky content text
    var contentEl = stickyEl.querySelector('.cc-sticky-content') || stickyEl;
    var text = (contentEl.innerText || '').trim() || '便签备注';

    // Calculate position relative to canvas
    var pos = CC.dom.getElPosition(stickyEl);
    var w = parseFloat(stickyEl.style.width) || stickyEl.offsetWidth || 180;
    var h = parseFloat(stickyEl.style.height) || stickyEl.offsetHeight || 160;

    // Read annotation defaults from settings
    var annSettings = state.get('settings.annotations') || {};
    var defaultColor = annSettings.defaultColor || '#d48806';
    var defaultStatus = annSettings.defaultStatus || 'pending';

    var ann = annotator.create({
      type: 'sticky',
      x: pos.left,
      y: pos.top,
      w: w,
      h: h,
      text: text,
      color: defaultColor,
      status: defaultStatus
    });

    // Mark sticky as linked
    stickyEl.setAttribute('data-cc-ann-linked', 'true');
    stickyEl.setAttribute('data-cc-ann-id', ann.id);

    // Visual indicator: add a small annotation badge to the sticky
    var badge = document.createElement('div');
    badge.className = 'cc-sticky-ann-badge';
    badge.title = '已关联标注: ' + ann.id;
    badge.style.cssText = 'position:absolute;top:-6px;right:-6px;width:16px;height:16px;' +
      'background:#1677ff;border-radius:50%;color:#fff;font-size:9px;font-weight:700;' +
      'display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1;';
    badge.textContent = 'A';
    stickyEl.style.position = 'absolute';
    stickyEl.appendChild(badge);

    CC.toast.show('便签已转为标注 ' + ann.id, 'success');
  }

  function showHelp() {
    var s = 'font-size:12px;line-height:1.9;color:#333;';
    var h4 = 'margin:14px 0 6px;color:#1677ff;font-size:13px;border-bottom:1px solid #e8e8e8;padding-bottom:4px;';
    var k = 'display:inline-block;min-width:140px;font-family:Consolas,monospace;font-size:11px;';
    var html = '<div style="' + s + 'max-height:520px;overflow-y:auto;padding-right:8px;">' +

      '<h4 style="' + h4 + '">CollabCanvas v2.0</h4>' +
      '<p>专业可视化编辑器 + PRD 标注系统，支持设置中心、AI 集成、结构化导出、持久化存储</p>' +

      '<h4 style="' + h4 + '">工作模式</h4>' +
      '<p><b>预览</b> \u2014 页面可交互，隐藏编辑面板</p>' +
      '<p><b>编辑</b> \u2014 完整编辑：选中、拖拽、属性修改、组件放置</p>' +
      '<p><b>标注</b> \u2014 8 种工具：箭头、矩形、文字、测量、便签、编号、画笔、马赛克</p>' +
      '<p><b>对比</b> \u2014 版本快照 vs 当前页面对比</p>' +

      '<h4 style="' + h4 + '">快捷键</h4>' +
      '<p><span style="' + k + '">Ctrl+Z / Ctrl+Y</span>撤销 / 重做</p>' +
      '<p><span style="' + k + '">Ctrl+S</span>保存页面</p>' +
      '<p><span style="' + k + '">Ctrl+C / X / V</span>复制 / 剪切 / 粘贴</p>' +
      '<p><span style="' + k + '">Ctrl+D</span>快速复制元素</p>' +
      '<p><span style="' + k + '">Ctrl+G / Shift+Ctrl+G</span>分组 / 取消分组</p>' +
      '<p><span style="' + k + '">Ctrl+B / I</span>加粗 / 斜体</p>' +
      '<p><span style="' + k + '">Delete / Backspace</span>删除元素</p>' +
      '<p><span style="' + k + '">\u2191\u2193\u2190\u2192</span>微调 1px</p>' +
      '<p><span style="' + k + '">Shift+\u2191\u2193\u2190\u2192</span>微调 10px</p>' +
      '<p><span style="' + k + '">Ctrl+] / Ctrl+[</span>上移/下移层级</p>' +
      '<p><span style="' + k + '">Ctrl+Shift+] / [</span>置顶/置底层级</p>' +
      '<p><span style="' + k + '">Ctrl+P</span>暂停/恢复编辑</p>' +
      '<p><span style="' + k + '">Esc</span>取消选择 / 取消放置</p>' +

      '<h4 style="' + h4 + '">鼠标操作</h4>' +
      '<p><span style="' + k + '">点击元素</span>选中</p>' +
      '<p><span style="' + k + '">拖拽元素</span>移动位置</p>' +
      '<p><span style="' + k + '">拉拽句柄</span>调整尺寸</p>' +
      '<p><span style="' + k + '">双击元素</span>编辑内容 / 弹出属性对话框</p>' +
      '<p><span style="' + k + '">右键</span>弹出上下文菜单</p>' +
      '<p><span style="' + k + '">Ctrl+点击</span>多选元素</p>' +
      '<p><span style="' + k + '">Space+拖拽</span>平移画布</p>' +
      '<p><span style="' + k + '">Ctrl+滚轮</span>缩放画布</p>' +

      '<h4 style="' + h4 + '">编辑模式</h4>' +
      '<p>\u2022 左侧面板：组件库（22 种组件）、图层、标注、变更、样式</p>' +
      '<p>\u2022 右侧面板：属性编辑（9 组属性：排版/间距/外观/布局/位置/变换/边框/背景）</p>' +
      '<p>\u2022 组件放置：点击组件卡\u2192画布上点击放置</p>' +
      '<p>\u2022 对齐工具：多选 2+ 元素\u2192右键\u2192对齐方向</p>' +
      '<p>\u2022 智能参考线：拖拽时自动显示红色边缘线+绿色中心线，5px 自动吸附</p>' +
      '<p>\u2022 双击编辑：图片/表格/链接/按钮等组件双击弹出属性对话框</p>' +

      '<h4 style="' + h4 + '">标注模式</h4>' +
      '<p>\u2022 左侧标注栏点击工具卡片选择工具，画布上拖拽绘制</p>' +
      '<p>\u2022 箭头：拖拽画箭头线 \u2022 矩形：拖拽画框选区域</p>' +
      '<p>\u2022 文字：点击后输入 \u2022 测量：拖拽测距离</p>' +
      '<p>\u2022 便签：点击后输入备注 \u2022 编号：点击放置自增编号</p>' +
      '<p>\u2022 画笔：自由绘制 \u2022 马赛克：拖拽遮罩敏感区域</p>' +
      '<p>\u2022 <b>PRD 字段</b>：每个标注可设置 所属模块 / 优先级(高/中/低) / 需求类型(功能/性能/安全/体验) / 验收标准</p>' +
      '<p>\u2022 标注列表：点击定位、编辑内容/颜色/状态/PRD字段、删除</p>' +

      '<h4 style="' + h4 + '">设置中心</h4>' +
      '<p>\u2022 工具栏 \u2699 按钮打开设置，4 个标签页：</p>' +
      '<p>\u2022 <b>项目信息</b>：项目名称、版本、作者、描述、页面URL</p>' +
      '<p>\u2022 <b>AI 配置</b>：Provider (Claude/OpenAI/自定义)、API Key、端点URL、模型名、"测试连接"按钮</p>' +
      '<p>\u2022 <b>导出偏好</b>：默认格式(MD/JSON/PNG)、包含截图、包含标注、编号格式(1,2,3 / A,B,C)</p>' +
      '<p>\u2022 <b>标注默认</b>：默认颜色、默认状态、自动编号开关、显示坐标开关</p>' +
      '<p>\u2022 所有设置自动持久化，刷新页面后保持</p>' +

      '<h4 style="' + h4 + '">导出系统</h4>' +
      '<p>\u2022 右侧面板"导出"按钮，3 种格式：</p>' +
      '<p>\u2022 <b>Markdown</b>：标注列表表格（编号/区域/组件/类型/坐标/内容/状态）</p>' +
      '<p>\u2022 <b>JSON</b>：结构化 JSON 数据（含所有字段）</p>' +
      '<p>\u2022 <b>PRD</b>：需求规格说明 Markdown（项目头/模块分组/验收标准/优先级汇总/状态分布），支持下载 .md 文件</p>' +

      '<h4 style="' + h4 + '">便签与标注联动</h4>' +
      '<p>\u2022 画布便签元素（编辑模式放置）右键 \u2192 "转为标注"</p>' +
      '<p>\u2022 自动将便签内容创建为标注，继承位置、文本、PRD 字段可编辑</p>' +
      '<p>\u2022 转换后原便签元素保留并标记为已关联</p>' +

      '<h4 style="' + h4 + '">图层与页面</h4>' +
      '<p>\u2022 <b>图层面板</b>（左侧）：按 DOM 层级反向显示所有元素，支持可见性切换、锁定/解锁、拖拽排序</p>' +
      '<p>\u2022 <b>页面管理</b>（需启用）：多页面切换、按模块分组、添加/重命名/删除/导入页面</p>' +

      '<h4 style="' + h4 + '">数据持久化</h4>' +
      '<p>\u2022 扩展模式：自动存储到 chrome.storage.local</p>' +
      '<p>\u2022 网页模式：自动存储到 localStorage</p>' +
      '<p>\u2022 设置 + 标注数据均自动保存，防抖 2 秒写入</p>' +
      '</div>';
    CC.modal.show('帮助', html, [
      { text: '确定', cls: 'primary', fn: function(d) { if (d && d.parentElement) d.parentElement.remove(); } }
    ]);
  }

  // ==================== Annotation Helpers ====================
  function _ensureAnnotationToolbar(canvasEl) {
    var existing = document.querySelector('.cc-ann-toolbar');
    if (existing) {
      existing.style.display = '';
      _bindAnnotationEvents();
      return;
    }

    var tools = [
      { name: 'arrow', label: '箭头' },
      { name: 'rect', label: '矩形' },
      { name: 'text', label: '文字' },
      { name: 'measure', label: '测量' },
      { name: 'sticky', label: '便签' },
      { name: 'number', label: '编号' },
      { name: 'brush', label: '画笔' },
      { name: 'mosaic', label: '马赛克' }
    ];

    var toolbar = document.createElement('div');
    toolbar.className = 'cc-ann-toolbar';
    toolbar.innerHTML = '<span class="cc-ann-toolbar-title">标注工具</span>';

    tools.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'cc-ann-tool-btn';
      btn.textContent = t.label;
      btn.setAttribute('data-tool', t.name);
      btn.addEventListener('click', function() {
        // Remove active from all
        toolbar.querySelectorAll('.cc-ann-tool-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        CC.annotationTools.activate(t.name);
        // Sync annotations tab tool grid
        var tabGrid = document.querySelector('#cc-ann-tool-grid');
        if (tabGrid) {
          tabGrid.querySelectorAll('.cc-ann-tool-card').forEach(function(c) {
            c.classList.toggle('active', c.getAttribute('data-tool') === t.name);
          });
        }
      });
      toolbar.appendChild(btn);
    });

    // Close annotation toolbar button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'cc-ann-tool-btn cc-ann-tool-close';
    closeBtn.textContent = 'X';
    closeBtn.title = '关闭标注';
    closeBtn.addEventListener('click', function() {
      CC.annotationTools.deactivate();
      toolbar.querySelectorAll('.cc-ann-tool-btn').forEach(function(b) { b.classList.remove('active'); });
    });
    toolbar.appendChild(closeBtn);

    // Place toolbar above canvas
    var viewport = CC.state.get('canvas.viewport');
    if (viewport) {
      viewport.style.position = 'relative';
      viewport.appendChild(toolbar);
    }

    _bindAnnotationEvents();
  }

  function _bindAnnotationEvents() {
    // Bind annotation mouse events to overlay (called each time toolbar is shown)
    var overlay = CC.annotationRenderer.getOverlay();
    if (!overlay || overlay._ccEventsBound) return;
    overlay._ccEventsBound = true;

    overlay.addEventListener('mousedown', function(e) {
      if (CC.annotationTools.getActiveTool()) {
        e.preventDefault();
        e.stopPropagation();
      }
      CC.annotationTools.onMouseDown(e);
    });
    overlay.addEventListener('mousemove', function(e) {
      CC.annotationTools.onMouseMove(e);
    });
    overlay.addEventListener('mouseup', function(e) {
      CC.annotationTools.onMouseUp(e);
    });
    // Double-click on existing annotation to edit it
    overlay.addEventListener('dblclick', function(e) {
      var target = e.target;
      // Walk up to find the group with data-ann-id
      while (target && target !== overlay) {
        var annId = target.getAttribute('data-ann-id');
        if (annId) {
          e.preventDefault();
          e.stopPropagation();
          var ann = annotator.getById(annId);
          if (ann && CC.componentDialog) {
            // Open annotation editor directly
            bus.emit('annotation:edit-request', { id: annId });
          }
          return;
        }
        target = target.parentElement;
      }
    });
  }

  // ==================== Shutdown ====================
  function shutdown() {
    // Final persistence save
    if (window.CCPersistence) {
      var annList = CC.state ? CC.state.get('annotations.list') : [];
      var settings = CC.state ? CC.state.get('settings') : null;
      if (annList && annList.length) CCPersistence.save('annotations', annList);
      if (settings) CCPersistence.save('settings', settings);
    }

    // Remove all editor DOM
    var root = document.querySelector('.cc-root');
    if (root) root.remove();

    // Remove handles
    var handles = CC.state.get('handles.resize') || [];
    handles.forEach(function(h) { h.remove(); });
    var rh = CC.state.get('handles.rotate');
    if (rh) rh.remove();

    // Teardown keyboard
    if (CC.keyboard) CC.keyboard.teardown();

    // Clean state
    document.body.classList.remove('cc-active', 'cc-placing', 'cc-paused');

    // Clear global
    window.__cc = false;
    window.__CC = null;

    console.log('[CollabCanvas] 已关闭');
  }

  // ==================== Auto-init ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
