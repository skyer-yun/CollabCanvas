/**
 * CollabCanvas — Properties Tab
 * 元素属性编辑面板，9 个可折叠分组
 */
;(function () {
  'use strict';

  var domUtils = window.CCDomUtils;

  // ── Helper: create a labeled property row ──────────────────
  function propRow(label, inputEl) {
    var row = document.createElement('div');
    row.className = 'cc-prop-row';
    var lbl = document.createElement('span');
    lbl.className = 'cc-prop-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(inputEl);
    return row;
  }

  // ── Helper: create a color-picker row ──────────────────────
  function propColorRow(label, value, onChange) {
    var input = document.createElement('input');
    input.type = 'color';
    input.className = 'cc-prop-color';
    input.value = domUtils.rgbToHex(value);

    var textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'cc-prop-text';
    textInput.value = domUtils.rgbToHex(value);

    function sync(hex) {
      if (input.value !== hex) input.value = hex;
      if (textInput.value !== hex) textInput.value = hex;
      onChange(hex);
    }

    input.addEventListener('input', function () { sync(input.value); });
    textInput.addEventListener('change', function () {
      var v = textInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) sync(v);
    });

    var wrap = document.createElement('span');
    wrap.className = 'cc-prop-color-wrap';
    wrap.appendChild(input);
    wrap.appendChild(textInput);

    return propRow(label, wrap);
  }

  // ── Helper: create a select row ────────────────────────────
  function propSelectRow(label, options, current, onChange) {
    var sel = document.createElement('select');
    sel.className = 'cc-prop-select';
    options.forEach(function (opt) {
      var o = document.createElement('option');
      if (typeof opt === 'string') {
        o.value = opt;
        o.textContent = opt;
      } else {
        o.value = opt.value;
        o.textContent = opt.label || opt.value;
      }
      if (o.value === current) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { onChange(sel.value); });
    return propRow(label, sel);
  }

  // ── Collapsible group builder ──────────────────────────────
  function groupSection(title, contentEl, collapsed) {
    var section = document.createElement('div');
    section.className = 'cc-prop-section';

    var header = document.createElement('div');
    header.className = 'cc-prop-group-header';
    header.innerHTML = '<span class="cc-prop-arrow">' + (collapsed ? '\u25B6' : '\u25BC') +
      '</span> ' + domUtils.esc(title);

    var body = document.createElement('div');
    body.className = 'cc-prop-group-body';
    if (collapsed) body.style.display = 'none';
    body.appendChild(contentEl);

    header.addEventListener('click', function () {
      var hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      header.querySelector('.cc-prop-arrow').textContent = hidden ? '\u25BC' : '\u25B6';
    });

    section.appendChild(header);
    section.appendChild(body);
    return section;
  }

  // ── Main class ─────────────────────────────────────────────

  function PropertiesTab(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this.currentEl = null;

    var self = this;
    bus.on('selection:changed', function (data) {
      if (data.action === 'select') {
        self.refresh(data.element);
      } else {
        self.refresh(null);
      }
    });
  }

  PropertiesTab.prototype.render = function (container, element) {
    this.container = container;
    this.currentEl = element || null;
    container.innerHTML = '';
    container.className = 'cc-properties-tab';

    if (!this.currentEl) {
      container.innerHTML = '<div class="cc-tab-empty">选中元素以查看属性</div>';
      return;
    }

    this._buildGroups();
  };

  PropertiesTab.prototype.refresh = function (el) {
    if (!this.container) return;
    this.currentEl = el !== undefined ? el : this.currentEl;
    this.render(this.container, this.currentEl);
  };

  // ── Build all groups ───────────────────────────────────────

  PropertiesTab.prototype._buildGroups = function () {
    var el = this.currentEl;
    var container = this.container;
    var state = this.state;
    var bus = this.bus;
    var cs = getComputedStyle(el);
    var self = this;

    // Helper to emit a change
    function emitChange(prop, oldVal, newVal) {
      bus.emit('property:change', {
        element: el,
        prop: prop,
        oldVal: oldVal,
        newVal: newVal
      });
    }

    // 1. Element Info
    var infoBody = document.createElement('div');
    var tagName = el.getAttribute('data-type') || el.tagName.toLowerCase();
    var elId = el.id || '';
    var path = domUtils.buildPath(el);

    var tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.className = 'cc-prop-text';
    tagInput.value = tagName;
    tagInput.readOnly = true;
    infoBody.appendChild(propRow('标签', tagInput));

    var idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'cc-prop-text';
    idInput.value = elId;
    idInput.addEventListener('change', function () {
      var old = el.id;
      el.id = idInput.value;
      emitChange('id', old, idInput.value);
    });
    infoBody.appendChild(propRow('ID', idInput));

    var pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.className = 'cc-prop-text';
    pathInput.value = path;
    pathInput.readOnly = true;
    infoBody.appendChild(propRow('路径', pathInput));

    container.appendChild(groupSection('元素信息', infoBody, false));

    // 2. Typography
    var typoBody = document.createElement('div');

    typoBody.appendChild(propSelectRow('字体', [
      'inherit', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
      'Courier New', 'Verdana', 'sans-serif', 'serif', 'monospace'
    ], cs.fontFamily, function (v) {
      var old = el.style.fontFamily;
      el.style.fontFamily = v;
      emitChange('fontFamily', old, v);
    }));

    typoBody.appendChild(propSelectRow('字号', [
      '12px','13px','14px','16px','18px','20px','24px','28px','32px','36px','48px','64px'
    ], cs.fontSize, function (v) {
      var old = el.style.fontSize;
      el.style.fontSize = v;
      emitChange('fontSize', old, v);
    }));

    typoBody.appendChild(propSelectRow('字重', [
      { value: 'normal', label: '常规' },
      { value: 'bold', label: '粗体' },
      { value: '100', label: '100' },
      { value: '200', label: '200' },
      { value: '300', label: '300' },
      { value: '400', label: '400' },
      { value: '500', label: '500' },
      { value: '600', label: '600' },
      { value: '700', label: '700' },
      { value: '800', label: '800' },
      { value: '900', label: '900' }
    ], cs.fontWeight, function (v) {
      var old = el.style.fontWeight;
      el.style.fontWeight = v;
      emitChange('fontWeight', old, v);
    }));

    typoBody.appendChild(propSelectRow('对齐', [
      'left', 'center', 'right', 'justify'
    ], cs.textAlign, function (v) {
      var old = el.style.textAlign;
      el.style.textAlign = v;
      emitChange('textAlign', old, v);
    }));

    typoBody.appendChild(propSelectRow('行高', [
      '1', '1.2', '1.4', '1.5', '1.6', '1.8', '2'
    ], cs.lineHeight, function (v) {
      var old = el.style.lineHeight;
      el.style.lineHeight = v;
      emitChange('lineHeight', old, v);
    }));

    typoBody.appendChild(propColorRow('颜色', cs.color, function (hex) {
      var old = el.style.color;
      el.style.color = hex;
      emitChange('color', old, hex);
    }));

    container.appendChild(groupSection('排版', typoBody, true));

    // 3. Spacing
    var spacingBody = document.createElement('div');
    ['margin-top', 'margin-right', 'margin-bottom', 'margin-left',
     'padding-top', 'padding-right', 'padding-bottom', 'padding-left'].forEach(function (prop) {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'cc-prop-text';
      input.value = cs.getPropertyValue(prop);
      input.addEventListener('change', function () {
        var old = el.style[prop];
        el.style[prop] = input.value;
        emitChange(prop, old, input.value);
      });
      spacingBody.appendChild(propRow(prop.replace(/-(.)/g, function (m, c) { return c.toUpperCase(); }), input));
    });
    container.appendChild(groupSection('间距', spacingBody, true));

    // 4. Appearance
    var appearBody = document.createElement('div');

    appearBody.appendChild(propColorRow('背景色', cs.backgroundColor, function (hex) {
      var old = el.style.backgroundColor;
      el.style.backgroundColor = hex;
      emitChange('backgroundColor', old, hex);
    }));

    appearBody.appendChild(propSelectRow('透明度', [
      '1', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1', '0'
    ], cs.opacity, function (v) {
      var old = el.style.opacity;
      el.style.opacity = v;
      emitChange('opacity', old, v);
    }));

    appearBody.appendChild(propSelectRow('溢出', [
      'visible', 'hidden', 'auto', 'scroll'
    ], cs.overflow, function (v) {
      var old = el.style.overflow;
      el.style.overflow = v;
      emitChange('overflow', old, v);
    }));

    appearBody.appendChild(propSelectRow('光标', [
      'auto', 'default', 'pointer', 'move', 'text', 'not-allowed', 'grab', 'crosshair'
    ], cs.cursor, function (v) {
      var old = el.style.cursor;
      el.style.cursor = v;
      emitChange('cursor', old, v);
    }));

    container.appendChild(groupSection('外观', appearBody, true));

    // 5. Layout
    var layoutBody = document.createElement('div');

    layoutBody.appendChild(propSelectRow('显示', [
      'block', 'inline', 'inline-block', 'flex', 'grid', 'none'
    ], cs.display, function (v) {
      var old = el.style.display;
      el.style.display = v;
      emitChange('display', old, v);
    }));

    layoutBody.appendChild(propSelectRow('定位', [
      'static', 'relative', 'absolute', 'fixed', 'sticky'
    ], cs.position, function (v) {
      var old = el.style.position;
      el.style.position = v;
      emitChange('position', old, v);
    }));

    layoutBody.appendChild(propSelectRow('Flex 方向', [
      'row', 'column', 'row-reverse', 'column-reverse'
    ], cs.flexDirection, function (v) {
      var old = el.style.flexDirection;
      el.style.flexDirection = v;
      emitChange('flexDirection', old, v);
    }));

    layoutBody.appendChild(propSelectRow('主轴对齐', [
      'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'
    ], cs.justifyContent, function (v) {
      var old = el.style.justifyContent;
      el.style.justifyContent = v;
      emitChange('justifyContent', old, v);
    }));

    layoutBody.appendChild(propSelectRow('交叉轴对齐', [
      'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
    ], cs.alignItems, function (v) {
      var old = el.style.alignItems;
      el.style.alignItems = v;
      emitChange('alignItems', old, v);
    }));

    layoutBody.appendChild(propSelectRow('换行', [
      'nowrap', 'wrap', 'wrap-reverse'
    ], cs.flexWrap, function (v) {
      var old = el.style.flexWrap;
      el.style.flexWrap = v;
      emitChange('flexWrap', old, v);
    }));

    container.appendChild(groupSection('布局', layoutBody, true));

    // 6. Position
    var posBody = document.createElement('div');
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'cc-prop-text';
      input.value = cs.getPropertyValue(side);
      input.addEventListener('change', function () {
        var old = el.style[side];
        el.style[side] = input.value;
        emitChange(side, old, input.value);
      });
      posBody.appendChild(propRow(side.charAt(0).toUpperCase() + side.slice(1), input));
    });

    var wInput = document.createElement('input');
    wInput.type = 'text';
    wInput.className = 'cc-prop-text';
    wInput.value = cs.width;
    wInput.addEventListener('change', function () {
      var old = el.style.width;
      el.style.width = wInput.value;
      emitChange('width', old, wInput.value);
    });
    posBody.appendChild(propRow('宽', wInput));

    var hInput = document.createElement('input');
    hInput.type = 'text';
    hInput.className = 'cc-prop-text';
    hInput.value = cs.height;
    hInput.addEventListener('change', function () {
      var old = el.style.height;
      el.style.height = hInput.value;
      emitChange('height', old, hInput.value);
    });
    posBody.appendChild(propRow('高', hInput));

    container.appendChild(groupSection('位置尺寸', posBody, true));

    // 7. Transform
    var transformBody = document.createElement('div');

    var rotateInput = document.createElement('input');
    rotateInput.type = 'text';
    rotateInput.className = 'cc-prop-text';
    var transformVal = cs.transform;
    var rotateDeg = '0';
    var rm = transformVal.match(/rotate\(([^)]+)\)/);
    if (rm) rotateDeg = rm[1];
    rotateInput.value = rotateDeg;
    rotateInput.addEventListener('change', function () {
      var old = el.style.transform;
      var current = el.style.transform || '';
      current = current.replace(/rotate\([^)]*\)/, '').trim();
      el.style.transform = (current + ' rotate(' + rotateInput.value + ')').trim();
      emitChange('transform', old, el.style.transform);
    });
    transformBody.appendChild(propRow('Rotate', rotateInput));

    var scaleInput = document.createElement('input');
    scaleInput.type = 'text';
    scaleInput.className = 'cc-prop-text';
    var scaleVal = '1';
    var sm = transformVal.match(/scale\(([^)]+)\)/);
    if (sm) scaleVal = sm[1];
    scaleInput.value = scaleVal;
    scaleInput.addEventListener('change', function () {
      var old = el.style.transform;
      var current = el.style.transform || '';
      current = current.replace(/scale\([^)]*\)/, '').trim();
      el.style.transform = (current + ' scale(' + scaleInput.value + ')').trim();
      emitChange('transform', old, el.style.transform);
    });
    transformBody.appendChild(propRow('Scale', scaleInput));

    container.appendChild(groupSection('变换', transformBody, true));

    // 8. Border
    var borderBody = document.createElement('div');

    borderBody.appendChild(propColorRow('边框色', cs.borderColor, function (hex) {
      var old = el.style.borderColor;
      el.style.borderColor = hex;
      emitChange('borderColor', old, hex);
    }));

    borderBody.appendChild(propSelectRow('边框样式', [
      'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'
    ], cs.borderStyle, function (v) {
      var old = el.style.borderStyle;
      el.style.borderStyle = v;
      emitChange('borderStyle', old, v);
    }));

    var bwInput = document.createElement('input');
    bwInput.type = 'text';
    bwInput.className = 'cc-prop-text';
    bwInput.value = cs.borderWidth;
    bwInput.addEventListener('change', function () {
      var old = el.style.borderWidth;
      el.style.borderWidth = bwInput.value;
      emitChange('borderWidth', old, bwInput.value);
    });
    borderBody.appendChild(propRow('边框宽度', bwInput));

    var brInput = document.createElement('input');
    brInput.type = 'text';
    brInput.className = 'cc-prop-text';
    brInput.value = cs.borderRadius;
    brInput.addEventListener('change', function () {
      var old = el.style.borderRadius;
      el.style.borderRadius = brInput.value;
      emitChange('borderRadius', old, brInput.value);
    });
    borderBody.appendChild(propRow('圆角', brInput));

    container.appendChild(groupSection('边框', borderBody, true));

    // 9. Background
    var bgBody = document.createElement('div');

    bgBody.appendChild(propColorRow('颜色', cs.backgroundColor, function (hex) {
      var old = el.style.backgroundColor;
      el.style.backgroundColor = hex;
      emitChange('backgroundColor', old, hex);
    }));

    var bgImg = document.createElement('input');
    bgImg.type = 'text';
    bgImg.className = 'cc-prop-text';
    bgImg.value = cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
    bgImg.placeholder = 'url(...)';
    bgImg.addEventListener('change', function () {
      var old = el.style.backgroundImage;
      el.style.backgroundImage = bgImg.value || 'none';
      emitChange('backgroundImage', old, el.style.backgroundImage);
    });
    bgBody.appendChild(propRow('背景图', bgImg));

    bgBody.appendChild(propSelectRow('尺寸', [
      'auto', 'cover', 'contain'
    ], cs.backgroundSize, function (v) {
      var old = el.style.backgroundSize;
      el.style.backgroundSize = v;
      emitChange('backgroundSize', old, v);
    }));

    bgBody.appendChild(propSelectRow('位置', [
      'center', 'top', 'bottom', 'left', 'right', 'top left', 'top right',
      'bottom left', 'bottom right'
    ], cs.backgroundPosition, function (v) {
      var old = el.style.backgroundPosition;
      el.style.backgroundPosition = v;
      emitChange('backgroundPosition', old, v);
    }));

    bgBody.appendChild(propSelectRow('重复', [
      'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'
    ], cs.backgroundRepeat, function (v) {
      var old = el.style.backgroundRepeat;
      el.style.backgroundRepeat = v;
      emitChange('backgroundRepeat', old, v);
    }));

    container.appendChild(groupSection('背景', bgBody, true));
  };

  window.CCPropertiesTab = PropertiesTab;
})();
