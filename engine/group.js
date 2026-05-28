;(function () {
  'use strict';

  class GroupManager {
    constructor(state, eventBus, domUtils, changeTracker, selection) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this.changeTracker = changeTracker;
      this.selection = selection;
    }

    /**
     * Group all currently multi-selected elements into a wrapper div.
     * Calculates a bounding box, creates a .cc-group container, and converts
     * child coordinates to be relative to the wrapper origin.
     */
    groupSelected() {
      var multi = this.state.get('selection.multiSelect') || [];
      if (multi.length < 2) return;

      var canvas = this.state.canvas;

      // 1. Compute bounding box of all elements
      var minLeft = Infinity, minTop = Infinity;
      var maxRight = -Infinity, maxBottom = -Infinity;

      multi.forEach(function (el) {
        var pos = this.domUtils.getElPosition(el);
        var w = parseFloat(el.style.width) || el.offsetWidth;
        var h = parseFloat(el.style.height) || el.offsetHeight;
        if (pos.left < minLeft) minLeft = pos.left;
        if (pos.top < minTop) minTop = pos.top;
        if (pos.left + w > maxRight) maxRight = pos.left + w;
        if (pos.top + h > maxBottom) maxBottom = pos.top + h;
      }.bind(this));

      var bw = maxRight - minLeft;
      var bh = maxBottom - minTop;

      // 2. Create wrapper
      var wrapper = document.createElement('div');
      wrapper.className = 'cc-el cc-group';
      wrapper.setAttribute('data-type', 'group');
      wrapper.style.cssText =
        'position:absolute;' +
        'left:' + minLeft + 'px;' +
        'top:' + minTop + 'px;' +
        'width:' + bw + 'px;' +
        'height:' + bh + 'px;';

      // 3. Convert child coordinates relative to wrapper
      var children = multi.slice(); // snapshot
      var childPositions = [];

      children.forEach(function (el) {
        var pos = this.domUtils.getElPosition(el);
        childPositions.push({
          el: el,
          origLeft: pos.left,
          origTop: pos.top
        });
        el.style.left = (pos.left - minLeft) + 'px';
        el.style.top = (pos.top - minTop) + 'px';
        wrapper.appendChild(el);
      }.bind(this));

      canvas.appendChild(wrapper);

      // 4. Clear multi-select state and select the new group
      this.selection.clearMultiSelect();
      this.selection.select(wrapper);

      // 5. Record change
      this.changeTracker.record('group', {
        wrapper: wrapper,
        children: childPositions.map(function (cp) {
          return { element: cp.el, origLeft: cp.origLeft, origTop: cp.origTop };
        }),
        groupLeft: minLeft,
        groupTop: minTop,
        groupWidth: bw,
        groupHeight: bh
      }, {
        children: childPositions.map(function (cp) {
          return { element: cp.el, origLeft: cp.origLeft, origTop: cp.origTop };
        })
      }, { elementId: wrapper.id });

      this.eventBus.emit('group:created', { wrapper: wrapper, children: children });
    }

    /**
     * Ungroup the currently selected .cc-group element.
     * Restores child positions to absolute canvas coordinates and removes the wrapper.
     */
    ungroupSelected() {
      var el = this.state.selected;
      if (!el || !el.classList.contains('cc-group')) return;

      var canvas = this.state.canvas;
      var groupPos = this.domUtils.getElPosition(el);
      var children = [];

      // Convert children back to canvas-absolute positions
      while (el.firstChild) {
        var child = el.firstChild;
        var childLeft = parseFloat(child.style.left) || 0;
        var childTop = parseFloat(child.style.top) || 0;

        children.push({
          el: child,
          relLeft: childLeft,
          relTop: childTop
        });

        child.style.left = (groupPos.left + childLeft) + 'px';
        child.style.top = (groupPos.top + childTop) + 'px';

        canvas.appendChild(child);
      }

      // Remove empty wrapper
      el.remove();

      // Record change
      this.changeTracker.record('ungroup', {
        children: children.map(function (c) {
          return { element: c.el, canvasLeft: groupPos.left + c.relLeft, canvasTop: groupPos.top + c.relTop };
        })
      }, {
        wrapperPos: { left: groupPos.left, top: groupPos.top },
        children: children.map(function (c) {
          return { element: c.el, relLeft: c.relLeft, relTop: c.relTop };
        })
      }, { elementId: el.id });

      // Deselect since wrapper is gone
      this.selection.deselect();

      this.eventBus.emit('group:ungrouped', { children: children });
    }
  }

  window.CCGroupManager = GroupManager;
})();
