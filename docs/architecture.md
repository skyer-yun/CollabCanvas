# CollabCanvas 架构设计文档

## 1. 系统概述

CollabCanvas 是一个零构建、纯 JavaScript 的网页可视化编辑器，以 Chrome Extension 形式分发。核心设计目标：

- **零侵入**：不修改原始 DOM 结构，通过 overlay 方式叠加编辑界面
- **零依赖**：无 Node.js / Webpack / Babel，直接浏览器运行
- **可切换**：点击图标激活/关闭，shutdown 清理所有资源
- **AI 增强**：内建 AI 对话助手，支持多 Provider 和多会话
- **设计智能**：AI 消费项目设计系统 Token，输出自动替换硬编码值
- **多页面管理**：Axure 风格树形目录，支持文件夹导入和画布切换

## 2. 架构分层

```
┌─────────────────────────────────────────────┐
│                UI Layer (ui/)                │
│  Shell → Toolbar → Panels → Tabs → Modal    │
│  Pages Tab (树形目录) / AI Tab (多会话)      │
├─────────────────────────────────────────────┤
│         Design Intelligence (v1.3)           │
│  TokenExtractor → ProfileExtractor →         │
│  DesignPromptBuilder → OutputSanitizer       │
├─────────────────────────────────────────────┤
│             Engine Layer (engine/)           │
│  Selection → Transform → Align → Group      │
│  Clipboard → ZOrder → UndoRedo → Export     │
├─────────────────────────────────────────────┤
│            Annotation (annotation/)          │
│  Annotator → Renderer → Tools               │
├─────────────────────────────────────────────┤
│              Canvas (canvas/)                │
│  InfiniteCanvas → CanvasWrapper              │
├─────────────────────────────────────────────┤
│           Foundation (core/)                 │
│  EventBus → State → Persistence → Mode       │
│  AIClient (Claude/OpenAI)                    │
└─────────────────────────────────────────────┘
```

## 3. 核心机制

### 3.1 事件总线（EventBus）

所有模块通过共享的 EventBus 实例通信，支持发布/订阅模式：

```javascript
// 订阅
bus.on('selection:changed', handler);

// 发布
bus.emit('selection:changed', { action: 'select', element: el });

// 清理
bus.off('selection:changed', handler);
bus.destroy();  // 清空所有订阅
```

### 3.2 状态管理（StateManager）

集中式状态管理，支持路径访问和批量更新：

```javascript
// 读取
state.get('annotations.list');
state.get('canvas.zoom');
state.get('settings.ai');           // AI 配置
state.get('pages.list');            // 页面树

// 写入（自动触发 state:changed 事件）
state.set('canvas.zoom', 1.5);

// 批量写入（延迟触发，合并为单次事件）
state.batch()
  .set('canvas.zoom', 1.5)
  .set('canvas.panX', 100)
  .set('canvas.panY', 200)
  .endBatch();
```

### 3.3 模式状态机（ModeMachine）

管理编辑器的交互模式切换：

```
select ⇄ pan ⇄ text ⇄ annotate
```

每种模式决定鼠标/键盘事件的响应行为。

### 3.4 变更追踪（ChangeTracker）

记录所有编辑操作，支持序列化存储：

```javascript
// 自动记录（通过 bus.emit('history:recorded')）
tracker.record({ selector, prop, oldVal, newVal });

// 序列化：HTMLElement → { __ccRef: true, id: 'xxx' }
tracker._serializeValue(val);

// 栈上限：100 条，超出自动 shift
```

### 3.5 撤销/重做（UndoRedoManager）

支持 12 种操作类型的完整撤销/重做：

| 类型 | 撤销行为 |
|------|----------|
| css | 恢复原始 style 属性 |
| move | 恢复原始 left/top |
| resize | 恢复原始 width/height |
| rotate | 恢复原始 transform |
| text | 恢复原始 textContent |
| delete | 重新插入到原始父节点 |
| insert | 移除插入的元素 |
| duplicate | 移除复制的元素 |
| group | 解包分组容器 |
| ungroup | 重新打包 |
| zindex | 恢复原始 z-index |
| align | 恢复对齐前的位置 |

### 3.6 AI 客户端（AIClient）

统一的 AI API 客户端，支持 Claude (Anthropic) 和 OpenAI 兼容 Provider：

```javascript
// 初始化
var aiClient = new AIClient(state, bus, proxy);

// 检查配置
aiClient.isConfigured();

// 单次对话
var result = await aiClient.chat(messages, { maxTokens: 2048 });
// → { content: '...', usage: { input_tokens: 100, output_tokens: 50 } }

// 带历史的多轮对话
aiClient.sendMessage('分析这个页面');
// → 自动追加到内部 history

// 一次性提示（不保留历史）
aiClient.prompt(systemPrompt, userPrompt);
```

**双模式请求**：
- 扩展模式：通过 `CCProxyHelper` 的 background script 代理请求（绕 CORS）
- 独立模式：直接 `fetch()`（需要 API 端点支持 CORS）

**响应解析**：
- Claude 格式：提取 `content[0].text` + `usage`
- OpenAI 格式：提取 `choices[0].message.content` + `usage`

### 3.7 页面管理（appFacade）

树形数据模型的多页面管理器，支持文件夹和页面分层：

```javascript
// 数据模型：扁平数组 + parentId 构建树
{
  id: 'page-xxxx',           // 唯一标识
  type: 'page' | 'folder',   // 节点类型
  name: '登录页',
  parentId: 'folder-xxxx',   // 父节点 ID（null = 根级）
  order: 1,                  // 同级排序
  html: '<div>...</div>',    // 页面 HTML（仅 page）
  thumbnail: 'data:...',     // 缩略图（仅 page）
  expanded: true,            // 展开/折叠（仅 folder）
  updatedAt: 1717300000000
}
```

**核心方法**：
- `addPage(name, parentId)` — 新建页面并切换画布
- `addFolder(name, parentId)` — 新建文件夹
- `switchPage(id)` — 保存当前页 → 加载目标页 → 重置 undo/selection
- `toggleFolder(id)` — 展开/折叠文件夹
- `moveNode(nodeId, newParentId, order)` — 拖拽移动节点
- `deletePage(id)` — 递归删除节点及所有后代
- `importPages(files)` — 读取文件，自动构建目录树
- `renamePage(id, name)` — 重命名节点

**画布切换流程**：
```
_saveCurrentToPage()     // 保存当前画布 innerHTML + 缩略图到 page.html
→ _loadPageToCanvas(target)  // 清空画布 → 填入目标 HTML → 重置 selection/undo
→ appFacade.currentPage = id
→ bus.emit('page:switched')
```

**文件夹导入算法**（`_ensureFolder`）：
```
对每个文件的 webkitRelativePath（如 "模块A/子模块/登录.html"）：
  1. 拆分路径：["模块A", "子模块"]
  2. 逐层查找或创建文件夹节点
  3. 将页面挂载到最终文件夹下
```

### 3.8 设计智能（Design Intelligence，v1.3）

AI 输出与项目设计系统对齐的三阶段管道，灵感来自 Axhub Make 的"主题即数据"模式。

```
导入页面 ──→ Stage 1: 提取 ──→ Stage 2: 注入 ──→ Stage 3: 清理
             (Profile)         (Prompt)          (Sanitize)
```

**Stage 1 — 设计特征提取**（`main.js` → `_extractDesignProfile`）

```javascript
// 导入 HTML 时异步执行
_extractDesignProfile(allHtml)
  → querySelectorAll('[style]')   // 最多 500 个元素
  → 按频率统计颜色/字号/字体/间距
  → top N 排序
  → state.set('settings.designProfile', profile)

// 数据结构
{
  colors: [{value: '#1677ff', count: 12}, ...],    // top 8
  fontSizes: [{value: '14px', count: 20}, ...],    // top 6
  fontFamilies: [{value: '"PingFang SC"', count: 15}, ...], // top 4
  spacing: [{value: '16px', count: 30}, ...]       // top 6
}
```

**Stage 2 — 设计 Token 注入**（`ai-tab.js` → `_buildDesignPrompt`）

```javascript
// 每次发送消息时执行
_buildDesignPrompt()
  → _extractDesignTokens()         // 读取 :root 的 15+ CSS 变量
  → state.get('settings.designProfile')  // 读取导入页面的风格特征
  → 拼接为结构化 prompt:
      ## 设计系统 Token
      - --cc-primary: #1677ff
      - --cc-radius-md: 6px
      ...
      ## 项目风格参考
      - #1a1a1a (使用 25 次)
      ...

// 注入点：system prompt 末尾
systemPrompt = '...命令列表...' + designPrompt;
```

**Stage 3 — 输出质量清理**（`ai-tab.js` → `_sanitizeDesignOutput`）

```javascript
// AI 响应返回后执行
_sanitizeDesignOutput(result.content)
  → _buildTokenMap()               // 构建反向映射: #1677ff → var(--cc-primary)
  → 仅在 ``` 代码块内替换
  → 非代码块 prose 不受影响

// 效果
// 输入: background: #1677ff; color: #52c41a;
// 输出: background: var(--cc-primary); color: var(--cc-success);
```

**方法清单**（4 个，均在 `AITab.prototype` 上）：

| 方法 | 位置 | 功能 |
|------|------|------|
| `_extractDesignTokens()` | ai-tab.js | 从 `:root` computed style 读取 CSS 变量 |
| `_buildDesignPrompt()` | ai-tab.js | 合并 Token 表 + designProfile 为 prompt 段落 |
| `_buildTokenMap()` | ai-tab.js | 构建计算值→变量名反向映射（rgb + hex 双格式） |
| `_sanitizeDesignOutput(text)` | ai-tab.js | 后处理代码块，替换硬编码值为 var() |

**辅助函数**（1 个，IIFE 内部）：

| 函数 | 位置 | 功能 |
|------|------|------|
| `_extractDesignProfile(html)` | main.js | 从 HTML 提取颜色/字号/字体/间距频率 |

## 4. UI 架构

### 4.1 布局结构

```
┌──────────────────────────────────────────┐
│              Toolbar                      │
├──────┬───────────────────────┬───────────┤
│ Left │                       │  Right    │
│Panel │     Viewport          │  Panel    │
│      │   (Infinite Canvas)   │           │
│ 页面  │                       │  AI助手   │
│ 图层  │                       │  属性     │
│ 组件  │                       │  标注     │
│      │                       │  变更     │
├──────┴───────────────────────┴───────────┤
│              Statusbar                    │
└──────────────────────────────────────────┘
```

### 4.2 面板标签页

**左侧面板**（240-280px）：
- 页面（Pages）— Axure 风格树形目录，文件夹/页面管理，导入
- 图层（Layers）— 元素列表、可见性、锁定、拖拽排序
- 组件（Components）— 预置组件库

**右侧面板**（280-320px）：
- AI 助手（AI）— 多会话、Markdown 渲染、上下文感知
- 属性（Properties）— 9 组可折叠属性编辑器
- 标注（Annotations）— 标注详情管理
- 备注 & 标注（Notes & Annotations）— 统一标注视图
- 样式（Styles）— Design Token 管理
- 变更（Changes）— 操作历史 + AI 提示词

### 4.3 AI Tab 结构

```
.cc-ai-tab
├── .cc-ai-sidebar (180px, 可折叠)
│   ├── .cc-ai-new-btn (+ 新对话)
│   ├── .cc-ai-history (会话列表)
│   └── .cc-ai-sidebar-footer (Token 统计)
└── .cc-ai-main
    ├── .cc-ai-header (模型名 + 折叠 + 清空)
    ├── .cc-ai-messages
    │   ├── .cc-ai-msg.user (蓝色气泡, 右对齐)
    │   ├── .cc-ai-msg.assistant (灰色气泡, 左对齐, Markdown)
    │   └── .cc-ai-msg.system (淡灰胶囊, 居中)
    ├── .cc-ai-context-chips (上下文标签)
    └── .cc-ai-composer (Auto-resize textarea + 发送)
```

### 4.4 Pages Tab 结构

```
.cc-pages-tab
├── .cc-pages-toolbar (图标按钮 + 搜索, 单行)
└── .cc-pages-tree
    ├── .cc-tree-row.cc-tree-folder (缩进 + 箭头 + 文件夹图标 + 名称 + 计数)
    ├── .cc-tree-row.cc-tree-page (缩进 + 页面图标 + 名称 + 操作)
    │   ├── .cc-tree-active (当前页面蓝色高亮)
    │   └── .cc-tree-actions (悬停显示: 重命名/删除)
    └── .cc-pages-empty (空状态)
```

### 4.5 属性编辑器分组

属性面板包含 9 个可折叠分组：

1. 元素信息（标签、ID、路径）
2. 排版（字体、字号、字重、对齐、行高、颜色）
3. 间距（margin × 4 + padding × 4）
4. 外观（背景色、透明度、溢出、光标）
5. 布局（display、position、flex 相关）
6. 位置尺寸（top/right/bottom/left/width/height）
7. 变换（rotate、scale）
8. 边框（颜色、样式、宽度、圆角）
9. 背景（颜色、图片、尺寸、位置、重复）

## 5. 双模式运行

### Chrome Extension 模式

```
用户点击图标 → service-worker.js → chrome.scripting.executeScript
→ content.js 注入 → 顺序加载 60 个 JS 文件 → main.js 初始化
```

### 独立 HTML 模式

```html
<!-- demo.html 中直接引用所有模块 -->
<link rel="stylesheet" href="styles/collabcanvas.css">
<script src="core/event-bus.js"></script>
<script src="core/ai-client.js"></script>
<!-- ... 其他模块 ... -->
<script src="main.js"></script>
```

### AI 请求的跨域处理

| 模式 | 请求方式 | CORS |
|------|----------|------|
| Chrome Extension | background script 代理 | 不受限制 |
| 独立 HTML | 直接 fetch() | 需 API 端点支持 CORS |

## 6. 数据持久化

使用 `chrome.storage.local` 存储以下数据：

- 标注数据（annotations.list）
- 编辑器设置（settings）
- AI 配置与会话（settings.ai.*）
- 设计特征（settings.designProfile）
- 页面树（pages.list）
- 画布状态（zoom、panX、panY）
- Design Token
- 版本快照

持久化触发：`state:changed` 事件 → debounce 500ms → 写入 chrome.storage。

## 7. 性能优化

### 已实施的优化

1. **Batch 事件合并**：画布动画中连续 set 调用合并为单次 state:changed
2. **Identity check**：`state.set()` 跳过值未变化的更新
3. **序列化存储**：undo 栈不持有 DOM 引用，避免内存泄漏
4. **栈上限**：变更历史限制 100 条，防止无限增长
5. **Debounce 微调**：方向键微调操作 debounce 合并为单次 undo 记录
6. **AI 超时控制**：30s 超时 + 429 自动重试（1 次，延迟 2s）
