# 时间轴插件

<div align="center">

[English](./README.md) | 简体中文

</div>

`@youchaoyun/plugin-timeline` 是一个 NocoBase 时间轴区块插件，用于按时间维度展示多条记录数据，适合项目节点、事件轨迹、建设过程、历史变更等场景。

当前版本支持：

- 竖向和横向两种展示方向
- 左侧、右侧、交替、上方、下方等多种布局模式
- 标题、简介、时间、节点、标题图片等字段映射
- 点击节点后打开记录详情弹窗

## 功能特性

- 支持 `Time line` 数据区块
- 支持 `字段映射`
- 支持 `展示方向` 切换
- 支持 `布局模式` 切换
  - 竖向：左侧、右侧、交替
  - 横向：上方、下方、交替
- 支持 `外观配置`
  - 轴线颜色
  - 轴线宽度
  - 节点大小
  - 节点偏移
  - 标题间距
  - 时间间距
- 支持 `数据范围` 过滤
- 支持 `默认排序`
- 支持字典颜色节点和附件图片节点
- 支持开始时间、结束时间双时间字段展示
- 支持横向时间轴滚动显示
- 支持通过 `openView` 打开记录详情

## 区块说明

插件注册了一个面向多条记录数据的时间轴区块：

- 区块名称：`Time line`
- 中文名称：`时间轴`

当区块绑定数据表后，会基于当前查询结果渲染时间轴内容。

## 效果预览

### 竖向时间轴

![竖向时间轴示例](docs/image.png)

### 横向时间轴

![横向时间轴示例](docs/image-1.png)

### 时间轴配置区域

![时间轴设置示例](docs/image-2.png)

### 1. 字段映射

用于指定时间轴展示所需的字段来源，常见字段包括：

- `标题字段`
- `标题图片字段`
- `简介字段`
- `节点字段`
- `开始时间字段`
- `结束时间字段`
- `时间格式`

说明：

- 节点字段可使用字典字段或附件字段
- 同时配置开始时间和结束时间时，会按双时间展示
- 字段映射支持 `ctx.collection.xxx` 形式变量表达式

### 2. 展示方向

可选值：

- `竖向`
- `横向`

说明：

- 竖向布局基于 Ant Design Timeline
- 横向布局为插件自定义结构

### 3. 布局模式

模式会随方向变化：

- 竖向：`左侧` / `右侧` / `交替`
- 横向：`上方` / `下方` / `交替`

### 4. 外观配置

用于控制时间轴视觉样式：

- `轴线颜色`
- `轴线宽度`
- `节点大小`
- `节点偏移`
- `标题间距`
- `时间间距`

默认外观参数：

```ts
{
  color: '#1890ff',
  lineWidth: 2,
  nodeSize: 12,
  nodePadding: -4,
  titlePadding: -7,
  timePadding: -6,
}
```

## 点击交互

插件注册了节点点击事件：

- 事件名：`itemClick`

默认内置 `popupSettings` 流程，并在点击节点时通过 `openView` 打开详情弹窗。

## 无数据源预览

如果区块尚未配置数据源，插件会使用内置假数据进行展示，方便在配置态下预览样式。

## 扩展能力

插件默认仅将 `attachment` 作为 `标题图片字段` 可选字段接口。

如果其他插件需要扩展可作为标题图片字段的接口类型，可通过客户端插件实例调用：

```typescript
// client/plugin.tsx  multipleEntryModesAttachment为想要注册的类型
   const timelinePlugin = this.app.pm.get<any>('@youchaoyun/plugin-timeline');
   timelinePlugin?.registerTimelineCoverFieldInterfaces?.(['multipleEntryModesAttachment']);
```

说明：

- 内部会自动去重
- 已注册接口会参与 `标题图片` 字段选择范围

## 依赖要求

插件声明了以下 `peerDependencies`：

- `@nocobase/client: 2.x`
- `@nocobase/server: 2.x`
- `@nocobase/test: 2.x`

## 相关文档

- 英文 README：[`README.md`](./README.md)
- 有巢数智外部文档：[https://docs.youchaoyun.com/cn/infrastructure/nocobase_plugin_extension/](https://docs.youchaoyun.com/cn/infrastructure/nocobase_plugin_extension/)

## Noco 插件交流

欢迎扫码加入 Noco 插件交流，讨论 NocoBase 插件开发、插件使用和企业级扩展实践。

![Noco 插件交流](docs/wxchat.png)

二维码如已过期，可通过下方「更多插件」页面联系获取最新交流群入口。

## 更多插件

有巢数智持续沉淀 NocoBase 企业级插件与扩展能力，更多插件请查看：

[更多 NocoBase 插件扩展](https://docs.youchaoyun.com/cn/infrastructure/nocobase_plugin_extension/)
