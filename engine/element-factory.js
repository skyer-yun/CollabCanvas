;(function () {
  'use strict';

  // ===== Component Registry (single source of truth) =====
  window.CCComponentRegistry = {
    TYPES: {
      text:      { label: '文字',   icon: 'T',   w: 200, h: 32,  group: '基础' },
      heading:   { label: '标题',   icon: 'H',   w: 300, h: 40,  group: '基础' },
      paragraph: { label: '段落',   icon: 'P',   w: 300, h: 80,  group: '基础' },
      link:      { label: '链接',   icon: '🔗',  w: 120, h: 28,  group: '基础' },
      list:      { label: '列表',   icon: '☰',   w: 200, h: 120, group: '基础' },
      rect:      { label: '矩形',   icon: '□',   w: 150, h: 100, group: '形状' },
      circle:    { label: '圆形',   icon: '○',   w: 100, h: 100, group: '形状' },
      divider:   { label: '分割线', icon: '—',   w: 300, h: 4,   group: '形状' },
      image:     { label: '图片',   icon: '🖼',  w: 240, h: 160, group: '媒体' },
      icon:      { label: '图标',   icon: '★',   w: 40,  h: 40,  group: '媒体' },
      video:     { label: '视频',   icon: '▶',   w: 320, h: 180, group: '媒体' },
      button:    { label: '按钮',   icon: '⬜',  w: 120, h: 36,  group: '表单' },
      input:     { label: '输入框', icon: '▭',   w: 200, h: 32,  group: '表单' },
      select:    { label: '下拉',   icon: '▾',   w: 200, h: 32,  group: '表单' },
      radio:     { label: '单选',   icon: '◉',   w: 160, h: 28,  group: '表单' },
      checkbox:  { label: '复选',   icon: '☑',   w: 160, h: 28,  group: '表单' },
      card:      { label: '卡片',   icon: '▬',   w: 280, h: 200, group: '容器' },
      container: { label: '容器',   icon: '⊞',   w: 300, h: 200, group: '容器' },
      table:     { label: '表格',   icon: '⊞',   w: 400, h: 200, group: '高级' },
      tree:      { label: '树形',   icon: '⚐',   w: 240, h: 200, group: '高级' },
      hotspot:   { label: '热区',   icon: '◎',   w: 80,  h: 80,  group: '高级' },
      sticky:    { label: '便签',   icon: '📝',  w: 180, h: 160, group: '高级' },
      number:    { label: '编号',   icon: '#',   w: 36,  h: 36,  group: '高级' }
    },
    GROUPS: ['基础', '形状', '媒体', '表单', '容器', '高级'],
    getTypeNames: function () {
      return Object.keys(this.TYPES);
    },
    getTypeDef: function (name) {
      return this.TYPES[name] || null;
    },
    isValidType: function (name) {
      return !!this.TYPES[name];
    },
    getTypesByGroup: function (group) {
      var self = this;
      return Object.keys(self.TYPES).filter(function (k) { return self.TYPES[k].group === group; });
    }
  };

  function _base(tagName, type, x, y, w, h) {
    var el = document.createElement(tagName || 'div');
    el.className = 'cc-el';
    el.setAttribute('data-type', type);
    el.id = 'cc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    el.style.cssText =
      'position:absolute;left:' + x + 'px;top:' + y + 'px;' +
      'width:' + w + 'px;height:' + h + 'px;box-sizing:border-box;';
    return el;
  }

  // Wrap a native form element in a cc-el div for resize-handle compatibility
  function _wrapNative(innerEl, type, x, y, w, h) {
    var wrapper = _base('div', type, x, y, w, h);
    innerEl.style.cssText = 'width:100%;height:100%;box-sizing:border-box;';
    wrapper.appendChild(innerEl);
    return wrapper;
  }

  var CREATORS = {
    text: function (x, y) {
      var el = _base('div', 'text', x, y, 200, 32);
      el.innerText = '编辑文字';
      el.style.fontSize = '14px';
      return el;
    },
    heading: function (x, y) {
      var el = _base('div', 'heading', x, y, 300, 40);
      el.innerText = '标题';
      el.style.fontSize = '24px';
      el.style.fontWeight = 'bold';
      return el;
    },
    paragraph: function (x, y) {
      var el = _base('div', 'paragraph', x, y, 300, 80);
      el.innerText = '这是一段示例文本，用于展示段落效果。双击可编辑内容。';
      el.style.fontSize = '14px';
      el.style.lineHeight = '1.5';
      return el;
    },
    link: function (x, y) {
      var el = _base('div', 'link', x, y, 120, 28);
      el.innerHTML = '<a href="#" style="color:#1890ff;text-decoration:underline;">链接文字</a>';
      return el;
    },
    list: function (x, y) {
      var el = _base('div', 'list', x, y, 200, 120);
      el.innerHTML = '<ul style="margin:0;padding-left:20px;font-size:14px;">' +
        '<li>项目 1</li><li>项目 2</li><li>项目 3</li></ul>';
      return el;
    },
    rect: function (x, y) {
      var el = _base('div', 'rect', x, y, 150, 100);
      el.style.background = '#e6f7ff';
      el.style.border = '2px solid #1890ff';
      el.style.borderRadius = '4px';
      return el;
    },
    circle: function (x, y) {
      var el = _base('div', 'circle', x, y, 100, 100);
      el.style.background = '#fff1f0';
      el.style.border = '2px solid #f5222d';
      el.style.borderRadius = '50%';
      return el;
    },
    divider: function (x, y) {
      var el = _base('div', 'divider', x, y, 300, 4);
      el.style.background = '#d9d9d9';
      return el;
    },
    image: function (x, y) {
      var el = _base('div', 'image', x, y, 240, 160);
      el.style.background = '#f0f0f0';
      el.style.border = '1px dashed #bfbfbf';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = '<span style="color:#999;font-size:12px;">拖入图片</span>';
      return el;
    },
    icon: function (x, y) {
      var el = _base('div', 'icon', x, y, 40, 40);
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '24px';
      el.innerHTML = '★';
      return el;
    },
    video: function (x, y) {
      var el = _base('div', 'video', x, y, 320, 180);
      el.style.background = '#000';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = '<span style="color:#fff;font-size:32px;">▶</span>';
      return el;
    },
    button: function (x, y) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerText = '按钮';
      btn.style.cssText = 'width:100%;height:100%;border:none;border-radius:4px;' +
        'background:#1890ff;color:#fff;font-size:14px;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;font-family:inherit;';
      var wrapper = _wrapNative(btn, 'button', x, y, 120, 36);
      return wrapper;
    },
    input: function (x, y) {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = '请输入...';
      inp.style.cssText = 'width:100%;height:100%;border:1px solid #d9d9d9;border-radius:4px;' +
        'background:#fff;padding:0 8px;font-size:14px;box-sizing:border-box;font-family:inherit;';
      var wrapper = _wrapNative(inp, 'input', x, y, 200, 32);
      return wrapper;
    },
    select: function (x, y) {
      var sel = document.createElement('select');
      sel.innerHTML = '<option value="">请选择</option><option value="1">选项 1</option><option value="2">选项 2</option>';
      sel.style.cssText = 'width:100%;height:100%;border:1px solid #d9d9d9;border-radius:4px;' +
        'background:#fff;padding:0 8px;font-size:14px;box-sizing:border-box;font-family:inherit;';
      var wrapper = _wrapNative(sel, 'select', x, y, 200, 32);
      return wrapper;
    },
    radio: function (x, y) {
      var container = document.createElement('div');
      container.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;width:100%;height:100%;';
      var label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
      var inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = 'cc-radio-' + Date.now();
      inp.style.accentColor = '#1890ff';
      var span = document.createElement('span');
      span.innerText = '选项';
      label.appendChild(inp);
      label.appendChild(span);
      container.appendChild(label);
      var wrapper = _wrapNative(container, 'radio', x, y, 160, 28);
      return wrapper;
    },
    checkbox: function (x, y) {
      var container = document.createElement('div');
      container.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;width:100%;height:100%;';
      var label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
      var inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.style.accentColor = '#1890ff';
      var span = document.createElement('span');
      span.innerText = '选项';
      label.appendChild(inp);
      label.appendChild(span);
      container.appendChild(label);
      var wrapper = _wrapNative(container, 'checkbox', x, y, 160, 28);
      return wrapper;
    },
    card: function (x, y) {
      var el = _base('div', 'card', x, y, 280, 200);
      el.style.background = '#fff';
      el.style.border = '1px solid #e8e8e8';
      el.style.borderRadius = '6px';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)';
      el.style.padding = '16px';
      el.innerHTML = '<div style="font-weight:bold;margin-bottom:8px;">卡片标题</div>' +
        '<div style="font-size:13px;color:#666;">卡片内容区域，双击可编辑。</div>';
      return el;
    },
    container: function (x, y) {
      var el = _base('div', 'container', x, y, 300, 200);
      el.style.border = '1px dashed #999';
      el.style.background = 'rgba(0,0,0,.02)';
      return el;
    },
    table: function (x, y) {
      var wrapper = _base('div', 'table', x, y, 400, 200);
      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      var thead = document.createElement('thead');
      var hr = document.createElement('tr');
      ['列 A', '列 B'].forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'border:1px solid #e8e8e8;padding:6px 8px;background:#fafafa;text-align:left;';
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = document.createElement('tbody');
      [['单元格 1', '单元格 2'], ['单元格 3', '单元格 4']].forEach(function (row) {
        var tr = document.createElement('tr');
        row.forEach(function (cell) {
          var td = document.createElement('td');
          td.textContent = cell;
          td.style.cssText = 'border:1px solid #e8e8e8;padding:6px 8px;';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrapper.appendChild(table);
      return wrapper;
    },
    tree: function (x, y) {
      var el = _base('div', 'tree', x, y, 240, 200);
      el.innerHTML =
        '<div style="font-size:13px;line-height:2;">' +
        '├─ 节点 1<br>├─ 节点 2<br>│&nbsp;&nbsp;├─ 子节点 2.1<br>│&nbsp;&nbsp;└─ 子节点 2.2<br>└─ 节点 3</div>';
      return el;
    },
    hotspot: function (x, y) {
      var el = _base('div', 'hotspot', x, y, 80, 80);
      el.style.background = 'rgba(24,144,255,.15)';
      el.style.border = '1px dashed #1890ff';
      el.style.borderRadius = '4px';
      return el;
    },
    sticky: function (x, y) {
      var el = _base('div', 'sticky', x, y, 180, 160);
      el.style.background = '#fffbe6';
      el.style.border = '1px solid #ffe58f';
      el.style.borderRadius = '4px';
      el.style.padding = '12px';
      el.style.fontSize = '14px';
      el.style.boxShadow = '2px 2px 6px rgba(0,0,0,.1)';
      el.style.overflow = 'hidden';
      el.style.transition = 'width .2s, height .2s, padding .2s';
      el.setAttribute('data-cc-expanded', 'true');

      // Auto-increment number for sticky
      var canvas = document.querySelector('.cc-canvas');
      var existing = canvas ? canvas.querySelectorAll('[data-type="sticky"]').length : 0;
      var num = existing + 1;
      el.setAttribute('data-cc-sticky-num', String(num));

      // Number badge (visible in minimized mode)
      var badge = document.createElement('div');
      badge.className = 'cc-sticky-badge';
      badge.textContent = String(num);
      badge.style.cssText = 'display:none;color:#fff;font-size:14px;font-weight:700;' +
        'line-height:1;pointer-events:none;';

      // Content area
      var content = document.createElement('div');
      content.className = 'cc-sticky-content';
      content.innerText = '便签内容';

      // Toggle button (minimize/expand)
      var toggle = document.createElement('div');
      toggle.className = 'cc-sticky-toggle';
      toggle.title = '最小化';
      toggle.innerHTML = '&#x2212;';
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        var expanded = el.getAttribute('data-cc-expanded') === 'true';
        if (expanded) {
          el.setAttribute('data-cc-expanded', 'false');
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.padding = '0';
          el.style.borderRadius = '50%';
          el.style.background = '#d48806';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          content.style.display = 'none';
          toggle.style.display = 'none';
          badge.style.display = 'block';
        } else {
          el.setAttribute('data-cc-expanded', 'true');
          el.style.width = '180px';
          el.style.height = '160px';
          el.style.padding = '12px';
          el.style.borderRadius = '4px';
          el.style.background = '#fffbe6';
          el.style.display = '';
          el.style.alignItems = '';
          el.style.justifyContent = '';
          content.style.display = '';
          toggle.style.display = '';
          badge.style.display = 'none';
        }
      });

      el.appendChild(badge);
      el.appendChild(content);
      el.appendChild(toggle);
      return el;
    },
    number: function (x, y) {
      var el = _base('div', 'number', x, y, 36, 36);
      el.style.background = '#1677ff';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#fff';
      el.style.fontSize = '14px';
      el.style.fontWeight = '700';
      // Auto-increment based on existing number elements
      var canvas = document.querySelector('.cc-canvas');
      var existing = canvas ? canvas.querySelectorAll('[data-type="number"]').length : 0;
      var num = existing + 1;
      el.innerText = String(num);
      el.setAttribute('data-cc-number', String(num));
      return el;
    }
  };

  class ElementFactory {
    constructor(state, eventBus, domUtils, changeTracker) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
      this._placingType = null;

      // Build INSERT_ITEMS from Registry for backward compat
      this.INSERT_ITEMS = CCComponentRegistry.getTypeNames().map(function (name) {
        var def = CCComponentRegistry.TYPES[name];
        return { type: name, label: def.label, icon: def.icon, w: def.w, h: def.h };
      });
    }

    /**
     * Create an element of the given type at the specified coordinates.
     */
    createElementAt(type, x, y) {
      var creator = CREATORS[type];
      if (!creator) return null;

      var el = creator(x, y);
      var canvas = this.state.canvas;
      canvas.appendChild(el);

      this.changeTracker.record('insert', {
        element: el,
        html: el.outerHTML
      }, null, { elementId: el.id });

      this.eventBus.emit('element:created', { element: el, type: type });
      return el;
    }

    /**
     * Begin placement mode: next click on the canvas places this element type.
     */
    startPlacing(type) {
      this._placingType = type;
      this.state.mode = 'placing';
      this.state.canvas.style.cursor = 'crosshair';

      this.eventBus.emit('placing:start', { type: type });
    }

    /**
     * Cancel placement mode.
     */
    cancelPlacing() {
      this._placingType = null;
      this.state.mode = 'select';
      this.state.canvas.style.cursor = 'default';

      this.eventBus.emit('placing:cancel');
    }

    /**
     * Get the current placing type (or null).
     */
    getPlacingType() {
      return this._placingType;
    }

    /**
     * Open a media insert dialog for image or video.
     * Emits 'media:dialog:open' so the UI layer can show the dialog.
     */
    openMediaDialog(type) {
      this.eventBus.emit('media:dialog:open', { type: type });
    }

    /**
     * Handle media insertion after user provides source.
     * @param {string} type - 'image' or 'video'
     * @param {string} source - URL or data URI
     * @param {object} [options] - Additional options (alt text, autoplay, etc.)
     */
    handleMediaInsert(type, source, options) {
      options = options || {};
      var el = this.state.selected;
      if (!el || el.getAttribute('data-type') !== type) return;

      if (type === 'image') {
        el.innerHTML = '';
        var img = document.createElement('img');
        img.src = source;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;pointer-events:none;';
        if (options.alt) img.alt = options.alt;
        el.appendChild(img);
        el.style.borderStyle = 'none';
      } else if (type === 'video') {
        el.innerHTML = '';
        var video = document.createElement('video');
        video.src = source;
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        if (options.autoplay) video.autoplay = true;
        if (options.controls !== false) video.controls = true;
        el.appendChild(video);
      }

      this.changeTracker.record('css', {
        element: el,
        html: el.outerHTML
      }, {
        element: el,
        html: '' // previous state tracked elsewhere if needed
      }, { elementId: el.id, mediaType: type });

      this.eventBus.emit('media:inserted', { element: el, type: type, source: source });
    }
  }

  window.CCElementFactory = ElementFactory;
})();
