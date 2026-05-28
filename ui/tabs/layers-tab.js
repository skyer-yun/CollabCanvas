/**
 * CollabCanvas — Layers Tab
 * Canvas 元素图层列表，支持选中/可见性/锁定/拖拽排序/语义标签
 */
;(function () {
  'use strict';

  var domUtils = window.CCDomUtils;

  // Semantic tag label map
  var TAG_LABELS = {
    'div': '区块', 'h1': '标题1', 'h2': '标题2', 'h3': '标题3', 'h4': '标题4',
    'h5': '标题5', 'h6': '标题6', 'p': '段落', 'img': '图片', 'a': '链接',
    'button': '按钮', 'table': '表格', 'ul': '列表', 'ol': '列表', 'li': '列表项',
    'span': '文本', 'section': '区块', 'header': '头部', 'footer': '底部',
    'nav': '导航', 'form': '表单', 'input': '输入框', 'textarea': '文本域',
    'select': '下拉框', 'video': '视频', 'iframe': '内嵌', 'svg': '图形',
    'canvas': '画布', 'blockquote': '引用', 'pre': '代码', 'code': '代码',
    'em': '斜体', 'strong': '粗体', 'label': '标签',
    '区块': '区块', '标题': '标题', '段落': '段落', '图片': '图片',
    '链接': '链接', '按钮': '按钮', '表格': '表格', '列表': '列表',
    '文本': '文本', '头部': '头部', '底部': '底部', '导航': '导航',
    '表单': '表单', '输入框': '输入框', '文本域': '文本域', '下拉框': '下拉框',
    '视频': '视频', '内嵌': '内嵌', 'group': '分组', 'hotspot': '热区',
    'image': '图片', 'text': '文本', 'container': '容器'
  };

  // Icon map for common tags
  var TAG_ICONS = {
    'div': '\u25A1', 'h1': 'H', 'h2': 'H', 'h3': 'H', 'p': '\u00B6',
    'img': '\u{1F5BC}', 'a': '\u{1F517}', 'button': '\u25A7', 'table': '\u229E',
    'ul': '\u2630', 'span': 'T', 'section': '\u25A1', 'group': '\u{1F4E6}',
    'hotspot': '\u{1F4CD}', 'image': '\u{1F5BC}', '区块': '\u25A1',
    '标题': 'H', '段落': '\u00B6', '图片': '\u{1F5BC}', '链接': '\u{1F517}',
    '按钮': '\u25A7', '表格': '\u229E', '列表': '\u2630', '文本': 'T',
    '分组': '\u{1F4E6}', '热区': '\u{1F4CD}'
  };

  function LayersTab(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this._dragSrcIndex = null;

    var self = this;
    this._onSelectionChanged = function () { self.refresh(); };
    this._onHistoryRecorded = function () { self.refresh(); };
    this._onLayerReorder = function () { self.refresh(); };

    bus.on('selection:changed', this._onSelectionChanged);
    bus.on('history:recorded', this._onHistoryRecorded);
    bus.on('layer:reorder', this._onLayerReorder);
  }

  LayersTab.prototype.render = function (container) {
    this.container = container;
    container.innerHTML = '';
    container.className = 'cc-layers-tab';

    this._build();
  };

  LayersTab.prototype.refresh = function () {
    if (!this.container) return;
    this._build();
  };

  // ── Internal ─────────────────────────────────────────────

  LayersTab.prototype._build = function () {
    var container = this.container;
    container.innerHTML = '';

    var canvas = this.state.canvas;
    if (!canvas) {
      container.innerHTML = '<div class="cc-tab-empty">画布未加载</div>';
      return;
    }

    var children = canvas.children;
    if (!children || children.length === 0) {
      container.innerHTML = '<div class="cc-tab-empty">画布为空</div>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'cc-layer-list';

    var selected = this.state.selected;

    // Traverse in reverse so top-layer elements appear first
    for (var i = children.length - 1; i >= 0; i--) {
      var el = children[i];
      var item = this._createItem(el, i, selected, children.length);
      list.appendChild(item);
    }

    container.appendChild(list);
  };

  LayersTab.prototype._createItem = function (el, index, selected, total) {
    var self = this;
    var isSelected = (el === selected);

    var item = document.createElement('div');
    item.className = 'cc-layer-item' + (isSelected ? ' cc-layer-active' : '');
    item.dataset.index = index;
    item.draggable = true;

    var tagRaw = el.getAttribute('data-type') || el.tagName.toLowerCase();
    var tagLabel = TAG_LABELS[tagRaw] || tagRaw;
    var tagIcon = TAG_ICONS[tagRaw] || '\u25CC';
    var cls = this._getClassInfo(el);

    // Drag handle (reorder)
    var drag = document.createElement('span');
    drag.className = 'cc-layer-drag';
    drag.textContent = '\u2630';
    drag.title = '拖拽排序';

    // Visibility toggle
    var eye = document.createElement('span');
    eye.className = 'cc-layer-eye' + (el.style.display === 'none' ? ' cc-layer-hidden' : '');
    eye.textContent = el.style.display === 'none' ? '\u25CB' : '\u25C9';
    eye.title = '切换可见性';
    eye.addEventListener('click', function (e) {
      e.stopPropagation();
      var hidden = el.style.display === 'none';
      el.style.display = hidden ? '' : 'none';
      self.bus.emit('layer:visibility', { element: el, visible: hidden });
      self.refresh();
    });

    // Lock toggle
    var lock = document.createElement('span');
    var isLocked = el.getAttribute('data-locked') === 'true';
    lock.className = 'cc-layer-lock' + (isLocked ? ' cc-layer-locked' : '');
    lock.textContent = isLocked ? '\u{1F512}' : '\u{1F513}';
    lock.title = '切换锁定';
    lock.addEventListener('click', function (e) {
      e.stopPropagation();
      var current = el.getAttribute('data-locked') === 'true';
      el.setAttribute('data-locked', current ? 'false' : 'true');
      self.bus.emit('layer:lock', { element: el, locked: !current });
      self.refresh();
    });

    // Tag icon
    var icon = document.createElement('span');
    icon.className = 'cc-layer-icon';
    icon.textContent = tagIcon;

    // Tag name (semantic label)
    var tag = document.createElement('span');
    tag.className = 'cc-layer-tag';
    tag.textContent = tagLabel;

    // Class info
    var info = document.createElement('span');
    info.className = 'cc-layer-info';
    info.textContent = cls ? ' .' + cls : '';

    // Z-index badge
    var zIdx = document.createElement('span');
    zIdx.className = 'cc-layer-zindex';
    var zi = el.style.zIndex;
    zIdx.textContent = zi ? 'z:' + zi : '';

    item.appendChild(drag);
    item.appendChild(eye);
    item.appendChild(lock);
    item.appendChild(icon);
    item.appendChild(tag);
    item.appendChild(info);
    item.appendChild(zIdx);

    // Click to select + scroll into view
    item.addEventListener('click', function () {
      self.bus.emit('selection:select', { element: el });
      // Scroll element into view
      if (el.scrollIntoViewIfNeeded) {
        el.scrollIntoViewIfNeeded(true);
      } else if (el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Highlight flash
      el.classList.add('cc-el-select');
      setTimeout(function() {
        if (el !== self.state.selected) el.classList.remove('cc-el-select');
      }, 800);
    });

    // Drag-and-drop for z-order
    item.addEventListener('dragstart', function (e) {
      self._dragSrcIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('cc-layer-dragging');
    });
    item.addEventListener('dragend', function () {
      item.classList.remove('cc-layer-dragging');
      self._dragSrcIndex = null;
    });
    item.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('cc-layer-drag-over');
    });
    item.addEventListener('dragleave', function () {
      item.classList.remove('cc-layer-drag-over');
    });
    item.addEventListener('drop', function (e) {
      e.preventDefault();
      item.classList.remove('cc-layer-drag-over');
      if (self._dragSrcIndex === null || self._dragSrcIndex === index) return;
      self._reorderElement(self._dragSrcIndex, index);
      self._dragSrcIndex = null;
    });

    return item;
  };

  /**
   * Reorder element by moving it from srcIndex to targetIndex.
   * Higher index = higher z-index (appended later in DOM).
   */
  LayersTab.prototype._reorderElement = function (srcIndex, targetIndex) {
    var canvas = this.state.canvas;
    if (!canvas) return;

    var children = canvas.children;
    var srcEl = children[srcIndex];
    if (!srcEl) return;

    var targetEl = children[targetIndex];
    if (!targetEl) return;

    // Move element in DOM
    if (srcIndex < targetIndex) {
      // Moving down: insert after target
      if (targetEl.nextSibling) {
        canvas.insertBefore(srcEl, targetEl.nextSibling);
      } else {
        canvas.appendChild(srcEl);
      }
    } else {
      // Moving up: insert before target
      canvas.insertBefore(srcEl, targetEl);
    }

    this.bus.emit('layer:reorder', { element: srcEl, from: srcIndex, to: targetIndex });
    this.refresh();
  };

  LayersTab.prototype._getClassInfo = function (el) {
    var classes = Array.from(el.classList).filter(function (c) {
      return !/^cc-/.test(c) && c.length > 1;
    });
    return classes.slice(0, 2).join('.');
  };

  LayersTab.prototype.destroy = function () {
    if (!this.bus) return;
    this.bus.off('selection:changed', this._onSelectionChanged);
    this.bus.off('history:recorded', this._onHistoryRecorded);
    this.bus.off('layer:reorder', this._onLayerReorder);
  };

  window.CCLayersTab = LayersTab;
})();
