# CollabCanvas 架构设计文档

## 1. 系统概述

CollabCanvas 是一个零构建、纯 JavaScript 的网页可视化编辑器，以 Chrome Extension 形式分发。核心设计目标：

- **零侵入**：不修改原始 DOM 结构，通过 overlay 方式叠加编辑界面
- **零依赖**：无 Node.js / Webpack / Babel，直接浏览器运行
- **可切换**：点击图标激活/关闭，shutdown 清理所有资源

## 2. 架构分层

```
┌─────────────────────────────────────────┐
│              UI Layer (ui/)              │
│  Shell → Toolbar → Panels → Tabs → Modal │
├─────────────────────────────────────────┤
│           Engine Layer (engine/)         │
│  Selection → Transform → Align → Group  │
│  Clipboard → ZOrder → UndoRedo → Export  │
├─────────────────────────────────────────┤
│          Annotation (annotation/)        │
│  Annotator → Renderer → Tools           │
├─────────────────────────────────────────┤
│            Canvas (canvas/)              │
│  InfiniteCanvas → CanvasWrapper          │
├─────────────────────────────────────────┤
│        Foundation (core/)                │
│  EventBus → State → Persistence → Mode   │
└─────────────────────────────────────────┘
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

## 4. UI 架构

### 4.1 布局结构

```
┌──────────────────────────────────────────┐
│              Toolbar                      │
├──────┬───────────────────────┬───────────┤
│ Left │                       │  Right    │
│Panel │     Viewport          │  Panel    │
│      │   (Infinite Canvas)   │           │
│ 图层  │                       │  属性     │
│ 组件  │                       │  样式     │
│      │                       │  标注     │
│      │                       │  变更     │
├──────┴───────────────────────┴───────────┤
│              Statusbar                    │
└──────────────────────────────────────────┘
```

### 4.2 面板标签页

**左侧面板**：
- 图层（Layers）— 元素列表、可见性、锁定、拖拽排序
- 组件（Components）— 预置组件库

**右侧面板**：
- 属性（Properties）— 9 组可折叠属性编辑器
- 标注（Annotations）— 标注详情管理
- 备注 & 标注（Notes & Annotations）— 统一标注视图
- 样式（Styles）— Design Token 管理
- 变更（Changes）— 操作历史 + AI 提示词

### 4.3 属性编辑器分组

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
<!-- ... 其他模块 ... -->
<script src="main.js"></script>
```

## 6. 数据持久化

使用 `chrome.storage.local` 存储以下数据：

- 标注数据（annotations.list）
- 编辑器设置（settings）
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
