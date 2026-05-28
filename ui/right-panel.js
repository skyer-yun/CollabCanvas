;(function () {
  var TABS = ['properties', 'changes', 'notes', 'styles', 'versions'];
  var LABELS = { properties: '属性', changes: '变更', notes: '备注标注', styles: '样式', versions: '版本' };

  function RightPanel(state, bus) {
    this.state = state;
    this.bus = bus;
    this.container = null;
    this.tabBodies = {};
  }

  RightPanel.prototype.create = function () {
    var self = this;
    var panel = document.createElement('div');
    panel.className = 'cc-right-panel';

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
        self.state.set('rightTab', id);
        self.bus.emit('rightPanel:tabChange', id);
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

  window.CCRightPanel = RightPanel;
})();
