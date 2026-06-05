;(function () {
  var TABS = ['layers', 'components', 'pages'];
  var LABELS = { layers: '\u56FE\u5C42', components: '\u7EC4\u4EF6', pages: '\u9875\u9762' };

  function LeftPanel(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this.tabBodies = {};
  }

  LeftPanel.prototype.create = function () {
    var self = this;
    var panel = document.createElement('div');
    panel.className = 'cc-left-panel';

    var header = document.createElement('div');
    header.className = 'cc-panel-header';

    TABS.forEach(function (id, i) {
      var tab = document.createElement('button');
      tab.className = 'cc-tab-btn' + (i === 0 ? ' active' : '');
      tab.textContent = LABELS[id];
      tab.dataset.tab = id;
      tab.addEventListener('click', function () {
        header.querySelectorAll('.cc-tab-btn').forEach(function (b) { b.classList.remove('active'); });
        tab.classList.add('active');
        Object.keys(self.tabBodies).forEach(function (key) {
          self.tabBodies[key].style.display = key === id ? '' : 'none';
        });
        self.state.set('leftTab', id);
        self.bus.emit('leftPanel:tabChange', id);
      });
      header.appendChild(tab);
    });

    panel.appendChild(header);

    var body = document.createElement('div');
    body.className = 'cc-panel-body';

    TABS.forEach(function (id, i) {
      var div = document.createElement('div');
      div.className = 'cc-tab-body cc-tab-' + id;
      if (i !== 0) div.style.display = 'none';
      body.appendChild(div);
      self.tabBodies[id] = div;
    });

    panel.appendChild(body);

    this.container = panel;
    return { container: panel, tabBodies: this.tabBodies };
  };

  window.CCLeftPanel = LeftPanel;
})();
