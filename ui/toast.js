;(function () {
  function Toast() {}

  Toast.prototype.show = function (msg, type) {
    type = type || 'info';
    var el = document.createElement('div');
    el.className = 'cc-toast cc-toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);

    setTimeout(function () {
      el.classList.add('cc-toast-fade');
    }, 1500);

    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
  };

  window.CCToast = Toast;
})();
