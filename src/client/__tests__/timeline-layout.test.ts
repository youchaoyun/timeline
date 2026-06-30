import {
  getHorizontalItemPlacement,
  getSharedHorizontalSlotSize,
  getTimelineModeOptions,
  getVerticalTimelineRenderMode,
  normalizeTimelineDirection,
  resolveTimelineMode,
} from '../timeline-layout';
import { TimeLineModel } from '../models/TimeLineModel';

describe('timeline horizontal layout helpers', () => {
  it('should default direction to vertical', () => {
    expect(normalizeTimelineDirection(undefined)).toBe('vertical');
    expect(normalizeTimelineDirection('unknown')).toBe('vertical');
  });

  it('should keep supported directions', () => {
    expect(normalizeTimelineDirection('vertical')).toBe('vertical');
    expect(normalizeTimelineDirection('horizontal')).toBe('horizontal');
  });

  it('should resolve vertical modes with left fallback', () => {
    expect(resolveTimelineMode('vertical', undefined)).toBe('left');
    expect(resolveTimelineMode('vertical', 'left')).toBe('left');
    expect(resolveTimelineMode('vertical', 'right')).toBe('right');
    expect(resolveTimelineMode('vertical', 'alternate')).toBe('alternate');
    expect(resolveTimelineMode('vertical', 'top')).toBe('left');
  });

  it('should resolve horizontal modes with top fallback', () => {
    expect(resolveTimelineMode('horizontal', undefined)).toBe('top');
    expect(resolveTimelineMode('horizontal', 'top')).toBe('top');
    expect(resolveTimelineMode('horizontal', 'bottom')).toBe('bottom');
    expect(resolveTimelineMode('horizontal', 'alternate')).toBe('alternate');
    expect(resolveTimelineMode('horizontal', 'left')).toBe('top');
    expect(resolveTimelineMode('horizontal', 'right')).toBe('bottom');
  });

  it('should calculate horizontal placement for top and bottom modes', () => {
    expect(getHorizontalItemPlacement('top', 0)).toBe('top');
    expect(getHorizontalItemPlacement('bottom', 0)).toBe('bottom');
  });

  it('should alternate as bottom, top, bottom to match current horizontal design', () => {
    expect(getHorizontalItemPlacement('alternate', 0)).toBe('bottom');
    expect(getHorizontalItemPlacement('alternate', 1)).toBe('top');
    expect(getHorizontalItemPlacement('alternate', 2)).toBe('bottom');
  });

  it('should provide mode options that match the current direction', () => {
    expect(getTimelineModeOptions('vertical')).toEqual([
      { value: 'left', labelKey: 'Left' },
      { value: 'right', labelKey: 'Right' },
      { value: 'alternate', labelKey: 'Alternate' },
    ]);

    expect(getTimelineModeOptions('horizontal')).toEqual([
      { value: 'top', labelKey: 'Top' },
      { value: 'bottom', labelKey: 'Bottom' },
      { value: 'alternate', labelKey: 'Alternate' },
    ]);
  });

  it('should use the tallest horizontal slot content as the shared slot height', () => {
    expect(getSharedHorizontalSlotSize([0, 28, 64], 36)).toBe(64);
    expect(getSharedHorizontalSlotSize([12, 20], 36)).toBe(36);
    expect(getSharedHorizontalSlotSize([], 36)).toBe(36);
  });

  it('should map vertical business modes to the expected antd render modes', () => {
    expect(getVerticalTimelineRenderMode(undefined)).toBe('right');
    expect(getVerticalTimelineRenderMode('left')).toBe('right');
    expect(getVerticalTimelineRenderMode('right')).toBe('left');
    expect(getVerticalTimelineRenderMode('alternate')).toBe('alternate');
  });

  it('should require field mapping during timeline block creation', () => {
    const flow = TimeLineModel.globalFlowRegistry.getFlow('TimeLineSettings');
    const fieldMappingStep = flow?.getStep('fieldMapping')?.serialize();

    expect(fieldMappingStep?.preset).toBe(true);
  });
});
