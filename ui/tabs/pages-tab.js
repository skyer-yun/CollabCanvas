/**
 * CollabCanvas - Pages Tab Module
 * Page tree UI with module grouping and page management
 * IIFE exporting to window.CCPagesTab
 */
(function (global) {
  'use strict';

  /**
   * @param {object} app - CollabCanvas app reference
   *   app.pages: Array of { id, name, module, html, thumbnail }
   *   app.currentPage: Current page id
   *   app.switchPage(id): Switch to page
   *   app.addPage(name, module?): Add new page
   *   app.renamePage(id, name): Rename page
   *   app.deletePage(id): Delete page
   *   app.importPages(files): Import from files
   */
  function PagesTab(app) {
    this._app = app;
    this._container = null;
  }

  /**
   * Render the pages tab into a container element.
   * @param {HTMLElement} container
   */
  PagesTab.prototype.render = function (container) {
    this._container = container;
    container.innerHTML = '';
    container.className = 'cc-pages-tab';

    // Header with actions
    var header = this._createHeader();
    container.appendChild(header);

    // Page tree
    var tree = this._createTree();
    container.appendChild(tree);

    return this;
  };

  /** Create header bar with Add Page and Import buttons. */
  PagesTab.prototype._createHeader = function () {
    var self = this;
    var header = document.createElement('div');
    header.className = 'cc-pages-header';

    var addBtn = document.createElement('button');
    addBtn.className = 'cc-btn cc-btn-primary';
    addBtn.textContent = '+ Add Page';
    addBtn.onclick = function () { self._promptAddPage(); };
    header.appendChild(addBtn);

    var importBtn = document.createElement('button');
    importBtn.className = 'cc-btn cc-btn-secondary';
    importBtn.textContent = 'Import';
    importBtn.onclick = function () { self._triggerImport(); };
    header.appendChild(importBtn);

    // Hidden file input for import
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.html,.htm,.zip';
    fileInput.style.display = 'none';
    fileInput.onchange = function (e) {
      if (self._app && self._app.importPages) {
        self._app.importPages(e.target.files);
      }
    };
    header.appendChild(fileInput);
    this._fileInput = fileInput;

    return header;
  };

  /** Build the page tree grouped by module. */
  PagesTab.prototype._createTree = function () {
    var tree = document.createElement('div');
    tree.className = 'cc-page-tree';

    var pages = (this._app && this._app.pages) || [];
    var grouped = this._groupByModule(pages);

    var moduleNames = Object.keys(grouped);
    for (var i = 0; i < moduleNames.length; i++) {
      var moduleName = moduleNames[i];
      var group = grouped[moduleName];

      if (moduleName) {
        var groupEl = document.createElement('div');
        groupEl.className = 'cc-page-group';
        var groupLabel = document.createElement('div');
        groupLabel.className = 'cc-page-group-label';
        groupLabel.textContent = moduleName;
        groupEl.appendChild(groupLabel);

        for (var j = 0; j < group.length; j++) {
          groupEl.appendChild(this._createPageItem(group[j]));
        }
        tree.appendChild(groupEl);
      } else {
        for (var k = 0; k < group.length; k++) {
          tree.appendChild(this._createPageItem(group[k]));
        }
      }
    }

    if (pages.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'cc-page-empty';
      empty.textContent = 'No pages yet. Click "Add Page" to start.';
      tree.appendChild(empty);
    }

    return tree;
  };

  /** Create a single page item element. */
  PagesTab.prototype._createPageItem = function (page) {
    var self = this;
    var item = document.createElement('div');
    item.className = 'cc-page-item';
    if (this._app && this._app.currentPage === page.id) {
      item.classList.add('cc-active');
    }

    // Thumbnail
    var thumb = document.createElement('div');
    thumb.className = 'cc-page-thumb';
    if (page.thumbnail) {
      thumb.style.backgroundImage = 'url(' + page.thumbnail + ')';
    }
    item.appendChild(thumb);

    // Name
    var nameEl = document.createElement('span');
    nameEl.className = 'cc-page-name';
    nameEl.textContent = page.name;
    item.appendChild(nameEl);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'cc-page-actions';

    var renameBtn = document.createElement('button');
    renameBtn.className = 'cc-btn-icon';
    renameBtn.title = 'Rename';
    renameBtn.textContent = 'R';
    renameBtn.onclick = function (e) {
      e.stopPropagation();
      self._promptRename(page.id, page.name);
    };
    actions.appendChild(renameBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'cc-btn-icon';
    deleteBtn.title = 'Delete';
    deleteBtn.textContent = 'D';
    deleteBtn.onclick = function (e) {
      e.stopPropagation();
      self._confirmDelete(page.id, page.name);
    };
    actions.appendChild(deleteBtn);

    item.appendChild(actions);

    // Click to switch page
    item.onclick = function () {
      if (self._app && self._app.switchPage) {
        self._app.switchPage(page.id);
        self.refresh();
      }
    };

    return item;
  };

  /** Group pages by module name. */
  PagesTab.prototype._groupByModule = function (pages) {
    var groups = {};
    for (var i = 0; i < pages.length; i++) {
      var mod = pages[i].module || '';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(pages[i]);
    }
    return groups;
  };

  /** Prompt user to add a new page. */
  PagesTab.prototype._promptAddPage = function () {
    var self = this;
    var modal = window.CCModal;
    if (!modal) return;

    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>页面名称</label>' +
      '<input class="cc-comp-input" id="cc-page-name-input" placeholder="输入页面名称" autofocus></div>' +
      '<div class="cc-comp-row"><label>所属模块</label>' +
      '<input class="cc-comp-input" id="cc-page-module-input" placeholder="可选，如：登录模块"></div>' +
      '</div>';

    modal.show('添加页面', html, [
      { text: '取消', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '确定', cls: 'primary', fn: function (d) {
          var nameInput = d.querySelector('#cc-page-name-input');
          var moduleInput = d.querySelector('#cc-page-module-input');
          var name = (nameInput && nameInput.value.trim()) || '';
          if (!name) return;
          var mod = (moduleInput && moduleInput.value.trim()) || '';
          if (self._app && self._app.addPage) {
            self._app.addPage(name, mod);
            self.refresh();
          }
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);

    setTimeout(function () {
      var inp = document.querySelector('#cc-page-name-input');
      if (inp) inp.focus();
    }, 100);
  };

  /** Prompt rename. */
  PagesTab.prototype._promptRename = function (id, currentName) {
    var self = this;
    var modal = window.CCModal;
    if (!modal) return;

    var html = '<div class="cc-comp-form">' +
      '<div class="cc-comp-row"><label>页面名称</label>' +
      '<input class="cc-comp-input" id="cc-page-rename-input" value="' + _escHtml(currentName) + '"></div>' +
      '</div>';

    modal.show('重命名页面', html, [
      { text: '取消', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '确定', cls: 'primary', fn: function (d) {
          var inp = d.querySelector('#cc-page-rename-input');
          var name = (inp && inp.value.trim()) || '';
          if (!name) return;
          if (self._app && self._app.renamePage) {
            self._app.renamePage(id, name);
            self.refresh();
          }
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);

    setTimeout(function () {
      var inp = document.querySelector('#cc-page-rename-input');
      if (inp) { inp.focus(); inp.select(); }
    }, 100);
  };

  /** Confirm deletion. */
  PagesTab.prototype._confirmDelete = function (id, name) {
    var self = this;
    var modal = window.CCModal;
    if (!modal) return;

    var html = '<div class="cc-comp-form" style="padding:8px 0;">' +
      '<p style="font-size:13px;color:#333;">确定删除页面 <b>' + _escHtml(name) + '</b> 吗？此操作不可撤销。</p>' +
      '</div>';

    modal.show('删除页面', html, [
      { text: '取消', cls: '', fn: function (d) { if (d && d.parentElement) d.parentElement.remove(); } },
      {
        text: '删除', cls: 'danger', fn: function (d) {
          if (self._app && self._app.deletePage) {
            self._app.deletePage(id);
            self.refresh();
          }
          if (d && d.parentElement) d.parentElement.remove();
        }
      }
    ]);
  };

  /** Trigger file import dialog. */
  PagesTab.prototype._triggerImport = function () {
    if (this._fileInput) this._fileInput.click();
  };

  /** Refresh the page tree. */
  PagesTab.prototype.refresh = function () {
    if (this._container) {
      this.render(this._container);
    }
  };

  function _escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  global.CCPagesTab = PagesTab;
})(window);
