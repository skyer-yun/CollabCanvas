/**
 * CollabCanvas - Pages Tab Module v1.3
 * Axure-like page tree with folders, expand/collapse, drag-drop, context menu
 * IIFE exporting to window.CCPagesTab
 */
(function (global) {
  'use strict';

  function PagesTab(app, modal) {
    this._app = app;
    this._modal = modal;
    this._container = null;
    this._searchTerm = '';
    this._dragSrcId = null;
    this._ctxTarget = null;
  }

  PagesTab.prototype.render = function (container) {
    this._container = container;
    this._draw();
    this._bindBusEvents();
    return this;
  };

  PagesTab.prototype._draw = function () {
    var c = this._container;
    c.innerHTML = '';
    c.className = 'cc-pages-tab';

    c.appendChild(this._createToolbar());
    c.appendChild(this._createTree());
    if (!this._ctxBound) { this._bindContextMenu(c); this._ctxBound = true; }
  };

  // ── Toolbar (compact, single row) ─────────────────────

  PagesTab.prototype._createToolbar = function () {
    var self = this;
    var bar = document.createElement('div');
    bar.className = 'cc-pages-toolbar';

    // New page button
    var addBtn = document.createElement('button');
    addBtn.className = 'cc-pages-tb-btn';
    addBtn.title = '新建页面';
    addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';
    addBtn.onclick = function () { self._promptAdd('page'); };
    bar.appendChild(addBtn);

    // New folder button
    var folderBtn = document.createElement('button');
    folderBtn.className = 'cc-pages-tb-btn';
    folderBtn.title = '新建文件夹';
    folderBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 4.5V3.5a1 1 0 011-1h3l1.5 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
    folderBtn.onclick = function () { self._promptAdd('folder'); };
    bar.appendChild(folderBtn);

    // Separator
    var sep = document.createElement('span');
    sep.className = 'cc-pages-tb-sep';
    bar.appendChild(sep);

    // Import files
    var importBtn = document.createElement('button');
    importBtn.className = 'cc-pages-tb-btn';
    importBtn.title = '导入文件';
    importBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v8M4 6l3 3 3-3M2 11v1.5h10V11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    importBtn.onclick = function () { self._triggerImport(false); };
    bar.appendChild(importBtn);

    // Import folder
    var importDirBtn = document.createElement('button');
    importDirBtn.className = 'cc-pages-tb-btn';
    importDirBtn.title = '导入文件夹';
    importDirBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 10l2.5 3h7L13 10M7 1v9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    importDirBtn.onclick = function () { self._triggerImport(true); };
    bar.appendChild(importDirBtn);

    // Separator
    var sep2 = document.createElement('span');
    sep2.className = 'cc-pages-tb-sep';
    bar.appendChild(sep2);

    // Search
    var search = document.createElement('input');
    search.className = 'cc-pages-search';
    search.type = 'text';
    search.placeholder = '搜索...';
    search.oninput = function () {
      self._searchTerm = search.value.trim().toLowerCase();
      self.refresh();
    };
    bar.appendChild(search);

    // Hidden file inputs
    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.multiple = true;
    fileInput.accept = '.html,.htm'; fileInput.style.display = 'none';
    fileInput.onchange = function (e) { if (self._app && self._app.importPages) self._app.importPages(e.target.files); self.refresh(); };
    bar.appendChild(fileInput);
    this._fileInput = fileInput;

    var folderInput = document.createElement('input');
    folderInput.type = 'file'; folderInput.multiple = true;
    folderInput.accept = '.html,.htm'; folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';
    folderInput.onchange = function (e) { if (self._app && self._app.importPages) self._app.importPages(e.target.files); self.refresh(); };
    bar.appendChild(folderInput);
    this._folderInput = folderInput;

    return bar;
  };

  // ── Tree ───────────────────────────────────────────────

  PagesTab.prototype._createTree = function () {
    var tree = document.createElement('div');
    tree.className = 'cc-pages-tree';

    var pages = (this._app && this._app.pages) || [];
    var rootItems = this._getChildren(pages, null);

    if (rootItems.length === 0) {
      tree.appendChild(this._createEmpty());
      return tree;
    }

    this._renderLevel(tree, rootItems, pages, 0);
    return tree;
  };

  PagesTab.prototype._renderLevel = function (parentEl, items, allPages, depth) {
    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      // Search filter
      if (this._searchTerm) {
        if (!this._matchesSearch(item, allPages)) continue;
      }

      if (item.type === 'folder') {
        parentEl.appendChild(this._createFolderRow(item, depth, allPages));
        if (item.expanded) {
          var children = this._getChildren(allPages, item.id);
          this._renderLevel(parentEl, children, allPages, depth + 1);
        }
      } else {
        parentEl.appendChild(this._createPageRow(item, depth));
      }
    }
  };

  PagesTab.prototype._matchesSearch = function (item, allPages) {
    if (item.name && item.name.toLowerCase().indexOf(this._searchTerm) !== -1) return true;
    if (item.type === 'folder') {
      var children = this._getChildren(allPages, item.id);
      for (var i = 0; i < children.length; i++) {
        if (this._matchesSearch(children[i], allPages)) return true;
      }
    }
    return false;
  };

  PagesTab.prototype._getChildren = function (pages, parentId) {
    var result = [];
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      if ((parentId === null && !p.parentId) || p.parentId === parentId) {
        result.push(p);
      }
    }
    result.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    return result;
  };

  // ── Folder Row ─────────────────────────────────────────

  PagesTab.prototype._createFolderRow = function (folder, depth, allPages) {
    var self = this;
    var row = document.createElement('div');
    row.className = 'cc-tree-row cc-tree-folder';
    row.setAttribute('data-id', folder.id);
    row.style.paddingLeft = (depth * 16 + 6) + 'px';

    // Expand arrow
    var arrow = document.createElement('span');
    arrow.className = 'cc-tree-arrow' + (folder.expanded ? ' cc-tree-arrow-open' : '');
    arrow.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1.5l4 3.5-4 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
    row.appendChild(arrow);

    // Folder icon
    var icon = document.createElement('span');
    icon.className = 'cc-tree-icon';
    icon.innerHTML = folder.expanded
      ? '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 4.5V3.5a1 1 0 011-1h3l1.5 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" stroke="#faad14" stroke-width="1.2" fill="#fffbe6"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 4.5V3.5a1 1 0 011-1h3l1.5 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" stroke="#d9d9d9" stroke-width="1.2" fill="#fafafa"/></svg>';
    row.appendChild(icon);

    // Name
    var nameEl = document.createElement('span');
    nameEl.className = 'cc-tree-name';
    nameEl.textContent = folder.name;
    row.appendChild(nameEl);

    // Child count
    var childCount = this._getChildren(allPages, folder.id).length;
    if (childCount > 0) {
      var count = document.createElement('span');
      count.className = 'cc-tree-count';
      count.textContent = childCount;
      row.appendChild(count);
    }

    // Click → toggle
    row.onclick = function (e) {
      e.stopPropagation();
      if (self._app && self._app.toggleFolder) self._app.toggleFolder(folder.id);
      self.refresh();
    };

    // Double click → rename
    nameEl.ondblclick = function (e) {
      e.stopPropagation();
      self._inlineRename(folder.id, folder.name, nameEl);
    };

    // Drag
    row.draggable = true;
    row.addEventListener('dragstart', function (e) {
      self._dragSrcId = folder.id;
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('cc-tree-dragging');
    });
    row.addEventListener('dragend', function () {
      row.classList.remove('cc-tree-dragging');
      self._dragSrcId = null;
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('cc-tree-drag-over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('cc-tree-drag-over'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('cc-tree-drag-over');
      if (self._dragSrcId && self._dragSrcId !== folder.id) {
        self._moveInto(self._dragSrcId, folder.id);
      }
    });

    return row;
  };

  // ── Page Row ──────────────────────────────────────────

  PagesTab.prototype._createPageRow = function (page, depth) {
    var self = this;
    var row = document.createElement('div');
    row.className = 'cc-tree-row cc-tree-page';
    row.setAttribute('data-id', page.id);
    row.style.paddingLeft = (depth * 16 + 6) + 'px';

    if (this._app && this._app.currentPage === page.id) {
      row.classList.add('cc-tree-active');
    }

    // Spacer for arrow alignment
    var arrowSpacer = document.createElement('span');
    arrowSpacer.className = 'cc-tree-arrow-spacer';
    row.appendChild(arrowSpacer);

    // Page icon
    var icon = document.createElement('span');
    icon.className = 'cc-tree-icon';
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.1" fill="none"/><path d="M5 4h4M5 6.5h4M5 9h2.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>';
    row.appendChild(icon);

    // Name
    var nameEl = document.createElement('span');
    nameEl.className = 'cc-tree-name';
    nameEl.textContent = page.name;
    row.appendChild(nameEl);

    // Hover actions
    var actions = document.createElement('span');
    actions.className = 'cc-tree-actions';
    actions.innerHTML =
      '<button class="cc-tree-action" title="重命名" data-act="rename"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 1.5l2.5 2.5-7 7H1v-3l7-7z" stroke="currentColor" stroke-width="1" fill="none"/></svg></button>' +
      '<button class="cc-tree-action" title="删除" data-act="delete"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 3h8M4.5 3V2h3v1M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>';
    row.appendChild(actions);

    // Action button clicks
    actions.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (act === 'rename') self._promptRename(page.id, page.name);
      else if (act === 'delete') self._confirmDelete(page.id, page.name);
    });

    // Click → switch page
    row.onclick = function (e) {
      e.stopPropagation();
      if (self._app && self._app.switchPage) {
        self._app.switchPage(page.id);
        self.refresh();
      }
    };

    // Double click → rename
    nameEl.ondblclick = function (e) {
      e.stopPropagation();
      self._inlineRename(page.id, page.name, nameEl);
    };

    // Drag
    row.draggable = true;
    row.addEventListener('dragstart', function (e) {
      self._dragSrcId = page.id;
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('cc-tree-dragging');
    });
    row.addEventListener('dragend', function () {
      row.classList.remove('cc-tree-dragging');
      self._dragSrcId = null;
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('cc-tree-drag-over');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('cc-tree-drag-over'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('cc-tree-drag-over');
      if (self._dragSrcId && self._dragSrcId !== page.id) {
        // Drop on page → insert after this page at same parent level
        self._moveAfter(self._dragSrcId, page.id);
      }
    });

    return row;
  };

  // ── Empty State ────────────────────────────────────────

  PagesTab.prototype._createEmpty = function () {
    var el = document.createElement('div');
    el.className = 'cc-pages-empty';
    el.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="7" y="3" width="26" height="34" rx="3" stroke="#d9d9d9" stroke-width="1.5"/><path d="M13 13h14M13 18h14M13 23h9" stroke="#d9d9d9" stroke-width="1" stroke-linecap="round"/></svg>' +
      '<div class="cc-pages-empty-text">暂无页面</div>' +
      '<div class="cc-pages-empty-hint">点击工具栏按钮新建或导入</div>';
    return el;
  };

  // ── Context Menu ───────────────────────────────────────

  PagesTab.prototype._bindContextMenu = function (container) {
    var self = this;
    container.addEventListener('contextmenu', function (e) {
      var row = e.target.closest('.cc-tree-row');
      if (!row) return;
      e.preventDefault();
      var id = row.getAttribute('data-id');
      if (!id) return;
      self._showContextMenu(e.clientX, e.clientY, id);
    });
  };

  PagesTab.prototype._showContextMenu = function (x, y, id) {
    var self = this;
    // Remove any existing menu
    var old = document.querySelector('.cc-tree-ctx');
    if (old) old.remove();

    var pages = (this._app && this._app.pages) || [];
    var node = null;
    for (var i = 0; i < pages.length; i++) { if (pages[i].id === id) { node = pages[i]; break; } }
    if (!node) return;

    var menu = document.createElement('div');
    menu.className = 'cc-tree-ctx';

    var items = [];
    if (node.type === 'folder') {
      items.push({ label: '新建页面', fn: function () { self._promptAdd('page', id); } });
      items.push({ label: '新建子文件夹', fn: function () { self._promptAdd('folder', id); } });
    }
    items.push({ label: '重命名', fn: function () { self._promptRename(id, node.name); } });
    items.push({ label: '删除', fn: function () { self._confirmDelete(id, node.name); } });

    for (var j = 0; j < items.length; j++) {
      var item = document.createElement('div');
      item.className = 'cc-tree-ctx-item';
      item.textContent = items[j].label;
      item.setAttribute('data-idx', j);
      menu.appendChild(item);
    }

    // Position
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    // Adjust if off-screen
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

    menu.onclick = function (e) {
      var el = e.target.closest('[data-idx]');
      if (el) {
        var idx = parseInt(el.getAttribute('data-idx'), 10);
        if (items[idx] && items[idx].fn) items[idx].fn();
      }
      menu.remove();
    };

    // Close on click outside
    setTimeout(function () {
      function close(ev) { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } }
      document.addEventListener('mousedown', close);
    }, 50);
  };

  // ── Drag-Drop Move ────────────────────────────────────

  PagesTab.prototype._moveInto = function (srcId, folderId) {
    if (srcId === folderId) return;
    if (this._app && this._app.moveNode) {
      this._app.moveNode(srcId, folderId, 0);
      this.refresh();
    }
  };

  PagesTab.prototype._moveAfter = function (srcId, targetId) {
    if (srcId === targetId) return;
    var pages = (this._app && this._app.pages) || [];
    var target = null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].id === targetId) { target = pages[i]; break; }
    }
    if (!target) return;
    if (this._app && this._app.moveNode) {
      this._app.moveNode(srcId, target.parentId || null, (target.order || 0) + 0.5);
      this.refresh();
    }
  };

  // ── Prompt Dialogs ─────────────────────────────────────

  PagesTab.prototype._promptAdd = function (type, parentId) {
    var self = this;
    var modalInst = this._modal || window.CC_modal_instance;
    if (!modalInst || typeof modalInst.show !== 'function') {
      // Fallback: use window prompt
      var name = prompt(type === 'folder' ? '输入文件夹名称' : '输入页面名称', type === 'folder' ? '新文件夹' : '未命名页面');
      if (!name) return;
      if (type === 'folder') {
        if (self._app && self._app.addFolder) { self._app.addFolder(name, parentId); self.refresh(); }
      } else {
        if (self._app && self._app.addPage) { self._app.addPage(name, parentId); self.refresh(); }
      }
      return;
    }

    var label = type === 'folder' ? '文件夹名称' : '页面名称';
    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>' + label + '</label>' +
      '<input class="cc-comp-input" id="cc-pages-add-input" placeholder="' + label + '" autofocus></div>' +
      '</div>';

    var overlay = modalInst.show(type === 'folder' ? '新建文件夹' : '新建页面', html, [
      { text: '取消', cls: '', fn: function (d) { var o = d.closest('.cc-overlay'); if (o) o.remove(); } },
      {
        text: '确定', cls: 'primary', fn: function (d) {
          var inp = d.querySelector('#cc-pages-add-input');
          var name = (inp && inp.value.trim()) || '';
          if (!name) return;
          if (type === 'folder') {
            if (self._app && self._app.addFolder) { self._app.addFolder(name, parentId); self.refresh(); }
          } else {
            if (self._app && self._app.addPage) { self._app.addPage(name, parentId); self.refresh(); }
          }
          var o = d.closest('.cc-overlay'); if (o) o.remove();
        }
      }
    ]);
    setTimeout(function () {
      var inp = overlay ? overlay.querySelector('#cc-pages-add-input') : document.querySelector('#cc-pages-add-input');
      if (inp) inp.focus();
    }, 100);
  };

  PagesTab.prototype._promptRename = function (id, currentName) {
    var self = this;
    var modalInst = this._modal || window.CC_modal_instance;
    if (!modalInst || typeof modalInst.show !== 'function') {
      var name = prompt('输入新名称', currentName);
      if (name && name !== currentName && self._app && self._app.renamePage) {
        self._app.renamePage(id, name); self.refresh();
      }
      return;
    }

    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>名称</label>' +
      '<input class="cc-comp-input" id="cc-pages-rename-input" value="' + _escHtml(currentName) + '"></div></div>';

    var overlay = modalInst.show('重命名', html, [
      { text: '取消', cls: '', fn: function (d) { var o = d.closest('.cc-overlay'); if (o) o.remove(); } },
      {
        text: '确定', cls: 'primary', fn: function (d) {
          var inp = d.querySelector('#cc-pages-rename-input');
          var name = (inp && inp.value.trim()) || '';
          if (!name) return;
          if (self._app && self._app.renamePage) { self._app.renamePage(id, name); self.refresh(); }
          var o = d.closest('.cc-overlay'); if (o) o.remove();
        }
      }
    ]);
    setTimeout(function () {
      var inp = overlay ? overlay.querySelector('#cc-pages-rename-input') : document.querySelector('#cc-pages-rename-input');
      if (inp) { inp.focus(); inp.select(); }
    }, 100);
  };

  PagesTab.prototype._inlineRename = function (id, currentName, el) {
    var self = this;
    var input = document.createElement('input');
    input.className = 'cc-tree-inline-input';
    input.value = currentName;
    el.textContent = '';
    el.appendChild(input);
    input.focus();
    input.select();

    function finish() {
      var name = input.value.trim() || currentName;
      if (name !== currentName && self._app && self._app.renamePage) {
        self._app.renamePage(id, name);
      }
      el.textContent = name;
    }
    input.onblur = finish;
    input.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    };
  };

  PagesTab.prototype._confirmDelete = function (id, name) {
    var self = this;
    var modalInst = this._modal || window.CC_modal_instance;
    if (!modalInst || typeof modalInst.show !== 'function') {
      if (confirm('确定删除「' + name + '」吗？')) {
        if (self._app && self._app.deletePage) { self._app.deletePage(id); self.refresh(); }
      }
      return;
    }

    var html = '<div class="cc-comp-form" style="padding:8px 0;">' +
      '<p style="font-size:13px;color:#333;">确定删除 <b>' + _escHtml(name) + '</b> 吗？此操作不可撤销。</p></div>';

    modalInst.show('删除确认', html, [
      { text: '取消', cls: '', fn: function (d) { var o = d.closest('.cc-overlay'); if (o) o.remove(); } },
      {
        text: '删除', cls: 'danger', fn: function (d) {
          if (self._app && self._app.deletePage) { self._app.deletePage(id); self.refresh(); }
          var o = d.closest('.cc-overlay'); if (o) o.remove();
        }
      }
    ]);
  };

  // ── Import trigger ─────────────────────────────────────

  PagesTab.prototype._triggerImport = function (folder) {
    if (folder && this._folderInput) this._folderInput.click();
    else if (!folder && this._fileInput) this._fileInput.click();
  };

  // ── Bus Events ─────────────────────────────────────────

  PagesTab.prototype._bindBusEvents = function () {
    var self = this;
    var bus = window.__CC && window.__CC.bus;
    if (!bus || this._busBound) return;
    this._busBound = true;
    bus.on('page:switched', function () { self.refresh(); });
    bus.on('page:added', function () { self.refresh(); });
    bus.on('page:deleted', function () { self.refresh(); });
    bus.on('page:imported', function () { self.refresh(); });
    bus.on('page:toggled', function () { self.refresh(); });
    bus.on('page:moved', function () { self.refresh(); });
  };

  // ── Refresh ────────────────────────────────────────────

  PagesTab.prototype.refresh = function () {
    if (this._container) {
      this._draw();
    }
  };

  // ── Utility ────────────────────────────────────────────

  function _escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  global.CCPagesTab = PagesTab;
})(window);
