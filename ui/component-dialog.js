/**
 * CollabCanvas — Component Dialog
 * 双击组件元素弹出属性编辑对话框
 * 支持全部 22 种组件类型
 */
;(function () {
  'use strict';

  /**
   * @param {object} state
   * @param {object} bus
   * @param {object} modal - CCModal instance
   */
  function ComponentDialog(state, bus, modal) {
    this._state = state;
    this._bus = bus;
    this._modal = modal;
  }

  /**
   * Detect component type from element.
   */
  ComponentDialog.prototype.getComponentType = function (el) {
    if (!el) return null;
    var tag = el.tagName.toLowerCase();
    var dtype = el.getAttribute('data-type');

    // data-type is the primary identifier
    if (dtype) {
      if (window.CCComponentRegistry && CCComponentRegistry.isValidType(dtype)) return dtype;
      // Fallback for legacy types not in registry
      if (['text','heading','paragraph','link','list','rect','circle',
        'divider','image','icon','video','button','input','select','radio',
        'checkbox','card','container','table','tree','hotspot','sticky','number'].indexOf(dtype) !== -1) return dtype;
    }

    // Fallback to tag
    if (tag === 'a') return 'link';
    if (tag === 'img') return 'image';
    if (tag === 'table') return 'table';
    if (tag === 'button') return 'button';
    if (tag === 'input') return 'input';
    if (tag === 'select') return 'select';
    if (tag === 'video') return 'video';

    return null;
  };

  /**
   * Open dialog. Returns true if shown.
   */
  ComponentDialog.prototype.open = function (el) {
    var type = this.getComponentType(el);
    if (!type) return false;

    var titles = {
      text:'文字属性', heading:'标题属性', paragraph:'段落属性',
      link:'链接属性', list:'列表属性', rect:'矩形属性',
      circle:'圆形属性', divider:'分割线属性', image:'图片属性',
      icon:'图标属性', video:'视频属性', button:'按钮属性',
      input:'输入框属性', select:'下拉框属性', radio:'单选框属性',
      checkbox:'复选框属性', card:'卡片属性', container:'容器属性',
      table:'表格属性', tree:'树形属性', hotspot:'热区属性', sticky:'便签属性'
    };

    var fields = this._buildFields(type, el);
    if (!fields || fields.length === 0) return false;

    var title = titles[type] || '组件属性';
    this._showDialog(title, fields, el, type);
    return true;
  };

  // ── Field builders per type ──────────────────────────────

  ComponentDialog.prototype._buildFields = function (type, el) {
    switch (type) {
      // Text group
      case 'text':      return this._textFields(el);
      case 'heading':   return this._headingFields(el);
      case 'paragraph': return this._paragraphFields(el);
      // Link group
      case 'link':      return this._linkFields(el);
      case 'hotspot':   return this._hotspotFields(el);
      // Button
      case 'button':    return this._buttonFields(el);
      // Media
      case 'image':     return this._imageFields(el);
      case 'video':     return this._videoFields(el);
      case 'icon':      return this._iconFields(el);
      // Form
      case 'input':     return this._inputFields(el);
      case 'select':    return this._selectFields(el);
      case 'radio':     return this._radioFields(el);
      case 'checkbox':  return this._checkboxFields(el);
      // Shape
      case 'rect':      return this._shapeFields(el);
      case 'circle':    return this._shapeFields(el);
      case 'divider':   return this._dividerFields(el);
      // Container
      case 'card':      return this._cardFields(el);
      case 'container': return this._containerFields(el);
      case 'sticky':    return this._stickyFields(el);
      // Data
      case 'table':     return this._tableFields(el);
      case 'list':      return this._listFields(el);
      case 'tree':      return this._treeFields(el);
      default: return [];
    }
  };

  // ── Text group ────────────────────────────────────────────

  ComponentDialog.prototype._textFields = function (el) {
    return [
      { field: 'text', label: '文字内容', type: 'textarea', value: el.textContent || '' },
      { field: 'fontSize', label: '字号', type: 'text', value: el.style.fontSize || '14px' },
      { field: 'color', label: '文字颜色', type: 'color', value: _parseColor(el.style.color) || '#1f1f1f' }
    ];
  };

  ComponentDialog.prototype._headingFields = function (el) {
    return [
      { field: 'text', label: '标题内容', type: 'textarea', value: el.textContent || '' },
      { field: 'fontSize', label: '字号', type: 'text', value: el.style.fontSize || '24px' },
      { field: 'fontWeight', label: '字重', type: 'select', value: el.style.fontWeight || 'bold',
        options: ['normal','bold','100','200','300','400','500','600','700','800','900'] },
      { field: 'color', label: '文字颜色', type: 'color', value: _parseColor(el.style.color) || '#1f1f1f' }
    ];
  };

  ComponentDialog.prototype._paragraphFields = function (el) {
    return [
      { field: 'text', label: '段落内容', type: 'textarea', value: el.textContent || '' },
      { field: 'fontSize', label: '字号', type: 'text', value: el.style.fontSize || '14px' },
      { field: 'lineHeight', label: '行高', type: 'text', value: el.style.lineHeight || '1.5' },
      { field: 'color', label: '文字颜色', type: 'color', value: _parseColor(el.style.color) || '#1f1f1f' }
    ];
  };

  // ── Link group ────────────────────────────────────────────

  ComponentDialog.prototype._linkFields = function (el) {
    return [
      { field: 'text', label: '链接文字', type: 'text', value: el.textContent || '' },
      { field: 'href', label: '链接 URL', type: 'text', value: el.getAttribute('href') || '', placeholder: 'https://...' },
      { field: 'target', label: '打开方式', type: 'select', value: el.getAttribute('target') || '_self',
        options: ['_self','_blank'], optionLabels: ['当前窗口','新窗口'] },
      { field: 'color', label: '文字颜色', type: 'color', value: _parseColor(el.style.color) || '#1890ff' }
    ];
  };

  ComponentDialog.prototype._hotspotFields = function (el) {
    return [
      { field: 'href', label: '链接 URL', type: 'text', value: el.getAttribute('data-href') || '', placeholder: 'https://...', attr: 'data-href' },
      { field: 'target', label: '打开方式', type: 'select', value: el.getAttribute('data-target') || '_blank',
        options: ['_blank','_self'], optionLabels: ['新窗口','当前窗口'], attr: 'data-target' },
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#1677ff' },
      { field: 'opacity', label: '透明度', type: 'text', value: el.style.opacity || '0.15' }
    ];
  };

  // ── Button ────────────────────────────────────────────────

  ComponentDialog.prototype._buttonFields = function (el) {
    return [
      { field: 'text', label: '按钮文字', type: 'text', value: el.textContent || '' },
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#1890ff' },
      { field: 'color', label: '文字颜色', type: 'color', value: _parseColor(el.style.color) || '#ffffff' },
      { field: 'borderRadius', label: '圆角', type: 'text', value: el.style.borderRadius || '4px' },
      { field: 'fontSize', label: '字号', type: 'text', value: el.style.fontSize || '14px' }
    ];
  };

  // ── Media ─────────────────────────────────────────────────

  ComponentDialog.prototype._imageFields = function (el) {
    return [
      { field: 'src', label: '图片 URL', type: 'text', value: el.getAttribute('src') || '', placeholder: 'https://...' },
      { field: '_upload', label: '本地上传', type: 'file', accept: 'image/*' },
      { field: 'alt', label: 'Alt 文字', type: 'text', value: el.getAttribute('alt') || '' },
      { field: 'objectFit', label: '填充方式', type: 'select', value: el.style.objectFit || 'cover',
        options: ['cover','contain','fill','none','scale-down'] },
      { field: 'width', label: '宽度', type: 'text', value: el.style.width || '' },
      { field: 'height', label: '高度', type: 'text', value: el.style.height || '' }
    ];
  };

  ComponentDialog.prototype._videoFields = function (el) {
    var src = el.getAttribute('src') || (el.querySelector('source') ? el.querySelector('source').getAttribute('src') : '');
    return [
      { field: 'src', label: '视频 URL', type: 'text', value: src, placeholder: 'https://...' },
      { field: 'controls', label: '显示控制栏', type: 'checkbox', value: el.hasAttribute('controls') },
      { field: 'autoplay', label: '自动播放', type: 'checkbox', value: el.hasAttribute('autoplay') },
      { field: 'loop', label: '循环播放', type: 'checkbox', value: el.hasAttribute('loop') },
      { field: 'width', label: '宽度', type: 'text', value: el.style.width || '320px' },
      { field: 'height', label: '高度', type: 'text', value: el.style.height || '180px' }
    ];
  };

  ComponentDialog.prototype._iconFields = function (el) {
    return [
      { field: 'text', label: '图标字符', type: 'text', value: el.textContent.trim() || '★' },
      { field: 'fontSize', label: '大小', type: 'text', value: el.style.fontSize || '24px' },
      { field: 'color', label: '颜色', type: 'color', value: _parseColor(el.style.color) || '#1f1f1f' }
    ];
  };

  // ── Form ──────────────────────────────────────────────────

  ComponentDialog.prototype._inputFields = function (el) {
    return [
      { field: 'placeholder', label: '占位文字', type: 'text', value: el.getAttribute('placeholder') || '' },
      { field: 'value', label: '默认值', type: 'text', value: el.getAttribute('value') || el.value || '' },
      { field: '_inputType', label: '类型', type: 'select', value: el.getAttribute('type') || 'text',
        options: ['text','number','email','password','tel','url','date','search'] },
      { field: 'name', label: '名称(name)', type: 'text', value: el.getAttribute('name') || '' }
    ];
  };

  ComponentDialog.prototype._selectFields = function (el) {
    var opts = [];
    var optEls = el.querySelectorAll('option');
    for (var i = 0; i < optEls.length; i++) {
      opts.push(optEls[i].textContent.trim());
    }
    return [
      { field: '_options', label: '选项列表', type: 'textarea', value: opts.join('\n'), hint: '每行一个选项' },
      { field: 'name', label: '名称(name)', type: 'text', value: el.getAttribute('name') || '' }
    ];
  };

  ComponentDialog.prototype._radioFields = function (el) {
    return [
      { field: 'text', label: '选项文字', type: 'text', value: el.textContent.trim() },
      { field: 'name', label: '名称(name)', type: 'text', value: el.getAttribute('data-name') || '' },
      { field: 'value', label: '值(value)', type: 'text', value: el.getAttribute('data-value') || '' }
    ];
  };

  ComponentDialog.prototype._checkboxFields = function (el) {
    return [
      { field: 'text', label: '选项文字', type: 'text', value: el.textContent.trim() },
      { field: 'name', label: '名称(name)', type: 'text', value: el.getAttribute('data-name') || '' },
      { field: 'value', label: '值(value)', type: 'text', value: el.getAttribute('data-value') || '' }
    ];
  };

  // ── Shape ─────────────────────────────────────────────────

  ComponentDialog.prototype._shapeFields = function (el) {
    return [
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#e6f7ff' },
      { field: 'borderColor', label: '边框色', type: 'color', value: _parseBorderColor(el.style.border) || '#1890ff' },
      { field: 'borderWidth', label: '边框宽度', type: 'text', value: _parseBorderWidth(el.style.border) || '2px' },
      { field: 'borderRadius', label: '圆角', type: 'text', value: el.style.borderRadius || '4px' },
      { field: 'width', label: '宽度', type: 'text', value: el.style.width || '' },
      { field: 'height', label: '高度', type: 'text', value: el.style.height || '' }
    ];
  };

  ComponentDialog.prototype._dividerFields = function (el) {
    return [
      { field: 'backgroundColor', label: '颜色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#d9d9d9' },
      { field: 'height', label: '高度', type: 'text', value: el.style.height || '4px' }
    ];
  };

  // ── Container ─────────────────────────────────────────────

  ComponentDialog.prototype._cardFields = function (el) {
    var titleEl = el.querySelector('[data-card-title]') || el.querySelector('h3,h4,h5,b,strong');
    var bodyEl = el.querySelector('[data-card-body]') || el.querySelector('p,div');
    return [
      { field: '_cardTitle', label: '卡片标题', type: 'text', value: titleEl ? titleEl.textContent : '' },
      { field: '_cardBody', label: '卡片内容', type: 'textarea', value: bodyEl ? bodyEl.textContent : '' },
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#ffffff' },
      { field: 'borderRadius', label: '圆角', type: 'text', value: el.style.borderRadius || '6px' }
    ];
  };

  ComponentDialog.prototype._containerFields = function (el) {
    return [
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#fafafa' },
      { field: 'borderColor', label: '边框色', type: 'color', value: _parseBorderColor(el.style.border) || '#d9d9d9' },
      { field: 'borderWidth', label: '边框宽度', type: 'text', value: _parseBorderWidth(el.style.border) || '1px' },
      { field: 'borderRadius', label: '圆角', type: 'text', value: el.style.borderRadius || '0px' },
      { field: 'width', label: '宽度', type: 'text', value: el.style.width || '' },
      { field: 'height', label: '高度', type: 'text', value: el.style.height || '' }
    ];
  };

  ComponentDialog.prototype._stickyFields = function (el) {
    return [
      { field: 'text', label: '便签内容', type: 'textarea', value: el.textContent || '' },
      { field: 'backgroundColor', label: '背景色', type: 'color', value: _parseColor(el.style.backgroundColor) || '#fffbe6' }
    ];
  };

  // ── Data ──────────────────────────────────────────────────

  ComponentDialog.prototype._tableFields = function (el) {
    // Build editable cell grid
    var rows = el.querySelectorAll('tr');
    var cellData = '';
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td,th');
      var rowData = [];
      for (var c = 0; c < cells.length; c++) {
        rowData.push(cells[c].textContent.trim());
      }
      cellData += rowData.join('\t') + '\n';
    }
    return [
      { field: '_tableRows', label: '行数', type: 'text', value: String(rows.length || 2) },
      { field: '_tableCols', label: '列数', type: 'text', value: String((rows[0] ? rows[0].children.length : 0) || 2) },
      { field: '_tableContent', label: '表格内容', type: 'textarea', value: cellData.trim(),
        hint: 'Tab 分隔列，换行分隔行' }
    ];
  };

  ComponentDialog.prototype._listFields = function (el) {
    var items = el.querySelectorAll('li');
    var text = [];
    for (var i = 0; i < items.length; i++) {
      text.push(items[i].textContent.trim());
    }
    return [
      { field: '_listItems', label: '列表项', type: 'textarea', value: text.join('\n'), hint: '每行一个列表项' },
      { field: 'fontSize', label: '字号', type: 'text', value: el.style.fontSize || '14px' }
    ];
  };

  ComponentDialog.prototype._treeFields = function (el) {
    return [
      { field: 'text', label: '树形内容', type: 'textarea', value: el.textContent || '',
        hint: '直接编辑树形文本' }
    ];
  };

  // ── Show dialog ───────────────────────────────────────────

  ComponentDialog.prototype._showDialog = function (title, fields, el, type) {
    var self = this;
    var html = '<div class="cc-comp-form">';

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      html += '<div class="cc-comp-row"><label>' + f.label + '</label>';

      if (f.type === 'textarea') {
        html += '<textarea class="cc-comp-input cc-comp-textarea" data-field="' + f.field +
          '" rows="' + (f.field === 'text' || f.field === '_listItems' || f.field === '_tableContent' || f.field === '_cardBody' ? 4 : 3) +
          '">' + _esc(f.value) + '</textarea>';
      } else if (f.type === 'select') {
        html += '<select class="cc-comp-input" data-field="' + f.field + '">';
        for (var j = 0; j < f.options.length; j++) {
          var label = (f.optionLabels && f.optionLabels[j]) || f.options[j];
          html += '<option value="' + _esc(f.options[j]) + '"' + (f.value === f.options[j] ? ' selected' : '') + '>' + _esc(label) + '</option>';
        }
        html += '</select>';
      } else if (f.type === 'color') {
        html += '<div class="cc-comp-color-row">' +
          '<input class="cc-comp-input cc-comp-color" data-field="' + f.field + '" value="' + _esc(f.value || '#000000') + '" type="color">' +
          '<input class="cc-comp-input cc-comp-color-text" data-field="' + f.field + '-text" value="' + _esc(f.value) + '" type="text">' +
          '</div>';
      } else if (f.type === 'checkbox') {
        html += '<input class="cc-comp-checkbox" data-field="' + f.field + '" type="checkbox"' + (f.value ? ' checked' : '') + '>';
      } else if (f.type === 'file') {
        html += '<input class="cc-comp-file" data-field="' + f.field + '" type="file" accept="' + (f.accept || '*') + '">';
      } else {
        html += '<input class="cc-comp-input" data-field="' + f.field + '" value="' + _esc(f.value || '') + '"' +
          (f.placeholder ? ' placeholder="' + _esc(f.placeholder) + '"' : '') + '>';
      }

      html += '</div>';
      if (f.hint) {
        html += '<div class="cc-comp-hint">' + f.hint + '</div>';
      }
    }

    html += '</div>';

    this._modal.show(title, html, [
      { text: '取消', cls: '', fn: function (d) { _removeDialog(d); } },
      { text: '确定', cls: 'primary', fn: function (d) {
        self._applyChanges(el, d, type);
        _removeDialog(d);
        self._bus.emit('property:change', { element: el });
      }}
    ]);

    // Sync color picker ↔ text input
    setTimeout(function () {
      var dialog = document.querySelector('.cc-modal-overlay:last-child');
      if (!dialog) return;
      var colorInputs = dialog.querySelectorAll('.cc-comp-color');
      for (var k = 0; k < colorInputs.length; k++) {
        (function (ci) {
          var textInp = ci.parentElement.querySelector('.cc-comp-color-text');
          if (!textInp) return;
          ci.addEventListener('input', function () { textInp.value = ci.value; });
          textInp.addEventListener('input', function () {
            if (/^#[0-9a-fA-F]{6}$/.test(textInp.value)) ci.value = textInp.value;
          });
        })(colorInputs[k]);
      }
    }, 50);
  };

  // ── Apply changes ─────────────────────────────────────────

  ComponentDialog.prototype._applyChanges = function (el, overlay, type) {
    if (!overlay) return;

    // Handle file upload first (image)
    if (type === 'image') {
      var fileInput = overlay.querySelector('[data-field="_upload"]');
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          el.setAttribute('src', ev.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    }

    // Collect all field values
    var values = {};
    var inputs = overlay.querySelectorAll('[data-field]');
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var field = inp.getAttribute('data-field');
      // Skip color text mirrors and file inputs
      if (field.endsWith('-text') || field === '_upload') continue;
      if (inp.type === 'color') {
        values[field] = inp.value;
      } else if (inp.type === 'checkbox') {
        values[field] = inp.checked;
      } else {
        values[field] = inp.value;
      }
    }

    // Apply based on type
    this._applyByType(el, values, type);
  };

  ComponentDialog.prototype._applyByType = function (el, v, type) {
    switch (type) {
      case 'text':
      case 'heading':
      case 'paragraph':
      case 'icon':
        if (v.text !== undefined) el.textContent = v.text;
        _applyStyles(el, v, ['fontSize','color','fontWeight','lineHeight']);
        break;

      case 'link':
        if (v.text !== undefined) el.textContent = v.text;
        if (v.href !== undefined) el.setAttribute('href', v.href);
        if (v.target !== undefined) el.setAttribute('target', v.target);
        _applyStyles(el, v, ['color']);
        break;

      case 'hotspot':
        if (v.href !== undefined) el.setAttribute('data-href', v.href);
        if (v.target !== undefined) el.setAttribute('data-target', v.target);
        _applyStyles(el, v, ['backgroundColor','opacity']);
        break;

      case 'button':
        if (v.text !== undefined) el.textContent = v.text;
        _applyStyles(el, v, ['backgroundColor','color','borderRadius','fontSize']);
        break;

      case 'image':
        if (v.src !== undefined && v.src !== '') el.setAttribute('src', v.src);
        if (v.alt !== undefined) el.setAttribute('alt', v.alt);
        _applyStyles(el, v, ['objectFit','width','height']);
        break;

      case 'video':
        if (v.src !== undefined && v.src !== '') {
          var source = el.querySelector('source');
          if (source) { source.setAttribute('src', v.src); }
          else { el.setAttribute('src', v.src); }
        }
        _toggleAttr(el, 'controls', v.controls);
        _toggleAttr(el, 'autoplay', v.autoplay);
        _toggleAttr(el, 'loop', v.loop);
        _applyStyles(el, v, ['width','height']);
        break;

      case 'input':
        if (v.placeholder !== undefined) el.setAttribute('placeholder', v.placeholder);
        if (v.value !== undefined) el.setAttribute('value', v.value);
        if (v._inputType !== undefined) el.setAttribute('type', v._inputType);
        if (v.name !== undefined) el.setAttribute('name', v.name);
        break;

      case 'select':
        if (v._options !== undefined) {
          var lines = v._options.split('\n').filter(function (l) { return l.trim() !== ''; });
          var html = '';
          for (var i = 0; i < lines.length; i++) {
            html += '<option>' + _esc(lines[i].trim()) + '</option>';
          }
          el.innerHTML = html;
        }
        if (v.name !== undefined) el.setAttribute('name', v.name);
        break;

      case 'radio':
      case 'checkbox':
        if (v.text !== undefined) el.textContent = v.text;
        if (v.name !== undefined) el.setAttribute('data-name', v.name);
        if (v.value !== undefined) el.setAttribute('data-value', v.value);
        break;

      case 'rect':
      case 'circle':
        _applyStyles(el, v, ['backgroundColor','borderRadius','width','height']);
        if (v.borderColor !== undefined) {
          var bw = v.borderWidth || _parseBorderWidth(el.style.border) || '2px';
          el.style.border = bw + ' solid ' + v.borderColor;
        }
        break;

      case 'divider':
        _applyStyles(el, v, ['backgroundColor','height']);
        break;

      case 'card':
        if (v._cardTitle !== undefined) {
          var titleEl = el.querySelector('[data-card-title]') || el.querySelector('h3,h4,h5,b,strong');
          if (titleEl) titleEl.textContent = v._cardTitle;
        }
        if (v._cardBody !== undefined) {
          var bodyEl = el.querySelector('[data-card-body]') || el.querySelector('p,div');
          if (bodyEl) bodyEl.textContent = v._cardBody;
        }
        _applyStyles(el, v, ['backgroundColor','borderRadius']);
        break;

      case 'container':
        _applyStyles(el, v, ['backgroundColor','borderRadius','width','height']);
        if (v.borderColor !== undefined) {
          var cbw = v.borderWidth || '1px';
          el.style.border = cbw + ' solid ' + v.borderColor;
        }
        break;

      case 'sticky':
        if (v.text !== undefined) el.textContent = v.text;
        _applyStyles(el, v, ['backgroundColor']);
        break;

      case 'table':
        this._applyTableChanges(el, v);
        break;

      case 'list':
        if (v._listItems !== undefined) {
          var items = v._listItems.split('\n').filter(function (l) { return l.trim() !== ''; });
          var lh = '';
          for (var li = 0; li < items.length; li++) {
            lh += '<li>' + _esc(items[li].trim()) + '</li>';
          }
          el.innerHTML = lh;
        }
        _applyStyles(el, v, ['fontSize']);
        break;

      case 'tree':
        if (v.text !== undefined) el.textContent = v.text;
        break;
    }
  };

  ComponentDialog.prototype._applyTableChanges = function (el, v) {
    var rows = Math.max(1, Math.min(20, parseInt(v._tableRows) || 2));
    var cols = Math.max(1, Math.min(10, parseInt(v._tableCols) || 2));
    var contentStr = v._tableContent || '';

    // Parse content: tab-separated columns, newline-separated rows
    var contentLines = contentStr.split('\n');

    // Also preserve from existing table if content is empty
    var oldCells = [];
    var oldRows = el.querySelectorAll('tr');
    for (var r = 0; r < oldRows.length; r++) {
      oldCells[r] = [];
      var cells = oldRows[r].querySelectorAll('td,th');
      for (var c = 0; c < cells.length; c++) {
        oldCells[r][c] = cells[c].textContent;
      }
    }

    var html = '';
    for (var ri = 0; ri < rows; ri++) {
      html += '<tr>';
      var lineParts = (contentLines[ri] || '').split('\t');
      for (var ci = 0; ci < cols; ci++) {
        var content = lineParts[ci] || (oldCells[ri] && oldCells[ri][ci]) || '';
        html += '<td style="border:1px solid #d9d9d9;padding:6px 10px;">' + _esc(content.trim()) + '</td>';
      }
      html += '</tr>';
    }
    el.innerHTML = html;
  };

  // ── Static helpers ────────────────────────────────────────

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _removeDialog(overlay) {
    if (overlay && overlay.parentElement) overlay.parentElement.remove();
  }

  function _applyStyles(el, v, props) {
    for (var i = 0; i < props.length; i++) {
      if (v[props[i]] !== undefined && v[props[i]] !== '') {
        el.style[props[i]] = v[props[i]];
      }
    }
  }

  function _toggleAttr(el, attr, val) {
    if (val) el.setAttribute(attr, '');
    else el.removeAttribute(attr);
  }

  function _parseColor(val) {
    if (!val || val === '') return '';
    // rgb(...) → hex
    var m = val.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      return '#' + ((1<<24)+(+m[1]<<16)+(+m[2]<<8)+(+m[3])).toString(16).slice(1);
    }
    if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return val;
    return '';
  }

  function _parseBorderColor(border) {
    if (!border) return '';
    var m = border.match(/(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))/);
    return m ? _parseColor(m[1]) : '';
  }

  function _parseBorderWidth(border) {
    if (!border) return '';
    var m = border.match(/(\d+(?:\.\d+)?(?:px|em|rem))/);
    return m ? m[1] : '';
  }

  window.CCComponentDialog = ComponentDialog;
})();
