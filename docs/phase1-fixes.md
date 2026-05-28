# CollabCanvas Phase 1 — P0 内存 + 正确性修复

## 修复日期

2026-05-28

## 问题总览

初始代码审查发现 4 个 P0 级问题，影响内存安全、数据一致性和运行稳定性。

### P0-1: Undo 栈持有 DOM 引用导致内存泄漏

**问题**：`ChangeTracker` 的变更栈直接存储 `HTMLElement` 引用（如 `entry.oldVal.element`、`entry.newVal.element`）。即使元素已从 DOM 删除，undo 栈仍持有引用，导致 DOM 节点无法被 GC 回收。长时间使用后堆内存持续增长。

**修复**：

- `engine/change-tracker.js`：新增 `_serializeValue(val)` 方法
  - 将 `HTMLElement` 替换为 `{ __ccRef: true, id: el.id }`
  - 数组中 `item.element` 同样序列化
  - 其他值（数字/字符串）原样保留
- `engine/undo-redo.js`：新增 `_resolveElement(ref)` 和 `_resolveParent(data)`
  - 撤销/重做时通过 `document.getElementById()` 恢复元素引用
  - 向后兼容旧格式（直接存储 HTMLElement 的条目）
- `engine/clipboard.js`：剪切操作改用 `parentId` + `parentPath`
- `main.js`：删除操作使用序列化格式存储恢复数据

**涉及文件**：`change-tracker.js`、`undo-redo.js`、`clipboard.js`、`main.js`

### P0-2: State.get() 返回可变引用导致变更检测失效

**问题**：`state.get('annotations.list')` 返回数组引用，模块直接调用 `.push()` / `.splice()` 修改同一引用。`state.set()` 的 identity check（`old === value`）始终为 `true`，导致变更事件不触发。

**修复**：

- `annotation/annotator.js`：
  - `create()` 改用 `list.concat([annotation])` 创建新数组
  - `update()` 改用 `list.slice()` + 新对象替换
- `tokens/tokenizer.js`：
  - `add()` 改用 `list.concat([token])`
  - `remove()` 改用 `list.slice()` + splice
  - `update()` 改用 `list.slice()` + 新对象

**涉及文件**：`annotator.js`、`tokenizer.js`

### P0-3: shutdown() 不清理事件订阅

**问题**：编辑器关闭时未解绑 69 处事件订阅（总线订阅 + DOM addEventListener），导致：
- 关闭后重新打开，旧订阅仍然触发（重复处理）
- 闭包持有 DOM 引用，阻止 GC 回收
- 控制台报错（已销毁的元素上操作）

**修复**：

- `core/event-bus.js`：新增 `destroy()` 方法，清空所有监听器
- `main.js`：
  - 7 处 DOM addEventListener 提取为命名方法（`CC._domHandlers`）
  - shutdown 中逐一 removeEventListener
  - 添加 canvas.destroy()、clipboard.destroy()、所有 tab.destroy()
  - 清理 `_persistTimer`
- 4 个 tab 模块：存储处理器引用，新增 `destroy()` 方法
  - `layers-tab.js`：3 个 bus.on → destroy 中 bus.off
  - `properties-tab.js`：1 个 bus.on → destroy 中 bus.off
  - `changes-tab.js`：1 个 bus.on → destroy 中 bus.off
  - `notes-annotations-tab.js`：4 个 bus.on → destroy 中 bus.off

**涉及文件**：`event-bus.js`、`main.js`、4 个 tab 文件

### P0-4: Canvas 动画每帧触发 3 次 state:changed

**问题**：`InfiniteCanvas` 的 `_animateTo`、`_onPanMove`、`setTransform` 在单次操作中连续调用 `state.set()` 3 次，每次都触发 `state:changed` 事件，导致持久化回调被频繁调用（3x 写入 chrome.storage）。

**修复**：

- `core/state.js`：新增 batch API
  - `batch()` — 递增 `_batchDepth`，进入批量模式
  - `endBatch()` — 递减 `_batchDepth`，到 0 时发射单个事件
  - `set()` 中添加 identity check：`if (old === value) return this`
  - batch 模式下值立即生效（保证读一致性），延迟发射事件
- `canvas/infinite-canvas.js`：3 处 batch 包裹
  - `setTransform()`：3 次 set → 1 次 state:changed
  - `_animateTo()` tick：3 次 set → 1 次 state:changed
  - `_onPanMove()`：2 次 set → 1 次 state:changed

**涉及文件**：`state.js`、`infinite-canvas.js`

## 修改统计

| 文件 | 改动类型 | 改动量 |
|------|----------|--------|
| `core/state.js` | 新增 batch API | +30 行 |
| `core/event-bus.js` | 新增 destroy() | +5 行 |
| `canvas/infinite-canvas.js` | batch 包裹 | +15 行 |
| `annotation/annotator.js` | 不可变操作 | +15 行 |
| `tokens/tokenizer.js` | 不可变操作 | +15 行 |
| `engine/change-tracker.js` | 序列化 + 栈上限 | +60 行 |
| `engine/undo-redo.js` | 元素解析重写 | +80 行 |
| `engine/clipboard.js` | 序列化适配 | +5 行 |
| `main.js` | 调用点适配 + shutdown 增强 | +100 行 |
| `ui/tabs/layers-tab.js` | destroy() | +15 行 |
| `ui/tabs/properties-tab.js` | destroy() | +10 行 |
| `ui/tabs/changes-tab.js` | destroy() | +10 行 |
| `ui/tabs/notes-annotations-tab.js` | destroy() | +15 行 |
| **合计** | | **+372 -106** |

## 验证方法

1. **State batching**：缩放画布，状态栏更新流畅，无多余闪烁
2. **Undo/Redo**：创建 5+ 元素，移动/缩放/旋转/分组操作，全部撤销再全部重做
3. **Delete 恢复**：删除元素 → Ctrl+Z → 元素回到原位
4. **栈上限**：连续操作 120 次 → 最早的 20 次操作无法撤销
5. **内存泄漏**：DevTools Memory 面板 → 100 次操作 → 堆快照 → 无 detached DOM 树累积
6. **Shutdown**：打开编辑器 → 操作 → 关闭 → 控制台无报错 → 快捷键不再响应
7. **标注 CRUD**：创建/编辑/删除标注 → 刷新页面 → 标注持久化正常
