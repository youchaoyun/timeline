export type TimelineDirection = 'vertical' | 'horizontal';
export type TimelineMode = 'left' | 'right' | 'top' | 'bottom' | 'alternate';
export type HorizontalPlacement = 'top' | 'bottom';
export type TimelineModeOption = {
  value: TimelineMode;
  labelKey: 'Left' | 'Right' | 'Top' | 'Bottom' | 'Alternate';
};

/**
 * 规范化时间轴方向。
 * @param direction 设置面板里保存的方向值。
 */
export function normalizeTimelineDirection(direction?: string): TimelineDirection {
  return direction === 'horizontal' ? 'horizontal' : 'vertical';
}

/**
 * 根据当前方向解析时间轴模式，并兼容历史配置值。
 * @param direction 当前时间轴方向。
 * @param mode 设置面板里保存的模式值。
 */
export function resolveTimelineMode(direction: TimelineDirection, mode?: string): TimelineMode {
  if (direction === 'horizontal') {
    if (mode === 'bottom' || mode === 'right') {
      return 'bottom';
    }

    if (mode === 'alternate') {
      return 'alternate';
    }

    return 'top';
  }

  if (mode === 'right') {
    return 'right';
  }

  if (mode === 'alternate') {
    return 'alternate';
  }

  return 'left';
}

/**
 * 根据当前方向返回模式下拉框可用的选项。
 * @param direction 当前时间轴方向。
 */
export function getTimelineModeOptions(direction: TimelineDirection): TimelineModeOption[] {
  if (direction === 'horizontal') {
    return [
      { value: 'top', labelKey: 'Top' },
      { value: 'bottom', labelKey: 'Bottom' },
      { value: 'alternate', labelKey: 'Alternate' },
    ];
  }

  return [
    { value: 'left', labelKey: 'Left' },
    { value: 'right', labelKey: 'Right' },
    { value: 'alternate', labelKey: 'Alternate' },
  ];
}

/**
 * 计算横向布局中同一侧槽位应共享的高度，避免不同节点内容高度不一致时挤压轴线。
 * @param slotSizes 当前侧所有槽位内容测量到的高度列表。
 * @param minHeight 当前布局允许的最小槽位高度。
 */
export function getSharedHorizontalSlotSize(slotSizes: number[], minHeight: number): number {
  const maxSize = slotSizes.reduce((currentMax, size) => Math.max(currentMax, size || 0), 0);
  return Math.max(minHeight, maxSize);
}

/**
 * 计算横向布局下每个节点应显示在轴线的上方还是下方。
 * @param mode 横向时间轴模式。
 * @param index 当前节点的索引。
 */
export function getHorizontalItemPlacement(mode: TimelineMode, index: number): HorizontalPlacement {
  if (mode === 'top') {
    return 'top';
  }

  if (mode === 'bottom') {
    return 'bottom';
  }

  return index % 2 === 0 ? 'bottom' : 'top';
}
