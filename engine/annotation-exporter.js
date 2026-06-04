/**
 * CollabCanvas -- Annotation Exporter
 * Export annotations to Markdown/JSON for PRD linkage.
 * Output is standalone: no dependency on CollabCanvas at read time.
 */
;(function () {
  'use strict';

  function AnnotationExporter(state) {
    this._state = state || null;
  }

  /**
   * Build structured annotation data with full context.
   * Each annotation gets: area, component, number, coordinates, text, status.
   */
  AnnotationExporter.prototype.buildStructuredData = function (annotations, canvasEl) {
    if (!annotations || !annotations.length) return [];

    var items = [];
    for (var i = 0; i < annotations.length; i++) {
      var ann = annotations[i];
      var item = {
        id: ann.id,
        number: i + 1,
        type: ann.type,
        area: this._detectArea(ann, canvasEl),
        component: this._detectComponent(ann, canvasEl),
        coordinates: {
          x: ann.x,
          y: ann.y,
          w: ann.w,
          h: ann.h
        },
        text: ann.text || '',
        status: ann.status || 'pending',
        assignee: ann.assignee || '',
        color: ann.color || '#1677ff',
        timestamp: ann.timestamp || 0,
        module: ann.module || '',
        priority: ann.priority || 'medium',
        requirementType: ann.requirementType || 'functional',
        acceptanceCriteria: ann.acceptanceCriteria || '',
        requirementId: ann.requirementId || '',
        pageId: ann.pageId || null,
        target: ann.target || null
      };
      items.push(item);
    }
    return items;
  };

  /**
   * Detect which area/section the annotation belongs to.
   * Walks up from annotation position to find parent containers.
   */
  AnnotationExporter.prototype._detectArea = function (ann, canvasEl) {
    if (!canvasEl) return '';
    var cx = ann.x + (ann.w || 0) / 2;
    var cy = ann.y + (ann.h || 0) / 2;

    var containers = canvasEl.querySelectorAll(
      '[data-type="container"], [data-type="card"], [data-type="section"]'
    );
    for (var i = 0; i < containers.length; i++) {
      var r = containers[i].getBoundingClientRect();
      var cr = canvasEl.getBoundingClientRect();
      var l = parseFloat(containers[i].style.left) || 0;
      var t = parseFloat(containers[i].style.top) || 0;
      var w = parseFloat(containers[i].style.width) || containers[i].offsetWidth;
      var h = parseFloat(containers[i].style.height) || containers[i].offsetHeight;
      if (cx >= l && cx <= l + w && cy >= t && cy <= t + h) {
        var label = containers[i].innerText || '';
        if (label.length > 30) label = label.substring(0, 30) + '...';
        return label || ('container-' + (i + 1));
      }
    }
    return '';
  };

  /**
   * Detect which component the annotation is pointing to.
   */
  AnnotationExporter.prototype._detectComponent = function (ann, canvasEl) {
    if (!canvasEl) return '';
    var cx = ann.x + (ann.w || 0) / 2;
    var cy = ann.y + (ann.h || 0) / 2;

    var els = canvasEl.querySelectorAll('.cc-el');
    var best = null;
    var bestArea = Infinity;

    for (var i = 0; i < els.length; i++) {
      var l = parseFloat(els[i].style.left) || 0;
      var t = parseFloat(els[i].style.top) || 0;
      var w = parseFloat(els[i].style.width) || els[i].offsetWidth;
      var h = parseFloat(els[i].style.height) || els[i].offsetHeight;
      if (cx >= l && cx <= l + w && cy >= t && cy <= t + h) {
        var area = w * h;
        if (area < bestArea) {
          bestArea = area;
          best = els[i];
        }
      }
    }

    if (best) {
      var dtype = best.getAttribute('data-type') || 'unknown';
      var id = best.id || '';
      return dtype + (id ? '#' + id : '');
    }
    return '';
  };

  /**
   * Export as Markdown table.
   */
  AnnotationExporter.prototype.toMarkdown = function (data) {
    if (!data || !data.length) return '# 标注列表\n\n无标注数据。';

    var lines = ['# 标注列表', ''];
    lines.push('| 编号 | 区域 | 组件 | 类型 | 坐标 | 内容 | 状态 |');
    lines.push('|------|------|------|------|------|------|------|');

    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var statusMap = { 'pending': '待处理', 'in-progress': '进行中', 'resolved': '已解决' };
      var coords = d.coordinates.x + ',' + d.coordinates.y +
        (d.coordinates.w ? ' (' + d.coordinates.w + 'x' + d.coordinates.h + ')' : '');
      lines.push('| ' + d.number + ' | ' + (d.area || '-') + ' | ' + (d.component || '-') +
        ' | ' + d.type + ' | ' + coords + ' | ' + (d.text || '-') +
        ' | ' + (statusMap[d.status] || d.status) + ' |');
    }

    lines.push('');
    return lines.join('\n');
  };

  /**
   * Export as JSON.
   */
  AnnotationExporter.prototype.toJSON = function (data) {
    return JSON.stringify(data, null, 2);
  };

  /**
   * Export as structured PRD Markdown.
   * @param {Array} data - output from buildStructuredData()
   * @param {Object} settings - project settings from state
   * @returns {string} PRD Markdown
   */
  AnnotationExporter.prototype.toPRD = function (data, settings) {
    if (!data || !data.length) return '# \u9700\u6C42\u89C4\u683C\u8BF4\u660E\n\n\u65E0\u6807\u6CE8\u6570\u636E\u3002';

    var proj = (settings && settings.project) || {};
    var expSettings = (settings && settings.export) || {};
    var projName = proj.name || '\u672A\u547D\u540D\u9879\u76EE';
    var projVersion = proj.version || '1.0';
    var projAuthor = proj.author || '-';
    var projDesc = proj.description || '';
    var projUrl = proj.pageUrl || '';
    var numberFormat = expSettings.annotationNumberFormat || 'auto';
    var includeAnnotations = expSettings.includeAnnotations !== false;
    var includeScreenshots = expSettings.includeScreenshots !== false;
    var date = new Date();
    var dateStr = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');

    var statusMap = { 'pending': '\u5F85\u5904\u7406', 'in-progress': '\u8FDB\u884C\u4E2D', 'resolved': '\u5DF2\u89E3\u51B3' };
    var priMap = { 'high': '\u9AD8', 'medium': '\u4E2D', 'low': '\u4F4E' };
    var reqTypeMap = { 'functional': '\u529F\u80FD', 'performance': '\u6027\u80FD', 'security': '\u5B89\u5168', 'ux': '\u4F53\u9A8C' };

    // Group by module (fallback: area, then '未分组')
    var groups = this._groupByModule(data);
    var groupNames = Object.keys(groups);

    // Build markdown
    var lines = [];
    lines.push('# ' + projName + ' - \u9700\u6C42\u89C4\u683C\u8BF4\u660E');
    lines.push('');
    lines.push('| \u5C5E\u6027 | \u503C |');
    lines.push('|------|------|');
    lines.push('| \u7248\u672C | ' + projVersion + ' |');
    lines.push('| \u4F5C\u8005 | ' + projAuthor + ' |');
    lines.push('| \u65E5\u671F | ' + dateStr + ' |');
    lines.push('| \u6807\u6CE8\u6570 | ' + data.length + ' |');
    if (projDesc) lines.push('| \u63CF\u8FF0 | ' + projDesc + ' |');
    if (projUrl) lines.push('| \u9875\u9762URL | ' + projUrl + ' |');
    lines.push('');

    // TOC
    lines.push('## \u76EE\u5F55');
    for (var t = 0; t < groupNames.length; t++) {
      lines.push((t + 1) + '. [' + groupNames[t] + '](#' + _anchor(groupNames[t]) + ')');
    }
    lines.push('');

    // Each module group
    for (var g = 0; g < groupNames.length; g++) {
      var gName = groupNames[g];
      var gItems = groups[gName];
      lines.push('## ' + gName);
      lines.push('');
      lines.push('| \u7F16\u53F7 | \u9700\u6C42\u7C7B\u578B | \u4F18\u5148\u7EA7 | \u5185\u5BB9 | \u72B6\u6000 |' +
        (gItems.some(function(gi) { return gi.requirementId; }) ? ' \u9700\u6C42ID |' : ''));
      lines.push('|------|---------|--------|------|------|' +
        (gItems.some(function(gi) { return gi.requirementId; }) ? '--------|' : ''));

      for (var gi = 0; gi < gItems.length; gi++) {
        var d = gItems[gi];
        var numLabel = _fmtNum(d.number, numberFormat);
        lines.push('| ' + numLabel + ' | ' + (reqTypeMap[d.requirementType] || d.requirementType) +
          ' | ' + (priMap[d.priority] || d.priority) +
          ' | ' + (d.text || '-') +
          ' | ' + (statusMap[d.status] || d.status) +
          (d.requirementId ? ' | ' + d.requirementId : '') + ' |');
      }
      lines.push('');

      // Acceptance criteria
      var hasCriteria = false;
      for (var ci = 0; ci < gItems.length; ci++) {
        if (gItems[ci].acceptanceCriteria) { hasCriteria = true; break; }
      }
      if (hasCriteria) {
        lines.push('### \u9A8C\u6536\u6807\u51C6');
        for (var cj = 0; cj < gItems.length; cj++) {
          var d2 = gItems[cj];
          if (d2.acceptanceCriteria) {
            lines.push('**' + _fmtNum(d2.number, numberFormat) + '**: ' + d2.acceptanceCriteria);
          }
        }
        lines.push('');
      }

      // Detail section (only if includeAnnotations is true)
      if (includeAnnotations) {
        lines.push('### \u8BE6\u7EC6\u6807\u6CE8');
        for (var di = 0; di < gItems.length; di++) {
          var d3 = gItems[di];
          var coords = d3.coordinates.x + ',' + d3.coordinates.y +
            (d3.coordinates.w ? ' (' + d3.coordinates.w + 'x' + d3.coordinates.h + ')' : '');
          lines.push('**' + _fmtNum(d3.number, numberFormat) + '** ' + (d3.text || '\u65E0\u5185\u5BB9'));
          if (d3.area) lines.push('- \u533A\u57DF: ' + d3.area);
          if (d3.component) lines.push('- \u7EC4\u4EF6: ' + d3.component);
          lines.push('- \u5750\u6807: ' + coords);
          if (d3.assignee) lines.push('- \u8D1F\u8D23\u4EBA: ' + d3.assignee);
          lines.push('');
        }
      }
    }

    // Screenshot notes (if includeScreenshots is true)
    if (includeScreenshots) {
      lines.push('## \u622A\u56FE\u9700\u6C42');
      lines.push('');
      lines.push('\u4EE5\u4E0B\u6807\u6CE8\u70B9\u9700\u914D\u5408\u622A\u56FE\u8BF4\u660E\uFF1A');
      lines.push('');
      for (var si = 0; si < data.length; si++) {
        var ds = data[si];
        lines.push('- ' + _fmtNum(ds.number, numberFormat) + ': \u622A\u56FE\u533A\u57DF ' +
          ds.coordinates.x + ',' + ds.coordinates.y + ' ' +
          (ds.coordinates.w || 0) + 'x' + (ds.coordinates.h || 0));
      }
      lines.push('');
    }

    // Priority summary
    lines.push('## \u4F18\u5148\u7EA7\u6C47\u603B');
    lines.push('');
    lines.push('| \u4F18\u5148\u7EA7 | \u6570\u91CF | \u5360\u6BD4 |');
    lines.push('|--------|------|------|');
    var priCounts = { high: 0, medium: 0, low: 0 };
    for (var pi = 0; pi < data.length; pi++) {
      var p = data[pi].priority || 'medium';
      if (priCounts[p] !== undefined) priCounts[p]++;
    }
    ['high', 'medium', 'low'].forEach(function (pri) {
      var pct = data.length > 0 ? Math.round(priCounts[pri] / data.length * 100) : 0;
      lines.push('| ' + priMap[pri] + ' | ' + priCounts[pri] + ' | ' + pct + '% |');
    });
    lines.push('');

    // Status distribution
    lines.push('## \u72B6\u6001\u5206\u5E03');
    lines.push('');
    lines.push('| \u72B6\u6001 | \u6570\u91CF |');
    lines.push('|------|------|');
    var statusCounts = {};
    for (var si = 0; si < data.length; si++) {
      var st = data[si].status || 'pending';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }
    ['pending', 'in-progress', 'resolved'].forEach(function (s) {
      lines.push('| ' + statusMap[s] + ' | ' + (statusCounts[s] || 0) + ' |');
    });
    lines.push('');

    return lines.join('\n');
  };

  /**
   * Group structured data by module field.
   * Fallback: by area, then '未分组'.
   */
  AnnotationExporter.prototype._groupByModule = function (data) {
    var groups = {};
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var key = d.module || d.area || '\u672A\u5206\u7EC4';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  };

  // Anchor helper for TOC links
  function _anchor(text) {
    return text.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '').toLowerCase();
  }

  // Number format helper
  function _fmtNum(num, format) {
    if (format === 'A,B,C') {
      return String.fromCharCode(64 + num);
    }
    return num;
  }

  // ── v1.5: Copilot Format Export ────────────────────────────────

  /**
   * Export annotations to Product Copilot format.
   * Output: {pageId: [{id, title, target, content, priority, module, ...}]}
   *
   * @param {Object} [options] - {includeCoordinates: Boolean}
   * @returns {Object}
   */
  AnnotationExporter.prototype.toCopilotFormat = function (options) {
    var annotations = this._state ? (this._state.get('annotations.list') || []) : [];
    var canvasEl = this._state ? this._state.canvas : null;
    var data = this.buildStructuredData(annotations, canvasEl);
    var opts = options || {};
    var result = {};

    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var pageId = d.pageId || '_unassigned';

      if (!result[pageId]) result[pageId] = [];

      var entry = {
        id: d.id || '',
        title: d.text || '',
        target: d.target || this._buildSelector(d),
        content: d.text || '',
        priority: d.priority || 'medium',
        module: d.module || '',
        status: d.status || 'pending',
        requirementType: d.requirementType || 'functional',
        acceptanceCriteria: d.acceptanceCriteria || ''
      };

      if (opts.includeCoordinates) {
        entry.x = d.x;
        entry.y = d.y;
        entry.w = d.w;
        entry.h = d.h;
      }

      result[pageId].push(entry);
    }

    return result;
  };

  /**
   * Export annotations to Copilot format as JSON string.
   * @param {Object} [options]
   * @returns {string}
   */
  AnnotationExporter.prototype.toCopilotJSON = function (options) {
    return JSON.stringify(this.toCopilotFormat(options), null, 2);
  };

  /**
   * Build a CSS selector from annotation coordinates.
   * Uses elementFromPoint() to find the element at annotation position.
   *
   * @param {Object} ann - Annotation with x, y coordinates
   * @returns {string|null} CSS selector or null
   */
  AnnotationExporter.prototype._buildSelector = function (ann) {
    if (!ann || ann.x === undefined || ann.y === undefined) return null;

    var canvas = this._state.get('canvas.canvas');
    if (!canvas) return null;

    var canvasRect = canvas.getBoundingClientRect();
    var zoom = this._state.get('canvas.zoom') || 1;
    var panX = this._state.get('canvas.panX') || 0;
    var panY = this._state.get('canvas.panY') || 0;

    // Convert canvas-relative coords to viewport coords
    var viewX = canvasRect.left + ann.x * zoom + panX;
    var viewY = canvasRect.top + ann.y * zoom + panY;

    var el = document.elementFromPoint(viewX, viewY);
    if (!el || el === canvas || el === document.documentElement || el === document.body) return null;

    // Build selector: prefer id, then class + tag, then nth-child path
    if (el.id) return '#' + el.id;

    var selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\s+/).filter(function (c) {
        return c.indexOf('cc-') !== 0 && c.indexOf('annotation') !== 0;
      });
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    // Check uniqueness
    var matches = document.querySelectorAll(selector);
    if (matches.length === 1) return selector;

    // Fall back to nth-child path
    return this._buildNthChildSelector(el);
  };

  /**
   * Build a full nth-child selector path from root to element.
   */
  AnnotationExporter.prototype._buildNthChildSelector = function (el) {
    var parts = [];
    var current = el;
    var maxDepth = 5;

    while (current && current !== document.body && current !== document.documentElement && parts.length < maxDepth) {
      var tag = current.tagName.toLowerCase();
      if (tag === 'div' || tag === 'span') tag = ''; // omit generic tags

      var parent = current.parentElement;
      if (parent) {
        var siblings = parent.children;
        var index = 1;
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] === current) break;
          if (siblings[i].tagName === current.tagName) index++;
        }
        var part = (tag || current.tagName.toLowerCase()) + ':nth-child(' + (Array.prototype.indexOf.call(parent.children, current) + 1) + ')';
        parts.unshift(part);
      }
      current = parent;
    }

    return parts.length > 0 ? parts.join(' > ') : null;
  };

  window.CCAnnotationExporter = AnnotationExporter;
})();
