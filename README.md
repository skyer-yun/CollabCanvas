# CollabCanvas

> 专业级网页可视化编辑器 Chrome 扩展 — 检查、标注、对比、编辑任何网页

CollabCanvas 是一个 Manifest V3 Chrome 扩展，可将任何网页转变为功能完备的可视化编辑器。点击浏览器图标激活，即可在当前页面上叠加专业编辑工具栏，支持元素选择、变换、标注、AI 对话、多页面管理、设计系统管理等操作。

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

- **9 种标注类型**：箭头、矩形、文字、测量、便签、编号、画笔、马赛克、区域
- **状态管理**：待处理 / 进行中 / 已解决
- **PRD 增强**：模块标签、优先级（高/中/低）、需求类型、验收标准
- **页面级隔离**：标注按 pageId 过滤，切页自动切换
- **3 种显示模式**：完整 / 紧凑 / 隐藏
- **导出格式**：Markdown / JSON / PRD（含需求规格模板）/ Copilot JSON
- **导入格式**：Copilot JSON / 扁平 JSON / 功能列表
- **HTML 嵌入**：导出时将标注数据嵌入 HTML（script 标签 + HTML 注释）

### 画布功能

- **无限画布**：平移 + 缩放（鼠标滚轮 / 触摸板）
- **智能参考线**：红色边缘对齐 + 绿色中心对齐 + 距离标注
- **自动吸附**：5px 阈值自动吸附对齐

### 页面管理（v1.2）

Axure 风格的多页面管理器，支持在浏览器中快速切换管理多个页面：

- **树形目录**：文件夹 + 页面分层显示，展开/折叠切换
- **新建**：创建页面或文件夹，支持在指定文件夹内新建
- **导入**：导入单个/多个 HTML 文件，或导入整个文件夹目录
- **目录自动构建**：文件夹导入时自动按目录结构创建文件夹层级
- **右键菜单**：重命名、删除、新建子页面/子文件夹
- **拖拽排序**：拖拽页面到文件夹中，或拖拽调整顺序
- **双击重命名**：双击页面名直接进入编辑
- **搜索过滤**：即时搜索页面名或文件夹名
- **页面切换**：点击页面项切换画布内容，当前页面蓝色高亮

### AI 助手（v1.2 → v1.5）

内建 AI 对话助手，支持分析当前页面、生成代码修改建议：

- **多会话管理**：左侧会话列表，独立消息历史
- **Markdown 渲染**：代码块（含语言标识 + 复制按钮）、标题、列表、引用、粗体
- **消息操作**：复制、重新生成、删除
- **上下文感知**：自动附加选中元素、标注、变更等上下文
- **Token 统计**：侧栏底部显示累计输入/输出/请求统计
- **多 Provider**：支持 Claude (Anthropic) 和 OpenAI 兼容 API
- **快捷键**：Enter 发送 / Shift+Enter 换行 / Ctrl+L 清空对话
- **自动增高输入框**：textarea 根据内容动态调整高度
- **8 条 AI 指令**（v1.5）：select / setStyle / annotate / insertHTML / replaceHTML / applyToken / batchStyle / removeElement
- **设计系统集成**（v1.5）：systemPromptExtra 注入活跃设计系统元信息
- **对话导出**（v1.5）：导出完整对话为 Markdown 文件

### 设计系统管理（v1.3 → v1.5）

- **6 套预设设计系统**：Ant Design Pro / TDesign / Element Plus / Arco Design / Semi Design / shadcn/ui
- **每套含完整 Token**：颜色（含暗色主题） / 排版 / 间距 / 圆角 / 阴影
- **aliasMap 映射**：每套设计系统原始 CSS 变量 → `--cc-*` 标准命名空间
- **自动检测**：`detectSystem(html)` 从 HTML 自动识别使用的设计系统
- **本地文件导入**：支持 CSS / JSON / Markdown 三种格式
- **Token 导出**：导出为 CSS 或 JSON
- **设计审计**（v1.5）：检测画布元素与活跃设计系统的偏差，输出合规度报告

### 面板系统

| 面板 | 位置 | 内容 |
|------|------|------|
| 页面面板 | 左侧 | Axure 风格树形目录、文件夹管理、导入导出 |
| 图层面板 | 左侧 | 元素列表、可见性、锁定、拖拽排序 |
| 组件面板 | 左侧 | 预置组件库（按钮/卡片/表单/导航等） |
| AI 助手 | 右侧 | 多会话对话、Markdown 渲染、上下文感知 |
| 属性面板 | 右侧 | 9 组可折叠属性编辑器 |
| 变更面板 | 右侧 | 操作历史、筛选、AI 提示词生成 |
| 标注面板 | 右侧 | 9 种标注工具、标注列表、筛选、Copilot 导入导出 |
| 备注面板 | 右侧 | 统一备注 & 标注视图、页面过滤、HTML 嵌入导出 |
| 样式面板 | 右侧 | Design Token 提取、6 套预设、导入/导出 |

### 高级功能

- **AI 对话**：Claude / OpenAI 兼容 API，多会话、Markdown、8 条执行指令
- **Design Token**：从页面提取设计变量（颜色/字体/间距），支持 6 套预设 + 本地导入/导出
- **设计审计**：检测画布元素与活跃设计系统的偏差
- **DOM 对比**：两个版本间的 DOM 差异可视化
- **版本管理**：快照、差异对比、版本存储
- **页面加载**：HTML / 图片 / 存档文件加载
- **导出引擎**：导出为 HTML（含标注嵌入）/ PNG / Markdown
- **设置中心**：项目信息（含设计系统/框架）、AI 配置（含 systemPromptExtra）、导出偏好、标注默认值

## 技术架构

```
CollabCanvas/
├── manifest.json              # Chrome Extension Manifest V3
├── content.js                 # 扩展注入入口
├── main.js                    # 独立版入口（~1,950 行）
├── demo.html                  # 演示页面
│
├── core/                      # 核心基础设施
│   ├── event-bus.js           #   事件总线（发布/订阅）
│   ├── state.js               #   状态管理器（batch API）
│   ├── persistence.js         #   持久化（chrome.storage）
│   ├── ai-client.js           #   AI API 客户端（Claude/OpenAI）
│   ├── keyboard.js            #   键盘快捷键处理器
│   └── mode-machine.js        #   模式状态机（select/pan/text/annotate）
│
├── engine/                    # 编辑引擎（15 模块）
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
│   ├── annotation-exporter.js #   标注导出引擎（Markdown/JSON/PRD/Copilot）
│   ├── export-engine.js       #   导出引擎（HTML/PNG）
│   ├── dom-utils.js           #   DOM 工具函数
│   └── text-edit.js           #   文本编辑器
│
├── canvas/                    # 画布系统
│   ├── infinite-canvas.js     #   无限画布（平移/缩放/动画）
│   └── canvas-wrapper.js      #   画布包装器
│
├── annotation/                # 标注系统
│   ├── annotator.js           #   标注数据管理（CRUD + pageId）
│   ├── renderer.js            #   标注渲染器（9 种类型）
│   ├── tools.js               #   标注工具集（箭头/矩形/文字/测量/便签/编号/画笔/马赛克/区域）
│   └── annotation-importer.js #   标注导入器（Copilot/扁平/功能列表）
│
├── compare/                   # 对比引擎
│   ├── compare-engine.js      #   页面对比核心
│   └── dom-differ.js          #   DOM 差异算法
│
├── tokens/                    # Design Token 系统
│   ├── extractor.js           #   Token 提取器
│   ├── tokenizer.js           #   Token 管理器
│   ├── importer.js            #   Token 导入器（委托 CCDesignSystems）
│   ├── design-systems.js      #   6 套预设设计系统 + 本地导入/导出
│   └── design-audit.js        #   设计审计（偏差检测 + 合规度报告）
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
│   └── proxy.js               #   跨域代理（扩展模式）
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
│   ├── settings-dialog.js     #   设置对话框（4 标签页）
│   └── tabs/                  #   面板标签页
│       ├── layers-tab.js      #     图层
│       ├── components-tab.js  #     组件
│       ├── properties-tab.js  #     属性
│       ├── changes-tab.js     #     变更
│       ├── notes-annotations-tab.js  # 备注 & 标注（统一视图 + 嵌入导出）
│       ├── annotations-tab.js #     标注详情（9 工具 + 导入导出）
│       ├── styles-tab.js      #     样式（6 预设 + Token 管理）
│       ├── pages-tab.js       #     页面管理（Axure 风格树形）
│       ├── ai-tab.js          #     AI 助手（8 指令 + 多会话）
│       └── versions-tab.js    #     版本
│
├── styles/
│   └── collabcanvas.css       #   全局样式（~1,700 行）
│
├── background/
│   └── service-worker.js      #   Chrome Service Worker
│
├── lib/
│   └── html2canvas.min.js     #   第三方库
│
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### 设计原则

1. **零构建**：纯 JavaScript，无 Node.js / Webpack / Babel 依赖
2. **模块化**：66 文件，13 目录，按职责分层
3. **事件驱动**：所有模块通过 EventBus 通信，松耦合
4. **依赖注入**：构造函数参数显式传递依赖
5. **双模式运行**：Chrome Extension 注入 + 独立 HTML 页面
6. **可序列化**：undo 栈存储序列化引用，避免 DOM 引用泄漏

### 模块加载顺序

扩展模式下，`content.js` 按 8 层依赖顺序依次加载约 66 个 JS 文件：

```
Layer 0: EventBus, DomUtils, Persistence（无依赖）
Layer 1: State（依赖 Layer 0）
Layer 2: Canvas（依赖 Layer 1）
Layer 3: Engine Core（依赖 Layer 0-2）
Layer 4: UndoRedo, Export（依赖 Layer 3）
Layer 5: ModeMachine, Keyboard, UI（依赖 Layer 4）
Layer 6: Annotation, Tokens, Compare, AI Client, Loader, Proxy（Phase 2-3）
Layer 7: Version, Pages Tab, AI Tab, Versions Tab（Phase 3）
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

### 配置 AI 助手

1. 点击工具栏设置图标（齿轮） → 「AI 配置」标签页
2. 选择 Provider（Claude / OpenAI / 自定义）
3. 填写 API Key、端点 URL、模型名
4. 点击「测试连接」验证配置
5. 回到右侧「AI」标签页开始对话

### 切换扩展开关

- 再次点击浏览器图标 → 关闭编辑器（调用 `shutdown()` 清理所有资源）

## 项目统计

| 指标 | 数量 |
|------|------|
| JS 源文件 | 66 |
| 总代码行数 | ~20,000（JS）+ ~1,700（CSS） |
| 目录数 | 13 |
| 第三方依赖 | 1（html2canvas） |
| Chrome 权限 | 4（activeTab, downloads, scripting, storage） |

## 版本历史

### v1.5 — Product Copilot 深度集成

**设计系统增强**（`tokens/design-systems.js`）：

- 6 套设计系统各增加 `aliasMap` 映射（原始 CSS 变量 → `--cc-*`）
- `detectSystem(html)` 自动识别 HTML 使用的设计系统（加权评分）
- `getAliasMap(id)` 获取指定系统的别名映射

**AI 指令扩展**（`ui/tabs/ai-tab.js`，+350 行）：

- 8 条执行指令：select / setStyle / annotate / insertHTML / replaceHTML / applyToken / batchStyle / removeElement
- `systemPromptExtra` 注入活跃设计系统元信息到 AI system prompt
- 对话导出为 Markdown 文件

**标注桥接**（`engine/annotation-exporter.js` + `annotation/annotation-importer.js`）：

- `toCopilotFormat()` 导出为 Product Copilot 格式（CSS selector 定位）
- `_buildSelector()` 标注坐标 → CSS 选择器转换
- `importCopilotFormat()` 从 Copilot 格式导入（CSS selector → 坐标）
- 3 种导入格式：Copilot JSON / 扁平 JSON / 功能列表

**页面级标注隔离**：

- 标注数据模型新增 `pageId` 和 `target` 字段
- 页面切换自动设置 `annotations.currentPageId`
- 标注面板和备注面板均按 pageId 过滤

**备注模块增强**（`ui/tabs/notes-annotations-tab.js`）：

- 新增添加备注、导入、嵌入导出按钮
- `_openAddNoteDialog()` 直接添加带 pageId 的便签备注
- `_openImportDialog()` 支持 3 种格式导入
- `_exportWithEmbed()` 导出时嵌入标注数据到 HTML（script 标签 + HTML 注释）

**设计审计**（`tokens/design-audit.js`，新增 ~210 行）：

- `audit(options)` 扫描画布元素，检测颜色/圆角/阴影与活跃 Token 的偏差
- 输出偏差列表 + 合规度报告（按属性和严重程度分组）

**设置增强**（`ui/settings-dialog.js`）：

- 项目信息新增：设计系统、技术框架、功能摘要
- AI 配置新增：System Prompt 附加文本
- `_defaults()` 新增 `designSystem` / `framework` / `featureSummary` / `systemPromptExtra` 字段

**一致性修复**：

- 标注工具列表从 7 → 9 种（新增 mosaic + region）
- `toolColors` 映射增加 `region: '#722ed1'`
- `AnnotationRenderer` 新增 `_renderRegion()` 方法（虚线矩形 + 标签）
- `AnnotationTools` 新增 region 工具的拖拽创建逻辑
- `AnnotationExporter` 构造函数接收 state 参数，`toCopilotFormat()` 使用正确的数据源
- `buildStructuredData()` 输出包含 `pageId` 和 `target` 字段

### v1.4 — 设计系统集成 + 本地文件导入

**设计系统引擎**（`tokens/design-systems.js`，新增 ~900 行）：

- 6 套预设设计系统数据（Ant Design Pro / TDesign / Element Plus / Arco Design / Semi Design / shadcn/ui）
- 每套含：colors / typography / spacing / radius / shadows + dark mode overrides
- `CCDesignSystems` 类：listSystems / getTokens / applySystem / clearActive
- 本地导入：`parseCSS()` / `parseJSON()` / `parseMarkdown()` / `importAuto()`
- 导出：`exportCSS()` / `exportJSON()`

**Token 导入器改造**（`tokens/importer.js`）：

- 委托 CCDesignSystems 查询预设（6 套 + 内嵌 3 套）
- 新增 `importAuto(text, filename)` 自动检测格式并解析
- 新增 `importAxhub(json)` 解析 Axhub theme.json 格式

**样式面板改造**（`ui/tabs/styles-tab.js`）：

- 3 个硬编码预设按钮 → 动态 2 列预设网格（6 内置 + 自定义导入）
- 工具栏增加导入（CSS/JSON/MD）+ 导出（CSS/JSON）+ 清除按钮
- Token 计数徽章 + 活跃系统标识

### v1.3 — Design Token 系统

**Token 提取与管理**：

- `tokens/extractor.js` — 从页面 CSS 提取设计变量
- `tokens/tokenizer.js` — Token 管理器（CRUD + apply/remove）
- `tokens/importer.js` — 3 套内嵌预设（Ant Design / Tailwind / Element Plus）
- `ui/tabs/styles-tab.js` — 样式面板（Token 提取 + 预设 + 管理）

### v1.2 — Pages Tab 重写 + AI Tab 重写

**页面管理模块**（`ui/tabs/pages-tab.js` 完全重写，455→616 行）：

- Axure 风格树形目录替代原扁平列表
- 支持 `type: 'page' | 'folder'` 树形数据模型
- 文件夹展开/折叠、拖拽排序/移动到文件夹
- 文件夹导入自动构建目录层级（`_ensureFolder` 递归）
- 右键上下文菜单、双击重命名、搜索过滤
- 紧凑工具栏布局（图标按钮 + 内联搜索框）

**AI 助手模块**（`ui/tabs/ai-tab.js` 完全重写，347→665 行）：

- 多会话管理（创建/切换/清空），状态持久化
- 轻量 Markdown 渲染器（代码块/标题/列表/引用/粗体/行内代码）
- 代码块复制按钮、消息复制/重新生成/删除
- 三点动画"思考中"指示器
- Auto-resize 输入框（40-200px）
- 上下文标签（选中元素/标注/变更，可移除）
- Token 统计（输入/输出/请求次数）

**appFacade 重写**（`main.js` 核心方法，~180 行）：

- 树形数据模型支持（type/parentId/order/expanded）
- 新增 `addFolder`、`toggleFolder`、`moveNode` 方法
- `importPages` 支持从 `webkitRelativePath` 自动构建文件夹树

### v1.1 — Phase 1 修复

P0 级内存和正确性修复（372 行新增，106 行修改）：

| 问题 | 修复 |
|------|------|
| undo 栈持有 DOM 引用导致内存泄漏 | `_serializeValue()` 将 HTMLElement 替换为 `{__ccRef, id}` |
| State.get() 返回可变引用 | annotator/tokenizer 改用 `concat/slice` 不可变操作 |
| shutdown() 不清理 69 处事件订阅 | EventBus.destroy() + tab.destroy() + DOM removeEventListener |
| 动画每帧 3 次 state:changed | batch API 延迟发射，合并为单次事件 |
| 变更栈无上限 | 添加 `_maxChanges = 100` 栈限制 |

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
selection:changed          — 选择变化
annotation:created         — 标注创建
annotation:updated         — 标注更新
annotation:removed         — 标注删除
annotation:tool-complete   — 标注工具绘制完成
annotation:select          — 标注选中
annotation:delete-request  — 标注删除请求
annotation:cycle-status    — 标注状态轮转
annotation:import-request  — 标注导入请求
element:created            — 元素创建
property:change            — 属性变更
history:recorded           — 变更记录
history:cleared            — 历史清空
layer:reorder              — 图层排序
layer:visibility           — 图层可见性
layer:lock                 — 图层锁定
state:changed              — 状态变更（支持 batch 模式）
page:added                 — 页面/文件夹创建
page:switched              — 页面切换
page:deleted               — 页面/文件夹删除
page:imported              — 页面导入完成
page:toggled               — 文件夹展开/折叠
page:moved                 — 节点拖拽移动
token:updated              — Token 更新
token:load-preset          — 加载设计系统预设
token:export               — 导出 Token
token:clear                — 清除活跃设计系统
design:audit               — 设计审计请求
design:detect-system       — 自动检测设计系统
```

### 状态结构

```javascript
state.canvas                     // 画布 DOM 引用
state.selected                   // 当前选中元素
state.changes                    // 变更历史数组
state.get('annotations.list')    // 标注列表（含 pageId/target）
state.get('annotations.currentTool')   // 当前标注工具
state.get('annotations.currentPageId') // 当前页面标注过滤 ID
state.get('settings')            // 编辑器设置
state.get('settings.project')    // 项目信息（含 designSystem/framework/featureSummary）
state.get('settings.ai')         // AI 配置（provider/apiKey/endpoint/model/systemPromptExtra）
state.get('settings.ai.conversations')  // AI 会话列表
state.get('settings.ai.tokenUsage')     // AI token 统计
state.get('settings.activeDesignSystem') // 活跃设计系统 ID
state.get('settings.designProfile')     // 设计 Profile（colors/fontSizes/fontFamilies/spacing）
state.get('pages.list')          // 页面/文件夹树（扁平数组 + parentId）
state.get('tokens')              // Design Token（colors/typography/spacing/shadows/radius）
state.get('canvas.zoom')         // 缩放级别
state.get('canvas.panX/panY')    // 平移偏移
```

### 页面树数据模型

```javascript
// pages.list 是扁平数组，每个节点通过 parentId 构建树
{
  id: 'page-xxxx',           // 唯一标识
  type: 'page' | 'folder',   // 节点类型
  name: '登录页',            // 显示名称
  parentId: 'folder-xxxx',   // 父节点 ID（null 表示根级）
  order: 1,                  // 同级排序
  html: '<div>...</div>',    // 页面内容（仅 type='page'）
  thumbnail: 'data:...',     // 缩略图（仅 type='page'）
  expanded: true,            // 展开/折叠（仅 type='folder'）
  updatedAt: 1717300000000   // 最后更新时间
}
```

### 标注数据模型

```javascript
{
  id: 'ann-xxxx',            // 唯一标识
  type: 'rect',              // 标注类型（arrow/rect/text/measure/sticky/number/brush/mosaic/region）
  x: 100, y: 200,            // 位置坐标
  w: 300, h: 150,            // 尺寸
  text: '按钮位置偏移',      // 文字内容
  color: '#1677ff',          // 颜色
  status: 'pending',         // 状态（pending/in-progress/resolved）
  pageId: 'page-xxxx',       // 所属页面 ID
  target: '.btn-submit',     // CSS 选择器目标（Copilot 格式）
  module: '登录模块',        // 所属模块
  priority: 'high',          // 优先级（high/medium/low）
  requirementType: 'functional', // 需求类型
  acceptanceCriteria: '...', // 验收标准
  requirementId: 'REQ-001',  // 需求 ID
  timestamp: 1717300000000   // 创建时间
}
```

## 浏览器兼容性

- Chrome 88+（Manifest V3 要求）
- Edge 88+（Chromium 内核）

## 许可证

MIT License
