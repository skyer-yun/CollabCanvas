# CollabCanvas

> 专业级网页可视化编辑器 Chrome 扩展 — 检查、标注、对比、编辑任何网页

CollabCanvas 是一个 Manifest V3 Chrome 扩展，可将任何网页转变为功能完备的可视化编辑器。点击浏览器图标激活，即可在当前页面上叠加专业编辑工具栏，支持元素选择、变换、标注、版本对比等操作。

## 功能概览

### 编辑器核心

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 元素选择 | Click / Ctrl+Click | 单选/多选，选中框 + 8 点控制手柄 |
| 拖拽移动 | Drag | 实时拖拽，支持智能对齐参考线 |
| 缩放旋转 | Corner handles | 8 点手柄缩放 + 旋转 |
| 双击编辑 | Double-click | 原地文本编辑 |
| 撤销/重做 | Ctrl+Z / Ctrl+Y | 完整操作历史栈（上限 100 步） |
| 复制/剪切/粘贴 | Ctrl+C/X/V | 支持跨位置粘贴，多元素相对位置保持 |
| 对齐工具 | — | 左/中/右/上/中/下 6 方向对齐 |
| 分组/解组 | Ctrl+G / Ctrl+Shift+G | 元素分组，坐标自动转换 |
| 层级排序 | Ctrl+] / [ | z-index 调整 + 右键菜单 |
| 方向键微调 | Arrow / Shift+Arrow | 1px / 10px 微调，debounce 合并 undo |
| 暂停/恢复 | F1 / Ctrl+P | 暂停编辑模式，查看原始页面 |

### 标注系统

- **4 种标注类型**：数字标号、便签、画笔、图钉
- **状态管理**：待处理 / 进行中 / 已解决
- **PRD 增强**：模块标签、优先级（高/中/低）
- **3 种显示模式**：完整 / 紧凑 / 隐藏
- **导出格式**：Markdown / JSON / PRD（含需求规格模板）

### 画布功能

- **无限画布**：平移 + 缩放（鼠标滚轮 / 触摸板）
- **智能参考线**：红色边缘对齐 + 绿色中心对齐 + 距离标注
- **自动吸附**：5px 阈值自动吸附对齐

### 面板系统

| 面板 | 位置 | 内容 |
|------|------|------|
| 图层面板 | 左侧 | 元素列表、可见性、锁定、拖拽排序 |
| 组件面板 | 左侧 | 预置组件库（按钮/卡片/表单/导航等） |
| 属性面板 | 右侧 | 9 组可折叠属性编辑器 |
| 变更面板 | 右侧 | 操作历史、筛选、AI 提示词生成 |
| 标注面板 | 右侧 | 标注列表、筛选、导出 |
| 样式面板 | 右侧 | Design Token 提取与管理 |

### 高级功能（Phase 2-3）

- **Design Token**：从页面提取设计变量（颜色/字体/间距），支持导入/导出
- **DOM 对比**：两个版本间的 DOM 差异可视化
- **版本管理**：快照、差异对比、版本存储
- **页面加载**：HTML / 图片 / 存档文件加载
- **导出引擎**：导出为 HTML / PNG

## 技术架构

```
CollabCanvas/
├── manifest.json              # Chrome Extension Manifest V3
├── content.js                 # 扩展注入入口
├── main.js                    # 独立版入口（1,407 行）
├── demo.html                  # 演示页面
│
├── core/                      # 核心基础设施
│   ├── event-bus.js           #   事件总线（发布/订阅）
│   ├── state.js               #   状态管理器（batch API）
│   ├── persistence.js         #   持久化（chrome.storage）
│   ├── keyboard.js            #   键盘快捷键处理器
│   └── mode-machine.js        #   模式状态机（select/pan/text/annotate）
│
├── engine/                    # 编辑引擎（12 模块）
│   ├── selection.js           #   选择管理器
│   ├── transform.js           #   变换（移动/缩放/旋转）
│   ├── align.js               #   对齐工具
│   ├── group.js               #   分组/解组
│   ├── clipboard.js           #   剪贴板（复制/剪切/粘贴）
│   ├── zorder.js              #   层级排序
│   ├── undo-redo.js           #   撤销/重做管理器
│   ├── change-tracker.js      #   变更追踪器（序列化 + 栈上限）
│   ├── element-factory.js     #   元素工厂（创建/删除）
│   ├── component-renderer.js  #   组件渲染器
│   ├── page-extractor.js      #   页面结构提取
│   ├── annotation-exporter.js #   标注导出引擎
│   ├── export-engine.js       #   导出引擎（HTML/PNG）
│   ├── dom-utils.js           #   DOM 工具函数
│   └── text-edit.js           #   文本编辑器
│
├── canvas/                    # 画布系统
│   ├── infinite-canvas.js     #   无限画布（平移/缩放/动画）
│   └── canvas-wrapper.js      #   画布包装器
│
├── annotation/                # 标注系统
│   ├── annotator.js           #   标注数据管理（CRUD）
│   ├── renderer.js            #   标注渲染器
│   └── tools.js               #   标注工具集（数字/便签/画笔/图钉）
│
├── compare/                   # 对比引擎
│   ├── compare-engine.js      #   页面对比核心
│   └── dom-differ.js          #   DOM 差异算法
│
├── tokens/                    # Design Token 系统
│   ├── extractor.js           #   Token 提取器
│   ├── tokenizer.js           #   Token 管理器
│   └── importer.js            #   Token 导入器
│
├── version/                   # 版本管理
│   ├── snapshot.js            #   快照管理
│   ├── differ.js              #   版本差异
│   └── store.js               #   版本存储
│
├── loader/                    # 文件加载器
│   ├── html-loader.js         #   HTML 文件加载
│   ├── image-loader.js        #   图片文件加载
│   ├── archive-loader.js      #   存档文件加载
│   └── proxy.js               #   跨域代理
│
├── ui/                        # UI 组件
│   ├── shell.js               #   外壳布局
│   ├── toolbar.js             #   工具栏
│   ├── left-panel.js          #   左侧面板
│   ├── right-panel.js         #   右侧面板
│   ├── statusbar.js           #   状态栏
│   ├── modal.js               #   模态框
│   ├── toast.js               #   消息提示
│   ├── context-menu.js        #   右键菜单
│   ├── component-dialog.js    #   组件对话框
│   ├── settings-dialog.js     #   设置对话框
│   └── tabs/                  #   面板标签页
│       ├── layers-tab.js      #     图层
│       ├── components-tab.js  #     组件
│       ├── properties-tab.js  #     属性
│       ├── changes-tab.js     #     变更
│       ├── notes-annotations-tab.js  # 备注 & 标注
│       ├── annotations-tab.js #     标注详情
│       ├── styles-tab.js      #     样式
│       ├── pages-tab.js       #     页面
│       └── versions-tab.js    #     版本
│
├── styles/
│   └── collabcanvas.css       # 全局样式（1,061 行）
│
├── background/
│   └── service-worker.js      # Chrome Service Worker
│
├── lib/
│   └── html2canvas.min.js     # 第三方库
│
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### 设计原则

1. **零构建**：纯 JavaScript，无 Node.js / Webpack / Babel 依赖
2. **模块化**：66 文件，15+ 目录，按职责分层
3. **事件驱动**：所有模块通过 EventBus 通信，松耦合
4. **依赖注入**：构造函数参数显式传递依赖
5. **双模式运行**：Chrome Extension 注入 + 独立 HTML 页面
6. **可序列化**：undo 栈存储序列化引用，避免 DOM 引用泄漏

### 模块加载顺序

扩展模式下，`content.js` 按 8 层依赖顺序依次加载约 60 个 JS 文件：

```
Layer 0: EventBus, DomUtils, Persistence（无依赖）
Layer 1: State（依赖 Layer 0）
Layer 2: Canvas（依赖 Layer 1）
Layer 3: Engine Core（依赖 Layer 0-2）
Layer 4: UndoRedo, Export（依赖 Layer 3）
Layer 5: ModeMachine, Keyboard, UI（依赖 Layer 4）
Layer 6: Annotation, Compare, Tokens, Styles（Phase 2）
Layer 7: Version, Loader（Phase 3）
Layer 8: Main Entry（依赖全部）
```

## 快速开始

### 方式 1：Chrome 扩展安装

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 CollabCanvas 项目根目录
5. 打开任意网页，点击工具栏 CollabCanvas 图标激活

### 方式 2：独立 HTML 模式

直接在浏览器打开 `demo.html`，即可体验完整编辑器功能。

### 切换扩展开关

- 再次点击浏览器图标 → 关闭编辑器（调用 `shutdown()` 清理所有资源）

## 项目统计

| 指标 | 数量 |
|------|------|
| 源文件数 | 66 |
| 总代码行数 | ~14,750 |
| JS 模块 | 60 |
| 目录数 | 15+ |
| 第三方依赖 | 1（html2canvas） |
| Chrome 权限 | 4（activeTab, downloads, scripting, storage） |

## Phase 1 修复记录

v1.0 初始版本发布后进行了 P0 级内存和正确性修复（372 行新增，106 行修改）：

| 问题 | 修复 |
|------|------|
| undo 栈持有 DOM 引用导致内存泄漏 | `_serializeValue()` 将 HTMLElement 替换为 `{__ccRef, id}` |
| State.get() 返回可变引用 | annotator/tokenizer 改用 `concat/slice` 不可变操作 |
| shutdown() 不清理 69 处事件订阅 | EventBus.destroy() + tab.destroy() + DOM removeEventListener |
| 动画每帧 3 次 state:changed | batch API 延迟发射，合并为单次事件 |
| 变更栈无上限 | 添加 `_maxChanges = 100` 栈限制 |

详见 [docs/phase1-fixes.md](docs/phase1-fixes.md)。

## 开发说明

### 添加新模块

1. 在对应目录创建 JS 文件，使用 IIFE 封装
2. 通过构造函数接收 `state` 和 `bus` 依赖
3. 将类挂载到 `window.CCYourModule`
4. 在 `content.js` 的 `scripts` 数组中按依赖层添加
5. 在 `main.js` 的 `init()` 中实例化

### 事件协议

模块间通过 EventBus 通信，核心事件：

```
selection:changed    — 选择变化
annotation:created   — 标注创建
annotation:updated   — 标注更新
annotation:removed   — 标注删除
element:created      — 元素创建
property:change      — 属性变更
history:recorded     — 变更记录
history:cleared      — 历史清空
layer:reorder        — 图层排序
layer:visibility     — 图层可见性
layer:lock           — 图层锁定
state:changed        — 状态变更（支持 batch 模式）
```

### 状态结构

```javascript
state.canvas           // 画布 DOM 引用
state.selected         // 当前选中元素
state.changes          // 变更历史数组
state.get('annotations.list')     // 标注列表
state.get('settings')             // 编辑器设置
state.get('canvas.zoom')          // 缩放级别
state.get('canvas.panX/panY')     // 平移偏移
```

## 浏览器兼容性

- Chrome 88+（Manifest V3 要求）
- Edge 88+（Chromium 内核）

## 许可证

MIT License
