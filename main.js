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
    var toolbarResult = toolbar.create();
    var toolbarEl = toolbarResult.toolbar;
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
    var aiTab = null;
    if (typeof CCAnnotationsTab !== 'undefined') annotationsTab = new CCAnnotationsTab(state, bus);
    if (typeof CCStylesTab !== 'undefined') stylesTab = new CCStylesTab(state, bus);
    if (typeof CCAITab !== 'undefined') aiTab = new CCAITab(state, bus);

    // Store tab references for cleanup
    CC._tabs = {
      layersTab: layersTab,
      propertiesTab: propertiesTab,
      changesTab: changesTab,
      notesAnnotationsTab: notesAnnotationsTab,
      annotationsTab: annotationsTab,
      stylesTab: stylesTab,
      aiTab: aiTab
    };
    var pagesTab = null;
    var versionsTab = null;

    // Annotation system instances
    var annotator = CC.annotator = new CCAnnotator(state, bus);
    var annotationTools = CC.annotationTools = new CCAnnotationTools(state, bus);
    var annotationRenderer = CC.annotationRenderer = new CCAnnotationRenderer(state);

    // AI client (Phase 2A)
    var proxy = null;
    var aiClient = null;
    if (typeof CCProxyHelper !== 'undefined') proxy = CC.proxy = new CCProxyHelper();
    if (typeof CCAIClient !== 'undefined') aiClient = CC.aiClient = new CCAIClient(state, bus, proxy);

    // Token system instances (Phase 2 optional)
    var tokenExtractor = null;
    var tokenizer = null;
    var tokenImporter = null;
    if (typeof CCTokenExtractor !== 'undefined') { tokenExtractor = CC.tokenExtractor = new CCTokenExtractor(); }
    if (typeof CCTokenizer !== 'undefined') { tokenizer = CC.tokenizer = new CCTokenizer(state); }
    if (typeof CCTokenImporter !== 'undefined') { tokenImporter = CC.tokenImporter = new CCTokenImporter(); }

    // v1.4: Design Systems registry
    var designSystems = null;
    if (typeof CCDesignSystems !== 'undefined') {
      designSystems = new CCDesignSystems(state, bus);
      CC._designSystems = designSystems;
      if (tokenImporter) tokenImporter._designSystems = designSystems;
    }

    // v1.5: Annotation Importer + Design Audit + Exporter with state
    var annotationImporter = null;
    if (typeof CCAnnotationImporter !== 'undefined') {
      annotationImporter = CC.annotationImporter = new CCAnnotationImporter(state, bus);
    }
    var designAudit = null;
    if (typeof CCDesignAudit !== 'undefined') {
      designAudit = CC.designAudit = new CCDesignAudit(state, bus);
    }
    if (typeof CCAnnotationExporter !== 'undefined') {
      CC.annotationExporter = new CCAnnotationExporter(state);
    }

    // Version system instances
    var snapshot = null;
    var versionDiffer = null;
    if (typeof CCSnapshot !== 'undefined') {
      snapshot = CC.snapshot = new CCSnapshot(canvasEl, function() { return state.getAll(); });
    }
    if (typeof CCVersionDiffer !== 'undefined') {
      versionDiffer = CC.versionDiffer = new CCVersionDiffer();
    }

    // ── Page helper functions ──────────────────────────────────────
    function _uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

    function _captureThumb(el) {
      try {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">' +
          '<foreignObject width="100%" height="100%">' +
          '<div xmlns="http://www.w3.org/1999/xhtml" style="width:80px;height:60px;overflow:hidden;transform:scale(0.15);transform-origin:top left;">' +
          el.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
          '</div></foreignObject></svg>';
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      } catch (e) { return ''; }
    }

    function _findNode(id) {
      var pages = state.get('pages.list') || [];
      for (var i = 0; i < pages.length; i++) {
        if (pages[i].id === id) return pages[i];
      }
      return null;
    }

    function _getChildIds(parentId) {
      var pages = state.get('pages.list') || [];
      var ids = [];
      for (var i = 0; i < pages.length; i++) {
        if (pages[i].parentId === parentId) ids.push(pages[i].id);
      }
      return ids;
    }

    function _saveCurrentToPage() {
      if (!appFacade.currentPage) return;
      var node = _findNode(appFacade.currentPage);
      if (!node || node.type === 'folder') return;
      node.html = canvasEl.innerHTML;
      node.thumbnail = _captureThumb(canvasEl);
      node.updatedAt = Date.now();
      // Slice to create new array reference, bypassing state.set identity check
      var pages = (state.get('pages.list') || []).slice();
      state.set('pages.list', pages);
      appFacade.pages = pages;
    }

    // Save current canvas HTML back to the active page node (for persistence)
    function _saveCurrentPageHtml() {
      if (!appFacade.currentPage || !canvasEl) return;
      var node = _findNode(appFacade.currentPage);
      if (!node || node.type === 'folder') return;
      node.html = canvasEl.innerHTML;
      node.updatedAt = Date.now();
    }

    // Get current active page ID
    function _getCurrentPageId() {
      return appFacade.currentPage || null;
    }

    function _loadPageToCanvas(page) {
      canvasEl.innerHTML = '';
      if (page.html) canvasEl.innerHTML = page.html;
      if (selection) selection.clear();
      if (undoRedo) undoRedo.reset();
      // Don't re-run extractor on loaded pages — the HTML is already processed
      bus.emit('canvas:reset-transform');
    }

    /**
     * Extract design features from HTML for AI context (Axhub "theme-as-data" pattern)
     * Scans inline styles to find most-used colors, font sizes, families, and spacing.
     */
    function _extractDesignProfile(html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var colors = {}, sizes = {}, families = {}, spacing = {};
      var els = tmp.querySelectorAll('[style]');
      var limit = Math.min(els.length, 500);
      for (var i = 0; i < limit; i++) {
        var s = els[i].style;
        ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor'].forEach(function(prop) {
          var v = s[prop];
          if (v && v !== '' && v !== 'transparent' && v !== 'inherit' && v !== 'none' && v !== 'initial') {
            colors[v] = (colors[v] || 0) + 1;
          }
        });
        if (s.fontSize) { sizes[s.fontSize] = (sizes[s.fontSize] || 0) + 1; }
        if (s.fontFamily) { families[s.fontFamily] = (families[s.fontFamily] || 0) + 1; }
        ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'gap', 'lineHeight'].forEach(function(prop) {
          var v = s[prop];
          if (v && v !== '0px' && v !== '0' && v !== '' && v !== 'normal') {
            spacing[v] = (spacing[v] || 0) + 1;
          }
        });
      }
      function topN(obj, n) {
        return Object.keys(obj).sort(function(a, b) { return obj[b] - obj[a]; }).slice(0, n).map(function(k) { return { value: k, count: obj[k] }; });
      }
      return { colors: topN(colors, 8), fontSizes: topN(sizes, 6), fontFamilies: topN(families, 4), spacing: topN(spacing, 6) };
    }

    function _findFirstPage(nodes) {
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].type !== 'folder') return nodes[i];
      }
      return null;
    }

    // Pages/versions app facade — tree model with folder/page support
    var appFacade = CC.app = {
      pages: state.get('pages.list') || [],
      currentPage: null,
      snapshot: snapshot,
      differ: versionDiffer,
      addPage: function(name, parentId) {
        _saveCurrentToPage();
        var pages = state.get('pages.list') || [];
        var id = 'page-' + _uid();
        var order = 0;
        for (var i = 0; i < pages.length; i++) {
          if (pages[i].parentId === (parentId || null)) order = Math.max(order, pages[i].order || 0);
        }
        var newPage = {
          id: id, type: 'page', name: name || '未命名页面',
          parentId: parentId || null, order: order + 1,
          html: '', thumbnail: '', updatedAt: Date.now(),
          expanded: false
        };
        pages.push(newPage);
        state.set('pages.list', pages);
        appFacade.pages = pages;
        // Don't switch to the new page — just add it to the list
        bus.emit('page:added', id);
        toast.show('页面「' + name + '」已创建', 'success');
      },
      addFolder: function(name, parentId) {
        var pages = state.get('pages.list') || [];
        var id = 'folder-' + _uid();
        var order = 0;
        for (var i = 0; i < pages.length; i++) {
          if (pages[i].parentId === (parentId || null)) order = Math.max(order, pages[i].order || 0);
        }
        var folder = {
          id: id, type: 'folder', name: name || '新文件夹',
          parentId: parentId || null, order: order + 1,
          expanded: true, updatedAt: Date.now()
        };
        pages.push(folder);
        state.set('pages.list', pages);
        appFacade.pages = pages;
        bus.emit('page:added', id);
        toast.show('文件夹「' + name + '」已创建', 'success');
      },
      toggleFolder: function(id) {
        var node = _findNode(id);
        if (node && node.type === 'folder') {
          node.expanded = !node.expanded;
          state.set('pages.list', (state.get('pages.list') || []).slice());
          bus.emit('page:toggled', id);
        }
      },
      renamePage: function(id, name) {
        var node = _findNode(id);
        if (node) { node.name = name; node.updatedAt = Date.now(); }
        state.set('pages.list', (state.get('pages.list') || []).slice());
        appFacade.pages = state.get('pages.list');
        bus.emit('page:renamed', id);
      },
      deletePage: function(id) {
        var pages = state.get('pages.list') || [];
        // Collect ids to remove (id + all descendants)
        var removeIds = [id];
        function collectDescendants(pid) {
          for (var i = 0; i < pages.length; i++) {
            if (pages[i].parentId === pid) {
              removeIds.push(pages[i].id);
              if (pages[i].type === 'folder') collectDescendants(pages[i].id);
            }
          }
        }
        collectDescendants(id);

        var remaining = pages.filter(function(p) { return removeIds.indexOf(p.id) === -1; });
        state.set('pages.list', remaining);
        appFacade.pages = remaining;

        if (removeIds.indexOf(appFacade.currentPage) !== -1) {
          // Current page deleted — switch to first available page
          var target = _findFirstPage(remaining);
          if (target) {
            _loadPageToCanvas(target);
            appFacade.currentPage = target.id;
          } else {
            canvasEl.innerHTML = '';
            appFacade.currentPage = null;
          }
        }
        bus.emit('page:deleted', id);
        toast.show('已删除', 'success');
      },
      switchPage: function(id) {
        var node = _findNode(id);
        if (!node || node.type === 'folder') return;
        if (id === appFacade.currentPage) return;
        _saveCurrentToPage();
        _loadPageToCanvas(node);
        appFacade.currentPage = id;
        // v1.5: Set current page for annotation filtering
        state.set('annotations.currentPageId', id);
        bus.emit('page:switched', id);
        toast.show('已切换到「' + node.name + '」', 'info');
      },
      moveNode: function(nodeId, newParentId, newOrder) {
        var node = _findNode(nodeId);
        if (!node) return;
        // Prevent moving folder into its own descendant
        if (newParentId) {
          var check = newParentId;
          while (check) {
            if (check === nodeId) return;
            var parent = _findNode(check);
            check = parent ? parent.parentId : null;
          }
        }
        node.parentId = newParentId || null;
        node.order = newOrder || 0;
        state.set('pages.list', (state.get('pages.list') || []).slice());
        appFacade.pages = state.get('pages.list');
        bus.emit('page:moved', nodeId);
      },
      importPages: function(files) {
        if (!files || !files.length) return;
        _saveCurrentToPage();
        var pages = state.get('pages.list') || [];
        var pending = files.length;
        var imported = 0;
        var lastPageId = null;

        // Build folder structure from webkitRelativePath
        function _ensureFolder(pathParts) {
          var currentParentId = null;
          for (var i = 0; i < pathParts.length; i++) {
            var folderName = pathParts[i];
            var existing = null;
            for (var j = 0; j < pages.length; j++) {
              if (pages[j].type === 'folder' && pages[j].name === folderName && pages[j].parentId === currentParentId) {
                existing = pages[j];
                break;
              }
            }
            if (existing) {
              existing.expanded = true;
              currentParentId = existing.id;
            } else {
              var fid = 'folder-' + _uid();
              var folderOrder = 0;
              for (var k = 0; k < pages.length; k++) {
                if (pages[k].parentId === currentParentId) folderOrder = Math.max(folderOrder, pages[k].order || 0);
              }
              var newFolder = {
                id: fid, type: 'folder', name: folderName,
                parentId: currentParentId, order: folderOrder + 1,
                expanded: true, updatedAt: Date.now()
              };
              pages.push(newFolder);
              currentParentId = fid;
            }
          }
          return currentParentId;
        }

        Array.from(files).forEach(function(file) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            var name = file.name.replace(/\.[^.]+$/, '');
            var relativePath = file.webkitRelativePath || '';
            var parentId = null;

            // Create folder hierarchy from path
            if (relativePath) {
              var parts = relativePath.split('/');
              if (parts.length > 1) {
                parentId = _ensureFolder(parts.slice(0, -1));
              }
            }

            var order = 0;
            for (var k = 0; k < pages.length; k++) {
              if (pages[k].parentId === parentId) order = Math.max(order, pages[k].order || 0);
            }

            var id = 'page-' + _uid();
            var htmlContent = ev.target.result;
            pages.push({
              id: id, type: 'page', name: name,
              parentId: parentId, order: order + 1,
              html: htmlContent, thumbnail: '', updatedAt: Date.now(),
              expanded: false
            });
            lastPageId = id;
            imported++;
            if (imported === pending) {
              state.set('pages.list', pages);
              appFacade.pages = pages;
              // Load last imported page
              var lastNode = _findNode(lastPageId);
              if (lastNode) {
                _loadPageToCanvas(lastNode);
                appFacade.currentPage = lastPageId;
              }
              bus.emit('page:imported', imported);
              // Extract design profile from imported pages for AI context
              setTimeout(function() {
                var allPages = state.get('pages.list') || [];
                var allHtml = allPages.filter(function(p) { return p.type === 'page' && p.html; })
                  .map(function(p) { return p.html; }).join('');
                if (allHtml) {
                  var profile = _extractDesignProfile(allHtml);
                  state.set('settings.designProfile', profile);
                }
              }, 0);
              toast.show('已导入 ' + imported + ' 个页面', 'success');
            }
          };
          reader.readAsText(file);
        });
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

    // ── Initialize default page from current canvas ──────────────
    (function _initDefaultPage() {
      var pages = state.get('pages.list') || [];
      // If no pages exist yet, create a default page from current canvas content
      if (pages.length === 0 && canvasEl.innerHTML.trim()) {
        var id = 'page-' + _uid();
        var defaultPage = {
          id: id, type: 'page', name: '当前页面',
          parentId: null, order: 1,
          html: canvasEl.innerHTML,
          thumbnail: _captureThumb(canvasEl),
          updatedAt: Date.now(),
          expanded: false
        };
        pages.push(defaultPage);
        state.set('pages.list', pages);
        appFacade.pages = pages;
        appFacade.currentPage = id;
      } else if (pages.length > 0 && !appFacade.currentPage) {
        // Find first page-type node
        var first = _findFirstPage(pages);
        if (first) appFacade.currentPage = first.id;
      }
    })();

    // Instantiate pages/versions tabs with app facade + modal
    if (typeof CCPagesTab !== 'undefined') pagesTab = new CCPagesTab(appFacade, modal);
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
    if (rightResult.tabBodies.ai && aiTab) aiTab.render(rightResult.tabBodies.ai);

    // ==================== Wire Canvas Events ====================

    // Store DOM handlers for cleanup
    var _domHandlers = CC._domHandlers = {};

    // mousedown on canvas: select / place element
    _domHandlers.canvasMousedown = function(e) {
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

      // Annotation tool intercept: active tool and not clicking existing annotation
      var activeAnnTool = annotationTools.getActiveTool();
      if (activeAnnTool) {
        var annEl = e.target.closest('[data-ann-id]');
        if (!annEl) {
          // If clicking a canvas child, select it first (annotation still starts)
          if (dom.isCanvasChild(e.target)) {
            selection.select(e.target);
            transform.createResizeHandles();
            transform.createRotateHandle();
          }
          annotationTools.onMouseDown(e);
          return; // Don't enter normal selection/drag logic
        }
        // Click on existing annotation → let it fall through to selection/edit
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
    };
    canvasEl.addEventListener('mousedown', _domHandlers.canvasMousedown);

    // mousemove: drag handling
    _domHandlers.docMousemove = function(e) {
      // Update clipboard mouse position
      state.set('clipboard.mousePos', { x: e.clientX, y: e.clientY });

      // Annotation drawing in progress
      if (annotationTools.isDrawing()) {
        annotationTools.onMouseMove(e);
        return;
      }

      // Handle active drag
      if (state.get('drag')) {
        transform.handleDragMove(e);
      }
    };
    document.addEventListener('mousemove', _domHandlers.docMousemove);

    // mouseup: end drag
    _domHandlers.docMouseup = function(e) {
      // Annotation drawing in progress
      if (annotationTools.isDrawing()) {
        annotationTools.onMouseUp(e);
        return;
      }

      if (state.get('drag')) {
        transform.handleDragEnd(e);
      }
    };
    document.addEventListener('mouseup', _domHandlers.docMouseup);

    // Double click → component dialog or inline text edit
    _domHandlers.canvasDblclick = function(e) {
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
    };
    canvasEl.addEventListener('dblclick', _domHandlers.canvasDblclick);

    // Right click → context menu
    _domHandlers.canvasContextmenu = function(e) {
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
        // v2.3: skip if already linked as annotation
        if (!stickyEl.getAttribute('data-cc-ann-linked')) {
          actions['promote-to-annotation'] = function() {
            _promoteStickyToAnnotation(stickyEl);
          };
        }
      }

      // v2.3: If right-clicked on an annotation SVG element, show annotation context menu
      var annEl = e.target.closest('[data-ann-id]');
      if (annEl && annotator) {
        var annId = annEl.getAttribute('data-ann-id');
        var ann = annotator.getById(annId);
        if (ann && (ann.type === 'sticky' || ann.type === 'text' || ann.type === 'number')) {
          actions = {};  // Replace default actions with annotation-specific ones
          actions['ann-to-element'] = function() { _convertAnnotationToElement(annId); };
          actions['ann-edit'] = function() { bus.emit('annotation:edit-request', { id: annId }); };
          actions['ann-delete'] = function() {
            annotator.remove(annId);
            annotationRenderer.remove(annId);
            CC.toast.show('标注已删除', 'info');
          };
          contextMenu.show(e, e.target, actions);
          return;
        }
      }

      // If in edit mode with a selected element, add "add note" action
      if (state.get('mode.current') === 'edit' && state.selected && annotator) {
        actions['add-note'] = function() {
          var selEl = state.selected;
          var annX = 50, annY = 50;
          try {
            var selRect = selEl.getBoundingClientRect();
            var cvRect = canvasEl.getBoundingClientRect();
            annX = Math.round((selRect.left - cvRect.left + selRect.width / 2 - 100) / (state.zoom || 1));
            annY = Math.round((selRect.top - cvRect.top + selRect.height + 10) / (state.zoom || 1));
          } catch (ex) { /* fallback default position */ }
          var noteAnn = annotator.create({
            type: 'sticky',
            x: annX, y: annY, w: 200, h: 60,
            text: '', color: '#d48806', status: 'pending',
            pageId: appFacade.currentPage || null,
            target: _getSelectedElementTarget(state)
          });
          if (noteAnn) {
            annotationRenderer.render(noteAnn);
            // Immediately open edit for the note
            setTimeout(function() {
              bus.emit('annotation:edit-request', { id: noteAnn.id });
            }, 100);
          }
        };
      }

      contextMenu.show(e, e.target, actions);
    };
    canvasEl.addEventListener('contextmenu', _domHandlers.canvasContextmenu);

    // Click outside → deselect + close context menu
    _domHandlers.docMousedown = function(e) {
      if (dom.isEditorEl(e.target)) return;
      if (!shellResult.root.contains(e.target)) {
        selection.deselect();
        transform.removeResizeHandles();
        transform.removeRotateHandle();
      }
      contextMenu.remove();
    };
    document.addEventListener('mousedown', _domHandlers.docMousedown);

    // Wheel → zoom
    _domHandlers.viewportWheel = function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        canvas.handleWheel(e);
      }
    };
    shellResult.viewport.addEventListener('wheel', _domHandlers.viewportWheel, { passive: false });

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
      // First: deactivate active annotation tool
      if (annotationTools.getActiveTool()) {
        bus.emit('annotation:tool-deactivate');
        return;
      }
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
          document.body.classList.remove('cc-mode-edit', 'cc-mode-compare');
          selection.deselect();
          transform.removeResizeHandles();
          transform.removeRotateHandle();
          // Deactivate annotation tools
          annotationTools.deactivate();
          toast.show('预览模式 — 页面可交互', 'info');
          break;

        case 'edit':
          // Expand panels, full editing
          leftPanelEl.classList.remove('cc-left-collapsed');
          rightPanelEl.classList.remove('cc-right-collapsed');
          document.body.classList.add('cc-mode-edit');
          document.body.classList.remove('cc-mode-preview', 'cc-mode-compare');
          // Ensure annotation overlay exists (pointer-events: none by default)
          var editOverlay = annotationRenderer.getOverlay();
          if (!editOverlay) {
            editOverlay = annotationRenderer.createOverlay(canvasEl);
          }
          editOverlay.style.display = '';
          // Re-render saved annotations
          var editSavedAnns = state.get('annotations.list') || [];
          for (var esi = 0; esi < editSavedAnns.length; esi++) {
            annotationRenderer.render(editSavedAnns[esi]);
          }
          // Cleanup compare mode if active
          if (compareEngine && compareEngine.getMode()) {
            compareEngine.cleanup();
          }
          break;

        case 'compare':
          // Compare mode — capture current vs snapshot if available
          document.body.classList.add('cc-mode-compare');
          document.body.classList.remove('cc-mode-preview', 'cc-mode-edit');
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
    bus.on('toolbar:save-as', function() { exportEngine.saveAsFile && exportEngine.saveAsFile(); });
    bus.on('toolbar:export-html', function() { exportEngine.saveFile(); });
    bus.on('toolbar:export-png', function() { exportEngine.exportPNG(); });
    bus.on('toolbar:export-md', function() {
      var md = exportEngine.exportInstructions();
      var blob = new Blob([md], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'changelog.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      toast.show('Markdown \u5DF2\u5BFC\u51FA', 'success');
    });
    bus.on('toolbar:import-html', function() { bus.emit('toolbar:import'); });
    bus.on('toolbar:import-image', function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.png,.jpg,.jpeg,.gif,.webp';
      input.onchange = function(ev) {
        if (ev.target.files && ev.target.files[0]) {
          exportEngine.importImage && exportEngine.importImage(ev.target.files[0]);
        }
      };
      input.click();
    });
    bus.on('toolbar:import-url', function() {
      var url = window.prompt('\u8F93\u5165 URL:');
      if (url) bus.emit('url:load', url);
    });
    bus.on('toolbar:version-compare', function() {
      // Switch to versions tab in right panel
      state.set('rightTab', 'versions');
      bus.emit('rightPanel:tabChange', 'versions');
      toast.show('\u8BF7\u5728\u53F3\u4FA7\u300C\u7248\u672C\u300D\u9762\u677F\u9009\u62E9\u7248\u672C\u8FDB\u884C\u5BF9\u6BD4', 'info');
    });

    // Annotation tool selection (from component panel click)
    bus.on('annotation:tool-select', function(toolName) {
      if (state.get('mode.current') !== 'edit') {
        toast.show('请先进入编辑模式', 'info');
        return;
      }
      // Ensure overlay is ready for annotation tools
      var toolOverlay = annotationRenderer.getOverlay();
      if (!toolOverlay) {
        toolOverlay = annotationRenderer.createOverlay(canvasEl);
      }
      toolOverlay.style.display = '';
      annotationTools.setOverlay(toolOverlay);
      _bindAnnotationEvents();

      annotationTools.activate(toolName);
      toast.show('标注工具: ' + toolName + ' — 在画布上操作', 'info');
    });

    // Annotation tool deactivate (toggle collapsed or Escape)
    bus.on('annotation:tool-deactivate', function() {
      annotationTools.deactivate();
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

    // Toolbar: Toggle annotation sub-bar
    bus.on('toolbar:toggle-annotation', function() {
      if (state.get('mode.current') !== 'edit') {
        toast.show('请先进入编辑模式', 'info');
        return;
      }
      // Switch left panel to components tab and expand annotation group
      var lpHeader = document.querySelector('.cc-left-panel .cc-panel-header');
      if (lpHeader) {
        var compTab = lpHeader.querySelector('[data-tab="components"]');
        if (compTab) compTab.click();
      }
      // Expand annotation group in component panel
      setTimeout(function() {
        var annSection = null;
        var sections = document.querySelectorAll('.cc-comp-section');
        for (var si = 0; si < sections.length; si++) {
          var hdr = sections[si].querySelector('.cc-comp-header');
          if (hdr && hdr.textContent.indexOf('标注') !== -1) {
            annSection = sections[si];
            break;
          }
        }
        if (annSection) {
          // Ensure expanded
          var arrow = annSection.querySelector('.cc-comp-arrow');
          if (arrow && arrow.textContent === '\u25B6') {
            hdr = annSection.querySelector('.cc-comp-header');
            if (hdr) hdr.click();
          }
          annSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        toast.show('标注工具在左侧组件面板「标注」分组', 'info');
      }, 100);
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
      if (state.get('mode.current') !== 'edit') {
        toast.show('请先进入编辑模式', 'info');
        return;
      }
      // Ensure overlay is ready
      var atOverlay = annotationRenderer.getOverlay();
      if (!atOverlay) {
        atOverlay = annotationRenderer.createOverlay(canvasEl);
      }
      atOverlay.style.display = '';
      annotationTools.setOverlay(atOverlay);
      _bindAnnotationEvents();

      annotationTools.activate(data.tool);
    });

    // New annotation request → activate default tool
    bus.on('annotation:new-request', function() {
      if (state.get('mode.current') !== 'edit') {
        toast.show('请先进入编辑模式', 'info');
        return;
      }
      // Ensure overlay
      var nrOverlay = annotationRenderer.getOverlay();
      if (!nrOverlay) {
        nrOverlay = annotationRenderer.createOverlay(canvasEl);
      }
      nrOverlay.style.display = '';
      annotationTools.setOverlay(nrOverlay);
      _bindAnnotationEvents();

      // Activate arrow tool by default
      annotationTools.activate('arrow');
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
        'brush': '#ff4d4f', 'mosaic': '#8c8c8c', 'region': '#722ed1'
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
        status: defaultStatus,
        pageId: appFacade.currentPage || null,
        target: _getSelectedElementTarget(state)
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
      // Just highlight, no mode switch needed
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

    // v1.5: Annotation import event
    bus.on('annotation:import-request', function() {
      // Triggered from annotations tab — handled directly in tab UI
    });

    // v1.5: Design audit event
    bus.on('design:audit', function(opts) {
      if (!designAudit) {
        toast.show('设计审计模块未加载', 'error');
        return;
      }
      var result = designAudit.audit(opts || {});
      if (result.summary && result.summary.error) {
        toast.show(result.summary.error, 'error');
        return;
      }
      bus.emit('design:audit-result', result);
      toast.show('审计完成: ' + result.deviations.length + ' 处偏差', 'info');
    });

    // v1.5: Detect design system from imported HTML
    bus.on('design:detect-system', function(html) {
      if (!designSystems) {
        toast.show('设计系统模块未加载', 'error');
        return;
      }
      var detected = designSystems.detectSystem(html);
      if (detected) {
        toast.show('检测到设计系统: ' + detected.id + ' (置信度 ' + Math.round(detected.confidence * 100) + '%)', 'info');
        bus.emit('design:system-detected', detected);
      } else {
        toast.show('未检测到已知设计系统', 'info');
      }
    });

    // ── Phase 2A/B/C: AI + PRD Event Handlers ──────────────

    // Quick PRD popup after annotation creation
    // Only fires when user explicitly holds Alt while creating annotation,
    // OR when a non-trivial annotation (rect/text/sticky/number) is created.
    // Skips for brush/mosaic/measure/arrow to avoid noise.
    var PRD_POPUP_TYPES = { rect: true, text: true, sticky: true, number: true };
    bus.on('annotation:created', function(annotation) {
      // Pre-fill defaults only when annotation has no explicit module/priority yet
      var annSettings = state.get('settings.annotations') || {};
      var needsDefaults = !annotation.module && !annotation.priority;
      if (needsDefaults && (annSettings.defaultModule || annSettings.defaultPriority || annSettings.defaultRequirementType)) {
        var changes = {};
        if (annSettings.defaultModule) changes.module = annSettings.defaultModule;
        if (annSettings.defaultPriority) changes.priority = annSettings.defaultPriority;
        if (annSettings.defaultRequirementType) changes.requirementType = annSettings.defaultRequirementType;
        annotator.update(annotation.id, changes);
      }
      // Show quick PRD popup only for content-bearing annotation types,
      // and only when showPRDIndicators is enabled.
      if (PRD_POPUP_TYPES[annotation.type] && annSettings.showPRDIndicators !== false) {
        _showQuickPRDPopup(annotation);
      }
    });

    function _showQuickPRDPopup(annotation) {
      var annSettings = state.get('settings.annotations') || {};
      if (!annSettings.showPRDIndicators) return;

      // Find the annotation element position
      var zoom = state.zoom || 1;
      var canvasRect = canvasEl.getBoundingClientRect();
      var left = canvasRect.left + annotation.x * zoom + 20;
      var top = canvasRect.top + annotation.y * zoom;

      var popup = document.createElement('div');
      popup.className = 'cc-quick-prd-popup';
      popup.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;z-index:10000;' +
        'background:#fff;border:1px solid #d9d9d9;border-radius:8px;padding:10px 12px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:12px;min-width:180px;';

      var html = '<div style="margin-bottom:6px;font-weight:600;">快速 PRD 设置</div>' +
        '<div style="margin-bottom:4px;"><label>模块：</label><input class="cc-comp-input" id="cc-qprd-module" ' +
        'value="' + (annSettings.defaultModule || '') + '" style="width:120px;font-size:11px;padding:2px 6px;"></div>' +
        '<div style="margin-bottom:4px;display:flex;gap:4px;">' +
        '<span>优先级：</span>' +
        '<button class="cc-qprd-pri" data-pri="high" style="padding:1px 8px;font-size:10px;border:1px solid #ff4d4f;border-radius:3px;background:' +
        (annSettings.defaultPriority === 'high' ? '#ff4d4f' : '#fff') + ';color:' +
        (annSettings.defaultPriority === 'high' ? '#fff' : '#ff4d4f') + ';">高</button>' +
        '<button class="cc-qprd-pri" data-pri="medium" style="padding:1px 8px;font-size:10px;border:1px solid #faad14;border-radius:3px;background:' +
        (annSettings.defaultPriority === 'medium' || !annSettings.defaultPriority ? '#faad14' : '#fff') + ';color:' +
        (annSettings.defaultPriority === 'medium' || !annSettings.defaultPriority ? '#fff' : '#faad14') + ';">中</button>' +
        '<button class="cc-qprd-pri" data-pri="low" style="padding:1px 8px;font-size:10px;border:1px solid #52c41a;border-radius:3px;background:' +
        (annSettings.defaultPriority === 'low' ? '#52c41a' : '#fff') + ';color:' +
        (annSettings.defaultPriority === 'low' ? '#fff' : '#52c41a') + ';">低</button></div>' +
        '<div style="margin-top:6px;display:flex;gap:6px;">' +
        '<button id="cc-qprd-ok" style="padding:2px 12px;font-size:11px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">确定</button>' +
        '<button id="cc-qprd-skip" style="padding:2px 12px;font-size:11px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;">跳过</button></div>';
      popup.innerHTML = html;
      document.body.appendChild(popup);

      var selectedPri = annSettings.defaultPriority || 'medium';

      // Priority button toggle
      popup.querySelectorAll('.cc-qprd-pri').forEach(function(btn) {
        btn.addEventListener('click', function() {
          selectedPri = btn.getAttribute('data-pri');
          var colors = { high: '#ff4d4f', medium: '#faad14', low: '#52c41a' };
          popup.querySelectorAll('.cc-qprd-pri').forEach(function(b) {
            var p = b.getAttribute('data-pri');
            b.style.background = p === selectedPri ? colors[p] : '#fff';
            b.style.color = p === selectedPri ? '#fff' : colors[p];
          });
        });
      });

      // OK button
      popup.querySelector('#cc-qprd-ok').addEventListener('click', function() {
        var moduleVal = popup.querySelector('#cc-qprd-module').value;
        annotator.update(annotation.id, {
          module: moduleVal,
          priority: selectedPri
        });
        if (popup.parentNode) popup.parentNode.removeChild(popup);
        toast.show('PRD 信息已设置', 'success');
      });

      // Skip button
      popup.querySelector('#cc-qprd-skip').addEventListener('click', function() {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
      });

      // Keyboard shortcuts
      function onKey(e) {
        if (e.key === 'Enter') {
          popup.querySelector('#cc-qprd-ok').click();
          document.removeEventListener('keydown', onKey);
        } else if (e.key === 'Escape') {
          popup.querySelector('#cc-qprd-skip').click();
          document.removeEventListener('keydown', onKey);
        }
      }
      document.addEventListener('keydown', onKey);

      // Auto-remove after 15 seconds
      setTimeout(function() {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
        document.removeEventListener('keydown', onKey);
      }, 15000);
    }

    // Batch update annotations
    bus.on('annotation:batch-update', function(data) {
      if (!data.ids || !data.changes) return;
      var count = 0;
      for (var i = 0; i < data.ids.length; i++) {
        var updated = annotator.update(data.ids[i], data.changes);
        if (updated) {
          annotationRenderer.remove(data.ids[i]);
          annotationRenderer.render(updated);
          count++;
        }
      }
      toast.show('已批量更新 ' + count + ' 个标注', 'success');
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

    // Import tokens (file picker) — v1.4: supports CSS/JSON/MD
    bus.on('token:import-request', function() {
      if (!tokenImporter || !tokenizer) {
        toast.show('令牌模块未加载', 'info');
        return;
      }
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.css,.json,.md,.markdown';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var text = ev.target.result;

          // v1.4: Use design-systems auto-detect if available
          if (designSystems) {
            var parsed = designSystems.importAuto(text, file.name);
            if (parsed) {
              designSystems.registerCustom(parsed);
              designSystems.applySystem(parsed.id);
              bus.emit('tokens:changed', {});
              var total = 0;
              var cats = ['colors', 'typography', 'spacing', 'radius', 'shadows'];
              for (var c = 0; c < cats.length; c++) {
                if (parsed.tokens[cats[c]]) total += parsed.tokens[cats[c]].length;
              }
              toast.show('已导入 ' + file.name + '（' + total + ' 个令牌）', 'success');
            } else {
              toast.show('无法解析文件：' + file.name, 'error');
            }
          } else {
            // Fallback to old behavior
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
          }
        };
        reader.readAsText(file);
        document.body.removeChild(input);
      });
      input.click();
    });

    // Load preset tokens — v1.4: delegates to CCDesignSystems
    bus.on('token:load-preset', function(data) {
      var presetId = data.preset || data.id;
      if (designSystems) {
        var ok = designSystems.applySystem(presetId);
        if (ok) {
          bus.emit('tokens:changed', {});
          var info = designSystems.listSystems().filter(function(s) { return s.id === presetId; });
          var label = info.length > 0 ? info[0].name : presetId;
          toast.show('已加载「' + label + '」设计系统', 'success');
        } else {
          toast.show('未知预设：' + presetId, 'error');
        }
      } else if (tokenImporter && tokenizer) {
        var tokens = tokenImporter.getPreset(presetId);
        var count = 0;
        for (var i = 0; i < tokens.length; i++) {
          var t = tokens[i];
          tokenizer.add(t.category, t.name, t.value);
          count++;
        }
        bus.emit('tokens:changed', {});
        toast.show('已加载预设「' + presetId + '」' + count + ' 个令牌', 'success');
      } else {
        toast.show('令牌模块未加载', 'info');
      }
    });

    // v1.4: Export tokens
    bus.on('token:export', function(data) {
      if (!designSystems) { toast.show('设计系统模块未加载', 'info'); return; }
      var content, filename, mime;
      if (data.format === 'json') {
        content = designSystems.exportJSON();
        filename = 'design-tokens.json';
        mime = 'application/json';
      } else {
        content = designSystems.exportCSS();
        filename = 'design-tokens.css';
        mime = 'text/css';
      }
      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.show('已导出 ' + filename, 'success');
    });

    // v1.4: Clear active design system
    bus.on('token:clear', function() {
      if (designSystems) {
        designSystems.clearActive();
        bus.emit('tokens:changed', {});
        toast.show('已清除设计系统', 'success');
      }
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
      ai: function() { return aiClient; },
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

      // Restore pages (critical for annotation pageId filtering)
      CCPersistence.load('pages', function(saved) {
        if (saved && Array.isArray(saved.list) && saved.list.length > 0) {
          state.set('pages.list', saved.list);
        }
        if (saved && typeof saved.current === 'number' && saved.current >= 0) {
          state.set('pages.current', saved.current);
        }
        // Restore current page HTML if available
        if (saved && saved.list && saved.list.length > 0) {
          var currentPage = saved.list.filter(function(p) {
            return p.id === saved.currentActiveId;
          })[0];
          if (currentPage && currentPage.html && state.canvas) {
            state.canvas.innerHTML = currentPage.html;
          }
        }
        bus.emit('pages:restored');
      });

      // Debounced save on state changes
      CC._persistTimer = null;
      CC._persistPagesTimer = null;
      bus.on('state:changed', function(ev) {
        // Support both single and batch change events
        var changes = ev.batch ? ev.changes : [ev];
        changes.forEach(function(change) {
          if (!change.path) return;
          // Persist settings
          if (change.path.indexOf('settings.') === 0) {
            if (CC._persistTimer) clearTimeout(CC._persistTimer);
            CC._persistTimer = setTimeout(function() {
              CCPersistence.save('settings', state.get('settings'));
            }, 2000);
          }
          // Persist annotations
          if (change.path === 'annotations.list') {
            CCPersistence.debounceSave('annotations', state.get('annotations.list'));
          }
          // Persist pages
          if (change.path.indexOf('pages.') === 0) {
            if (CC._persistPagesTimer) clearTimeout(CC._persistPagesTimer);
            CC._persistPagesTimer = setTimeout(function() {
              // Save current canvas HTML to active page before persisting
              _saveCurrentPageHtml();
              var pagesData = {
                list: state.get('pages.list') || [],
                current: state.get('pages.current') || 0,
                currentActiveId: _getCurrentPageId()
              };
              CCPersistence.save('pages', pagesData);
            }, 2000);
          }
          // Persist tokens
          if (change.path.indexOf('tokens') === 0 || change.path === 'settings.activeDesignSystem') {
            CCPersistence.debounceSave('tokens', {
              tokens: state.get('tokens'),
              activeDesignSystem: state.get('settings.activeDesignSystem')
            });
          }
        });
      });

      // Restore tokens
      CCPersistence.load('tokens', function(saved) {
        if (saved) {
          if (saved.tokens) state.set('tokens', saved.tokens);
          if (saved.activeDesignSystem) state.set('settings.activeDesignSystem', saved.activeDesignSystem);
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
      oldVal: {
        html: el.outerHTML,
        parentId: el.parentElement ? el.parentElement.id : '',
        parentPath: el.parentElement ? CC.dom.buildPath(el.parentElement) : ''
      },
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

  /**
   * v2.3: Convert an annotation (sticky/text/number) to a canvas sticky element.
   * Uses factory.createElementByType to bypass component panel registration.
   */
  function _convertAnnotationToElement(annId) {
    var ann = annotator.getById(annId);
    if (!ann) return;

    // Create sticky element via internal factory method
    var el = factory.createElementByType('sticky', ann.x, ann.y);
    if (!el) {
      CC.toast.show('创建元素失败', 'error');
      return;
    }

    // Fill in text content
    var content = el.querySelector('.cc-sticky-content');
    if (content && ann.text) content.textContent = ann.text;

    // Append to canvas
    var canvasEl = state.canvas;
    canvasEl.appendChild(el);

    // Track creation
    changeTracker.record('insert', {
      element: el,
      html: el.outerHTML
    }, null, { elementId: el.id });
    bus.emit('element:created', { element: el, type: 'sticky' });

    // Mark as linked
    el.setAttribute('data-cc-ann-linked', 'true');
    el.setAttribute('data-cc-ann-id', ann.id);

    // Remove annotation
    annotator.remove(annId);
    annotationRenderer.remove(annId);

    CC.toast.show('已转为画布便签', 'success');
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
  /**
   * Build a CSS selector string for the currently selected element.
   * Returns null if no element is selected.
   */
  function _getSelectedElementTarget(state) {
    var sel = state.selected || state.get('canvas.selectedElement');
    if (!sel) return null;
    // Prefer id, then data-type + class, then tag + nth-child
    if (sel.id) return '#' + sel.id;
    var tag = (sel.tagName || 'div').toLowerCase();
    var dt = sel.getAttribute('data-type');
    if (dt) return tag + '[data-type="' + dt + '"]';
    var cls = sel.className && typeof sel.className === 'string' ? sel.className.split(/\s+/).filter(function(c) {
      return c && c.indexOf('cc-') !== 0;
    })[0] : '';
    if (cls) return tag + '.' + cls;
    return tag;
  }

  function _ensureAnnotationToolbar(canvasEl) {
    // Toolbar UI is now in the main toolbar annotation sub-bar (annBar)
    // Only ensure annotation events are bound
    _bindAnnotationEvents();
  }

  function _bindAnnotationEvents() {
    // v2.2: Annotation drawing events are now handled at canvas level
    // (canvasMousedown/docMousemove/docMouseup intercept annotationTools).
    // This function binds dblclick (edit) and click (focus/locate) on annotations.
    if (CC._annDblClickBound) return;
    CC._annDblClickBound = true;

    var el = CC.state ? CC.state.canvas : null;
    if (!el) return;

    // Double-click annotation → edit
    el.addEventListener('dblclick', function(e) {
      // Walk up to find annotation group with data-ann-id
      var target = e.target;
      while (target && target !== el) {
        var annId = target.getAttribute('data-ann-id');
        if (annId) {
          e.preventDefault();
          e.stopPropagation();
          bus.emit('annotation:edit-request', { id: annId });
          return;
        }
        target = target.parentElement;
      }
    });

    // Single-click annotation → locate in right panel
    el.addEventListener('click', function(e) {
      var annGroup = e.target.closest('[data-ann-id]');
      if (annGroup) {
        bus.emit('annotation:focus', { id: annGroup.getAttribute('data-ann-id') });
      }
    });
  }

  // annotation:focus → switch right panel to notes tab & scroll to annotation
  bus.on('annotation:focus', function(data) {
    var rpHeader = document.querySelector('.cc-right-panel .cc-panel-header');
    if (rpHeader) {
      var notesTab = rpHeader.querySelector('[data-tab="notes-annotations"]');
      if (notesTab) notesTab.click();
    }
    bus.emit('notes-tab:scroll-to', { id: data.id });
  });

  // ==================== Shutdown ====================
  function shutdown() {
    // Final persistence save
    if (window.CCPersistence) {
      var annList = CC.state ? CC.state.get('annotations.list') : [];
      var settings = CC.state ? CC.state.get('settings') : null;
      if (annList && annList.length) CCPersistence.save('annotations', annList);
      if (settings) CCPersistence.save('settings', settings);
    }

    // Clear persist timer
    if (CC._persistTimer) clearTimeout(CC._persistTimer);

    // Remove all editor DOM
    var root = document.querySelector('.cc-root');
    if (root) root.remove();

    // Remove handles
    if (CC.state) {
      var handles = CC.state.get('handles.resize') || [];
      handles.forEach(function(h) { h.remove(); });
      var rh = CC.state.get('handles.rotate');
      if (rh) rh.remove();
    }

    // Teardown canvas (keydown/keyup/wheel + pan listeners)
    if (CC.canvas) CC.canvas.destroy();

    // Teardown clipboard (document keydown)
    if (CC.clipboard) CC.clipboard.destroy();

    // Teardown tabs (bus.off subscriptions)
    var tabs = ['layersTab', 'propertiesTab', 'changesTab', 'notesAnnotationsTab',
                'annotationsTab', 'stylesTab'];
    tabs.forEach(function(tabName) {
      var tab = CC._tabs && CC._tabs[tabName];
      if (tab && typeof tab.destroy === 'function') tab.destroy();
    });

    // Remove DOM event listeners
    if (CC._domHandlers) {
      var canvasEl = CC.state ? CC.state.canvas : null;
      var wrapper = CC.state ? CC.state.get('canvas.wrapper') : null;
      var h = CC._domHandlers;
      if (canvasEl) {
        canvasEl.removeEventListener('mousedown', h.canvasMousedown);
        canvasEl.removeEventListener('dblclick', h.canvasDblclick);
        canvasEl.removeEventListener('contextmenu', h.canvasContextmenu);
      }
      document.removeEventListener('mousemove', h.docMousemove);
      document.removeEventListener('mouseup', h.docMouseup);
      document.removeEventListener('mousedown', h.docMousedown);
      if (wrapper) {
        wrapper.removeEventListener('wheel', h.viewportWheel);
      }
    }

    // Teardown keyboard
    if (CC.keyboard) CC.keyboard.teardown();

    // Destroy event bus (last — clears all subscriptions)
    if (CC.bus) CC.bus.destroy();

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
