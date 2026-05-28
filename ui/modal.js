;(function () {
  function Modal() {}

  Modal.prototype.show = function (title, bodyHtml, buttons) {
    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'cc-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'cc-dialog';

    var head = document.createElement('div');
    head.className = 'cc-dialog-head';
    head.innerHTML = '<span class="cc-dialog-title">' + (title || '') + '</span>';

    var body = document.createElement('div');
    body.className = 'cc-dialog-body';
    body.innerHTML = bodyHtml || '';

    var foot = document.createElement('div');
    foot.className = 'cc-dialog-foot';

    (buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'cc-btn ' + (b.cls || '');
      btn.textContent = b.text;
      btn.addEventListener('click', function () { b.fn(dialog); });
      foot.appendChild(btn);
    });

    dialog.appendChild(head);
    dialog.appendChild(body);
    dialog.appendChild(foot);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) self.close(overlay);
    });

    document.body.appendChild(overlay);
    this._overlay = overlay;
    return overlay;
  };

  Modal.prototype.close = function (overlay) {
    var el = overlay || this._overlay;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  window.CCModal = Modal;
})();
