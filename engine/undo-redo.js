;(function () {
  'use strict';

  class UndoRedoManager {
    constructor(state, eventBus, domUtils) {
      this.state = state;
      this.eventBus = eventBus;
      this.domUtils = domUtils;
      this._handlers = {};

      this._registerBuiltinHandlers();
    }

    // ── Handler registration ─────────────────────────────────

    /**
     * Register an undo/redo handler for a change type.
     * @param {string} type - Change type (e.g. 'css', 'move')
     * @param {object} handler - { undo(data), redo(data) }
     */
    registerHandler(type, handler) {
      if (typeof handler.undo !== 'function' || typeof handler.redo !== 'function') {
        throw new Error('Handler must have undo and redo methods');
      }
      this._handlers[type] = handler;
    }

    // ── Undo / Redo ──────────────────────────────────────────

    /**
     * Undo the most recent change.
     * Moves the change from changes stack to undoStack.
     */
    undo() {
      var changes = this.state.changes;
      if (!changes || changes.length === 0) return;

      var entry = changes.pop();
      this.state.undoStack.push(entry);

      var handler = this._handlers[entry.prop];
      if (handler) {
        try {
          handler.undo(entry);
        } catch (err) {
          console.error('[UndoRedo] undo error for', entry.prop, err);
        }
      }

      this.eventBus.emit('history:undo', entry);
    }

    /**
     * Redo the most recently undone change.
     * Moves the change from undoStack back to changes stack.
     */
    redo() {
      var undoStack = this.state.undoStack;
      if (!undoStack || undoStack.length === 0) return;

      var entry = undoStack.pop();
      this.state.changes.push(entry);

      var handler = this._handlers[entry.prop];
      if (handler) {
        try {
          handler.redo(entry);
        } catch (err) {
          console.error('[UndoRedo] redo error for', entry.prop, err);
        }
      }

      this.eventBus.emit('history:redo', entry);
    }

    // ── Built-in handlers ────────────────────────────────────

    _registerBuiltinHandlers() {
      var self = this;

      // CSS property change
      this.registerHandler('css', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el || !el.parentNode) return;
          self._applyStyles(el, entry.oldVal);
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el || !el.parentNode) return;
          self._applyStyles(el, entry.newVal);
        }
      });

      // Resize
      this.registerHandler('resize', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el || !el.parentNode) return;
          el.style.left = entry.oldVal.left + 'px';
          el.style.top = entry.oldVal.top + 'px';
          el.style.width = entry.oldVal.width + 'px';
          el.style.height = entry.oldVal.height + 'px';
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el || !el.parentNode) return;
          el.style.left = entry.newVal.left + 'px';
          el.style.top = entry.newVal.top + 'px';
          el.style.width = entry.newVal.width + 'px';
          el.style.height = entry.newVal.height + 'px';
        }
      });

      // Text edit
      this.registerHandler('text', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el || !el.parentNode) return;
          el.innerText = entry.oldVal.text;
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el || !el.parentNode) return;
          el.innerText = entry.newVal.text;
        }
      });

      // Move
      this.registerHandler('move', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el || !el.parentNode) return;
          el.style.left = entry.oldVal.left + 'px';
          el.style.top = entry.oldVal.top + 'px';
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el || !el.parentNode) return;
          el.style.left = entry.newVal.left + 'px';
          el.style.top = entry.newVal.top + 'px';
        }
      });

      // Rotate
      this.registerHandler('rotate', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el || !el.parentNode) return;
          el.style.transform = 'rotate(' + entry.oldVal.rotation + 'deg)';
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el || !el.parentNode) return;
          el.style.transform = 'rotate(' + entry.newVal.rotation + 'deg)';
        }
      });

      // Delete
      this.registerHandler('delete', {
        undo: function (entry) {
          var old = entry.oldVal;
          if (!old || !old.parent) return;
          var wrapper = document.createElement('div');
          wrapper.innerHTML = old.html;
          var el = wrapper.firstChild;
          if (el) old.parent.appendChild(el);
        },
        redo: function (entry) {
          var el = entry.newVal;
          if (!el) {
            // Try to find by elementId
            var id = entry.elementId;
            if (id) el = document.getElementById(id);
          }
          if (el && el.parentNode) el.remove();
        }
      });

      // Insert
      this.registerHandler('insert', {
        undo: function (entry) {
          var el = entry.newVal.element;
          if (!el && entry.elementId) el = document.getElementById(entry.elementId);
          if (el && el.parentNode) el.remove();
        },
        redo: function (entry) {
          var old = entry.oldVal;
          var canvas = self.state.canvas;
          if (!canvas) return;
          var wrapper = document.createElement('div');
          wrapper.innerHTML = entry.newVal.html;
          var el = wrapper.firstChild;
          if (el) canvas.appendChild(el);
        }
      });

      // Duplicate (same as insert conceptually)
      this.registerHandler('duplicate', {
        undo: function (entry) {
          var el = entry.newVal.element;
          if (!el && entry.elementId) el = document.getElementById(entry.elementId);
          if (el && el.parentNode) el.remove();
        },
        redo: function (entry) {
          var canvas = self.state.canvas;
          if (!canvas) return;
          var wrapper = document.createElement('div');
          wrapper.innerHTML = entry.newVal.html;
          var el = wrapper.firstChild;
          if (el) canvas.appendChild(el);
        }
      });

      // Group
      this.registerHandler('group', {
        undo: function (entry) {
          var newVal = entry.newVal;
          var wrapper = newVal.wrapper;
          if (!wrapper || !wrapper.parentNode) return;

          // Restore children to canvas with original positions
          var canvas = self.state.canvas;
          newVal.children.forEach(function (c) {
            c.element.style.left = c.origLeft + 'px';
            c.element.style.top = c.origTop + 'px';
            canvas.appendChild(c.element);
          });
          wrapper.remove();
        },
        redo: function (entry) {
          var oldVal = entry.oldVal;
          var newVal = entry.newVal;
          var canvas = self.state.canvas;

          var wrapper = document.createElement('div');
          wrapper.className = 'cc-el cc-group';
          wrapper.setAttribute('data-type', 'group');
          wrapper.style.cssText =
            'position:absolute;left:' + newVal.groupLeft + 'px;top:' + newVal.groupTop + 'px;' +
            'width:' + newVal.groupWidth + 'px;height:' + newVal.groupHeight + 'px;';

          oldVal.children.forEach(function (c) {
            var el = c.element;
            if (!el || !el.parentNode) return;
            var curLeft = parseFloat(el.style.left) || 0;
            var curTop = parseFloat(el.style.top) || 0;
            el.style.left = (curLeft - newVal.groupLeft) + 'px';
            el.style.top = (curTop - newVal.groupTop) + 'px';
            wrapper.appendChild(el);
          });

          canvas.appendChild(wrapper);
        }
      });

      // Ungroup
      this.registerHandler('ungroup', {
        undo: function (entry) {
          // Re-create the group wrapper
          var oldVal = entry.oldVal;
          var canvas = self.state.canvas;

          var wrapper = document.createElement('div');
          wrapper.className = 'cc-el cc-group';
          wrapper.setAttribute('data-type', 'group');
          wrapper.style.cssText =
            'position:absolute;left:' + oldVal.wrapperPos.left + 'px;top:' + oldVal.wrapperPos.top + 'px;';

          oldVal.children.forEach(function (c) {
            if (c.element && c.element.parentNode) {
              c.element.style.left = c.relLeft + 'px';
              c.element.style.top = c.relTop + 'px';
              wrapper.appendChild(c.element);
            }
          });

          canvas.appendChild(wrapper);
        },
        redo: function (entry) {
          var newVal = entry.newVal;
          var canvas = self.state.canvas;
          newVal.children.forEach(function (c) {
            if (c.element && c.element.parentNode) {
              c.element.style.left = c.canvasLeft + 'px';
              c.element.style.top = c.canvasTop + 'px';
              canvas.appendChild(c.element);
            }
          });
          // Wrapper already removed during original ungroup
        }
      });

      // Z-index
      this.registerHandler('zindex', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el && entry.elementId) el = document.getElementById(entry.elementId);
          if (el) el.style.zIndex = entry.oldVal.zIndex;
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el && entry.elementId) el = document.getElementById(entry.elementId);
          if (el) el.style.zIndex = entry.newVal.zIndex;
        }
      });

      // Align
      this.registerHandler('align', {
        undo: function (entry) {
          var el = entry.oldVal.element;
          if (!el) return;
          el.style.left = entry.oldVal.left + 'px';
          el.style.top = entry.oldVal.top + 'px';
        },
        redo: function (entry) {
          var el = entry.newVal.element;
          if (!el) return;
          el.style.left = entry.newVal.left + 'px';
          el.style.top = entry.newVal.top + 'px';
        }
      });
    }

    // ── Utility ──────────────────────────────────────────────

    _applyStyles(el, styleData) {
      if (styleData.left !== undefined) el.style.left = styleData.left + 'px';
      if (styleData.top !== undefined) el.style.top = styleData.top + 'px';
      if (styleData.width !== undefined) el.style.width = styleData.width + 'px';
      if (styleData.height !== undefined) el.style.height = styleData.height + 'px';
      if (styleData.zIndex !== undefined) el.style.zIndex = styleData.zIndex;
      // Support arbitrary CSS properties via props map
      if (styleData.props) {
        for (var prop in styleData.props) {
          if (styleData.props.hasOwnProperty(prop)) {
            el.style[prop] = styleData.props[prop];
          }
        }
      }
    }
  }

  window.CCUndoRedoManager = UndoRedoManager;
})();
