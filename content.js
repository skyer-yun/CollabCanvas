/**
 * CollabCanvas — Extension Entry (Content Script)
 * Manifest V3 扩展入口：激活守卫 + Toggle + 加载所有模块
 */
(function() {
  'use strict';

  // Activation guard: use dataset on documentElement for extension mode
  if (document.documentElement.dataset.ccActive === 'true') {
    // Already active — toggle off (shutdown)
    if (window.__cc_shutdown) {
      window.__cc_shutdown();
    }
    return;
  }

  // Mark as activating
  document.documentElement.dataset.ccActive = 'true';

  // Script loading order (dependency-based)
  var scripts = [
    // Layer 0: No dependencies
    'core/event-bus.js',
    'engine/dom-utils.js',
    'core/persistence.js',

    // Layer 1: State
    'core/state.js',

    // Layer 2: Canvas
    'canvas/canvas-wrapper.js',
    'canvas/infinite-canvas.js',

    // Layer 3: Engine core
    'engine/change-tracker.js',
    'engine/selection.js',
    'engine/text-edit.js',
    'engine/align.js',
    'engine/transform.js',
    'engine/group.js',
    'engine/clipboard.js',
    'engine/zorder.js',
    'engine/element-factory.js',
    'engine/page-extractor.js',
    'engine/component-renderer.js',
    'engine/annotation-exporter.js',

    // Layer 4: Engine complete
    'engine/undo-redo.js',
    'engine/export-engine.js',

    // Layer 5: Mode + Keyboard
    'core/mode-machine.js',
    'core/keyboard.js',

    // Layer 5: UI base
    'ui/toast.js',
    'ui/modal.js',
    'ui/context-menu.js',
    'ui/component-dialog.js',
    'ui/shell.js',
    'ui/toolbar.js',
    'ui/settings-dialog.js',
    'ui/left-panel.js',
    'ui/right-panel.js',
    'ui/statusbar.js',

    // Layer 5: UI tabs
    'ui/tabs/layers-tab.js',
    'ui/tabs/components-tab.js',
    'ui/tabs/properties-tab.js',
    'ui/tabs/changes-tab.js',
    'ui/tabs/notes-annotations-tab.js',

    // Layer 6: Phase 2
    'annotation/annotator.js',
    'annotation/tools.js',
    'annotation/renderer.js',
    'annotation/annotation-importer.js',
    'compare/compare-engine.js',
    'compare/dom-differ.js',
    'tokens/extractor.js',
    'tokens/tokenizer.js',
    'tokens/design-systems.js',
    'tokens/importer.js',
    'tokens/design-audit.js',
    'ui/tabs/annotations-tab.js',
    'ui/tabs/styles-tab.js',

    // Layer 7: Phase 3
    'version/snapshot.js',
    'version/differ.js',
    'version/store.js',
    'loader/html-loader.js',
    'loader/image-loader.js',
    'loader/archive-loader.js',
    'loader/proxy.js',
    'core/ai-client.js',
    'ui/tabs/ai-tab.js',
    'ui/tabs/pages-tab.js',
    'ui/tabs/versions-tab.js',

    // Layer 8: Main entry
    'main.js'
  ];

  // Get extension base URL
  var baseUrl = chrome.runtime.getURL('');

  // Load CSS
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = baseUrl + 'styles/collabcanvas.css';
  document.head.appendChild(css);

  // Load scripts sequentially (to maintain dependency order)
  var index = 0;

  function loadNext() {
    if (index >= scripts.length) {
      console.log('[CollabCanvas Extension] All modules loaded');
      return;
    }

    var script = document.createElement('script');
    script.src = baseUrl + scripts[index];
    script.onload = function() {
      index++;
      loadNext();
    };
    script.onerror = function() {
      console.warn('[CollabCanvas Extension] Failed to load: ' + scripts[index]);
      index++;
      loadNext(); // Continue even if a module fails
    };
    (document.head || document.documentElement).appendChild(script);
  }

  loadNext();

  // Expose shutdown for toggle
  window.__cc_shutdown = function() {
    if (window.__CC && window.__CC.engine) {
      window.__CC.engine.shutdown();
    }
    document.documentElement.dataset.ccActive = 'false';
    window.__cc_shutdown = null;
  };
})();
