/**
 * CollabCanvas — Components Tab
 * 组件面板，按分类分组展示可插入元素，支持搜索筛选
 */
;(function () {
  'use strict';

  var domUtils = window.CCDomUtils;

  // Build INSERT_ITEMS from Registry (single source of truth)
  var reg = window.CCComponentRegistry;
  var INSERT_ITEMS = reg ? reg.getTypeNames().map(function (name) {
    var def = reg.TYPES[name];
    return { type: name, label: def.label, icon: def.icon, group: def.group };
  }) : [];

  var GROUP_ORDER = reg ? reg.GROUPS : ['基础','形状','媒体','表单','容器','高级'];

  function ComponentsTab(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this.collapsed = {};
    this.filterText = '';
  }

  ComponentsTab.prototype.render = function (container) {
    this.container = container;
    container.innerHTML = '';
    container.className = 'cc-components-tab';
    this._build();
  };

  ComponentsTab.prototype.refresh = function () {
    if (!this.container) return;
    this._build();
  };

  // ── Internal ─────────────────────────────────────────────

  ComponentsTab.prototype._build = function () {
    var container = this.container;
    container.innerHTML = '';

    // Search input
    var search = document.createElement('input');
    search.type = 'text';
    search.className = 'cc-comp-search';
    search.placeholder = '搜索组件...';
    search.value = this.filterText;

    var self = this;
    search.addEventListener('input', function () {
      self.filterText = this.value.trim().toLowerCase();
      self._renderGrid();
    });

    container.appendChild(search);

    // Grid container
    var grid = document.createElement('div');
    grid.className = 'cc-comp-groups';
    grid.id = 'cc-comp-groups';
    container.appendChild(grid);

    this._renderGrid();
  };

  ComponentsTab.prototype._renderGrid = function () {
    var gridEl = this.container.querySelector('#cc-comp-groups');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    var self = this;
    var filter = this.filterText;
    var filtered = INSERT_ITEMS.filter(function (item) {
      if (!filter) return true;
      return item.label.toLowerCase().indexOf(filter) !== -1 ||
             item.type.toLowerCase().indexOf(filter) !== -1;
    });

    // Group filtered items
    var groups = {};
    filtered.forEach(function (item) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });

    // Render each group
    GROUP_ORDER.forEach(function (groupName) {
      var items = groups[groupName];
      if (!items || items.length === 0) return;

      var section = document.createElement('div');
      section.className = 'cc-comp-section';

      // Section header (collapsible)
      var header = document.createElement('div');
      header.className = 'cc-comp-header';
      var isCollapsed = !!self.collapsed[groupName];
      header.innerHTML = '<span class="cc-comp-arrow">' + (isCollapsed ? '\u25B6' : '\u25BC') +
        '</span> ' + domUtils.esc(groupName) + ' (' + items.length + ')';
      header.addEventListener('click', function () {
        self.collapsed[groupName] = !self.collapsed[groupName];
        self._renderGrid();
      });

      section.appendChild(header);

      if (!isCollapsed) {
        var grid = document.createElement('div');
        grid.className = 'cc-comp-grid';

        items.forEach(function (comp) {
          var card = document.createElement('div');
          card.className = 'cc-comp-item';
          card.title = comp.label + ' (' + comp.type + ')';
          card.innerHTML = '<span class="cc-comp-icon">' + comp.icon + '</span>' +
            '<span class="cc-comp-label">' + domUtils.esc(comp.label) + '</span>';

          card.addEventListener('click', function () {
            self.bus.emit('placement:start', { type: comp.type });
          });

          grid.appendChild(card);
        });

        section.appendChild(grid);
      }

      gridEl.appendChild(section);
    });

    if (Object.keys(groups).length === 0) {
      gridEl.innerHTML = '<div class="cc-tab-empty">没有匹配的组件</div>';
    }
  };

  window.CCComponentsTab = ComponentsTab;
})();
