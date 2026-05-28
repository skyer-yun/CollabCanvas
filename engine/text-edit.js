;(function () {
  'use strict';

  class TextEditor {
    constructor(state, eventBus) {
      this.state = state;
      this.eventBus = eventBus;
      this._editingEl = null;
    }

    /**
     * Start inline editing on an element.
     * Makes the element contentEditable and focuses it.
     */
    startInlineEdit(el) {
      if (!el) return;
      if (this._editingEl === el) return; // Already editing

      // Finish any previous edit
      this.finishInlineEdit();

      this._editingEl = el;

      var oldText = el.innerText || '';
      this._preEditText = oldText;

      el.contentEditable = 'true';
      el.classList.add('cc-inline-edit');
      el.focus();

      // Select all text inside
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      this.eventBus.emit('text:edit:start', { element: el, oldText: oldText });
    }

    /**
     * Finish inline editing on the current element.
     * Records the text change and removes contentEditable.
     */
    finishInlineEdit() {
      var el = this._editingEl;
      if (!el) return;

      var newText = el.innerText || '';

      el.contentEditable = 'false';
      el.classList.remove('cc-inline-edit');

      this._editingEl = null;

      // Only record if text actually changed
      if (newText !== this._preEditText) {
        this.eventBus.emit('text:edit:finish', {
          element: el,
          oldText: this._preEditText,
          newText: newText
        });
      }

      this._preEditText = '';
    }

    /**
     * Check if an inline edit is active.
     */
    isEditing() {
      return this._editingEl !== null;
    }
  }

  window.CCTextEditor = TextEditor;
})();
