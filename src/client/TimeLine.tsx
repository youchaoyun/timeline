/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Timeline, Tooltip } from 'antd';
import { observer } from '@nocobase/flow-engine';
import { useAPIClient, useCompile } from '@nocobase/client';
import { dayjs, isArray } from '@nocobase/utils/client';
import { getTimelineCoverFieldInterfaces } from './gallery-cover-field-interfaces';
import {
  getHorizontalItemPlacement,
  getSharedHorizontalSlotSize,
  normalizeTimelineDirection,
  resolveTimelineMode,
} from './timeline-layout';
import type { HorizontalPlacement } from './timeline-layout';

type TimelineEntry = {
  key: string | number;
  title: any;
  summary: any;
  formattedTime: string;
  formattedStartTime: string;
  formattedEndTime: string;
  dotColor: string;
  imageUrl: string;
  titleImageUrl: string;
  hasSummary: boolean;
  hasImage: boolean;
  record: any;
};

// 解析字段路径：提取 {{ ctx.collection. 和 }} 之间的内容
const parseFieldPath = (field: string): string => {
  if (!field) return '';

  const match = field.match(/\{\{\s*ctx\.collection\.(.*?)\s*\}\}/);
  if (match && match[1]) {
    return match[1].split('.')[0];
  }

  return field;
};

// 根据路径获取嵌套对象的值
const getNestedValue = (obj: any, path: string): any => {
  if (!path || !obj) return undefined;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
};

// 格式化时间
const formatTime = (time: any, format: string): string => {
  if (!time) return '';

  try {
    const dayjsObj = dayjs(time);
    if (dayjsObj.isValid()) {
      return dayjsObj.format(format);
    }
    return String(time);
  } catch (error) {
    return String(time);
  }
};

export const TimeLine = observer(({ model }: any) => {
  const compile = useCompile();
  const api = useAPIClient();
  const data = model.resource.getData() || [];
  const [dictItems, setDictItems] = useState<any[]>([]);
  const [nodeFieldIsImg, setNodeFieldIsImg] = useState(false);
  const [horizontalTopSlotHeight, setHorizontalTopSlotHeight] = useState<number | null>(null);
  const [horizontalBottomSlotHeight, setHorizontalBottomSlotHeight] = useState<number | null>(null);
  const horizontalTopSlotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const horizontalBottomSlotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { titleField, timeField, summaryField, startTimeField, endTimeField, timeFormat, nodeField, titleImageField } =
    model?.stepParams?.TimeLineSettings?.fieldMapping || {};

  const collectionFields = model.collection?.options?.fields;
  const fields = useMemo(() => collectionFields || [], [collectionFields]);
  const { color, lineWidth, nodeSize, nodePadding, titlePadding, timePadding } =
    model?.stepParams?.TimeLineSettings?.appearance || {};
  const rawMode = model?.stepParams?.TimeLineSettings?.mode?.mode;
  const direction = normalizeTimelineDirection(model?.stepParams?.TimeLineSettings?.direction?.direction);
  const resolvedMode = resolveTimelineMode(direction, rawMode);
  const isHorizontal = direction === 'horizontal';
  const verticalTimelineMode = resolveTimelineMode('vertical', rawMode) as 'left' | 'right' | 'alternate';

  const format = timeFormat || 'YYYY-MM-DD';
  const timelineColor = color || '#1890ff';
  const timelineLineWidth = lineWidth || 2;
  const timelineNodeSize = nodeSize || 12;
  const timelineNodePadding = Number(nodePadding ?? -4);
  const timelineTitlePadding = titlePadding ?? -7;
  const timelineTimePadding = timePadding ?? -6;
  const minNumber = Math.min(Math.abs(timelineNodeSize), Math.abs(timelineNodePadding));
  const horizontalItemWidth = Math.max(240, 280 + timelineNodePadding * 8);
  const horizontalNodeRowHeight = Math.max(timelineNodeSize + 18, 32);
  const horizontalSlotMinHeight = Math.max(36, timelineNodeSize * 2 + 12);

  // 解析所有字段路径
  const parsedTitleField = parseFieldPath(titleField);
  const parsedTimeField = parseFieldPath(timeField);
  const parsedSummaryField = parseFieldPath(summaryField);
  const parsedStartTimeField = parseFieldPath(startTimeField);
  const parsedEndTimeField = parseFieldPath(endTimeField);
  const parsedNodeField = parseFieldPath(nodeField);
  const parsedTitleImageField = parseFieldPath(titleImageField);

  // 获取字典数据
  useEffect(() => {
    if (!parsedNodeField) return;

    const matched = fields.find((field: any) => field.name === parsedNodeField);

    if (!matched || matched.interface !== 'dictDataSingle') {
      setNodeFieldIsImg(true);
      return;
    }

    setNodeFieldIsImg(false);

    api
      .request({
        method: 'GET',
        url: 'dictItems:list',
        params: {
          appends: ['dictType'],
          pageSize: 1000,
          sort: 'sort',
          tree: true,
          filter: {
            fTypeCode: matched?.uiSchema?.['x-component-props']?.dictType,
          },
        },
      })
      .then(({ data: res }) => {
        if (res?.data?.length > 0) {
          setDictItems(res.data);
        }
      })
      .catch(() => undefined);
  }, [api, fields, parsedNodeField]);

  // 点击条目时，通过 dispatchEvent 触发 openView 弹窗
  const handleItemClick = (record: any, event: React.MouseEvent) => {
    const collection = model.collection;
    if (!collection) return;

    const filterByTk = collection.getFilterByTK(record);
    model.dispatchEvent('itemClick', {
      event,
      filterByTk,
    });
  };

  /**
   * 获取附件字段的图片地址。
   * @param record 当前数据记录。
   * @param fieldName 要读取的附件字段名。
   */
  const getImageUrl = (record: any, fieldName: string) => {
    if (!fieldName || !record) return '';

    const matchedField = fields.find((field: any) => field.name === fieldName);
    const allowedInterfaces = new Set(getTimelineCoverFieldInterfaces());
    if (!matchedField || !allowedInterfaces.has(matchedField.interface)) return '';

    const imgVal = record[fieldName];
    if (isArray(imgVal) && imgVal.length > 0) {
      return imgVal[0]?.url || '';
    }

    if (imgVal && typeof imgVal === 'object' && imgVal.url) {
      return imgVal.url;
    }

    return '';
  };

  const timelineEntries: TimelineEntry[] = data.map((record: any, index: number) => {
    const title = (parsedTitleField ? getNestedValue(record, parsedTitleField) : record?.title) || '暂无标题';
    const time = (parsedTimeField ? getNestedValue(record, parsedTimeField) : record?.time) || '';
    const summary = (parsedSummaryField ? getNestedValue(record, parsedSummaryField) : record?.summary) || '暂无摘要';
    const startTime = (parsedStartTimeField ? getNestedValue(record, parsedStartTimeField) : record?.startTime) || '';
    const endTime = (parsedEndTimeField ? getNestedValue(record, parsedEndTimeField) : record?.endTime) || '';
    const formattedStartTime = startTime ? formatTime(startTime, format) : '';
    const formattedEndTime = endTime ? formatTime(endTime, format) : '';
    const formattedTime = time ? formatTime(time, format) : '';
    const nodeValue = parsedNodeField ? getNestedValue(record, parsedNodeField) : '';
    const matchedDict = nodeValue ? dictItems.find((item) => item.code === nodeValue) : null;
    const dotColor = matchedDict?.color || timelineColor;

    let imageUrl = '';
    if (nodeFieldIsImg && parsedNodeField && record[parsedNodeField]) {
      imageUrl = getImageUrl(record, parsedNodeField);
    }

    const titleImageUrl = parsedTitleImageField ? getImageUrl(record, parsedTitleImageField) : '';
    const hasSummary = summary && summary !== '暂无摘要';
    const hasImage = !!titleImageUrl;

    return {
      key: record?.id ?? `${index}-${formattedTime}-${title}`,
      title,
      summary,
      formattedTime,
      formattedStartTime,
      formattedEndTime,
      dotColor,
      imageUrl,
      titleImageUrl,
      hasSummary,
      hasImage,
      record,
    };
  });

  /**
   * 按轴线两侧的位置生成偏移样式，让横向布局继续复用现有间距配置语义。
   * @param slot 当前内容位于轴线的上方还是下方。
   * @param offset 当前要应用的偏移量。
   */
  const getAxisOffsetStyle = (slot: HorizontalPlacement, offset: number): React.CSSProperties => {
    return {
      transform: `translateY(${slot === 'top' ? -offset : offset}px)`,
    };
  };

  /**
   * 渲染横向轴线附近的时间文本。
   * @param entry 当前节点的展示数据。
   * @param slot 时间位于轴线的上方还是下方。
   */
  const renderAxisTime = (entry: TimelineEntry, slot: HorizontalPlacement) => {
    const hasRangeTime = entry.formattedStartTime || entry.formattedEndTime;
    const timeText = hasRangeTime ? (
      <div>
        {entry.formattedStartTime && <div>{entry.formattedStartTime}</div>}
        {entry.formattedEndTime && <div>{entry.formattedEndTime}</div>}
      </div>
    ) : entry.formattedTime ? (
      <div>{entry.formattedTime}</div>
    ) : null;

    if (!timeText) return null;

    return (
      <div className="custom-timeline-horizontal-axis-time" style={getAxisOffsetStyle(slot, timelineTimePadding)}>
        {timeText}
      </div>
    );
  };

  /**
   * 渲染时间轴条目的正文内容。
   * @param entry 当前节点的展示数据。
   * @param options 控制摘要图片方向、是否在正文里显示时间以及相对轴线的位置。
   */
  const renderItemBody = (
    entry: TimelineEntry,
    options: {
      reverseMedia?: boolean;
      showInlineTime?: boolean;
      slot?: HorizontalPlacement;
    } = {},
  ) => {
    const { reverseMedia = false, showInlineTime = true, slot } = options;
    const contentStyle = slot ? getAxisOffsetStyle(slot, timelineTitlePadding) : undefined;
    const titleMarginBottom = slot ? '0' : '8px';
    const summaryMarginBottom = slot ? '0' : '4px';

    return (
      <div
        className={slot ? 'custom-timeline-horizontal-content' : undefined}
        onClick={(event) => handleItemClick(entry.record, event)}
        style={{ cursor: 'pointer', ...(contentStyle || {}) }}
      >
        {entry.title && (
          <div
            className={slot ? 'custom-timeline-horizontal-title' : undefined}
            style={{ fontWeight: 600, marginBottom: titleMarginBottom }}
          >
            {compile(entry.title)}
          </div>
        )}

        {(entry.hasSummary || entry.hasImage) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: summaryMarginBottom,
              maxWidth: '100%',
              width: 'fit-content',
              flexDirection: reverseMedia ? 'row-reverse' : 'row',
            }}
          >
            {entry.hasSummary && (
              <Tooltip title={entry.summary} placement="topLeft">
                <div
                  style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                    color: '#666',
                    lineHeight: '20px',
                    textAlign: slot ? 'left' : undefined,
                    wordBreak: 'break-word',
                    maxWidth: entry.hasImage ? '280px' : '420px',
                    flex: '0 1 auto',
                  }}
                >
                  {compile(entry.summary)}
                </div>
              </Tooltip>
            )}

            {entry.hasImage && (
              <img
                src={entry.titleImageUrl}
                alt="title-img"
                style={{
                  width: '120px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        )}

        {showInlineTime && entry.formattedTime && (
          <div style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>{entry.formattedTime}</div>
        )}
      </div>
    );
  };

  /**
   * 渲染横向布局下的单个节点。
   * @param entry 当前节点的展示数据。
   * @param index 当前节点索引。
   */
  const renderHorizontalItem = (entry: TimelineEntry, index: number) => {
    const placement = getHorizontalItemPlacement(resolvedMode, index);
    const topSlotHeight = horizontalTopSlotHeight ?? horizontalSlotMinHeight;
    const bottomSlotHeight = horizontalBottomSlotHeight ?? horizontalSlotMinHeight;

    return (
      <div key={entry.key} className={`custom-timeline-horizontal-item placement-${placement}`}>
        <div className="custom-timeline-horizontal-slot slot-top" style={{ height: `${topSlotHeight}px` }}>
          <div
            ref={(element) => {
              horizontalTopSlotRefs.current[String(entry.key)] = element;
            }}
          >
            {placement === 'top'
              ? renderItemBody(entry, { showInlineTime: false, slot: 'top' })
              : renderAxisTime(entry, 'top')}
          </div>
        </div>
        <div className="custom-timeline-horizontal-node-row">
          {entry.imageUrl ? (
            <img
              className="custom-timeline-horizontal-node-image"
              style={{ width: `${timelineNodeSize}px`, height: `${timelineNodeSize}px` }}
              src={entry.imageUrl}
              alt="icon"
            />
          ) : (
            <div
              className="custom-timeline-horizontal-node-dot"
              style={{
                width: `${timelineNodeSize}px`,
                height: `${timelineNodeSize}px`,
                borderColor: entry.dotColor,
              }}
            />
          )}
        </div>
        <div className="custom-timeline-horizontal-slot slot-bottom" style={{ height: `${bottomSlotHeight}px` }}>
          <div
            ref={(element) => {
              horizontalBottomSlotRefs.current[String(entry.key)] = element;
            }}
          >
            {placement === 'top'
              ? renderAxisTime(entry, 'bottom')
              : renderItemBody(entry, { showInlineTime: false, slot: 'bottom' })}
          </div>
        </div>
      </div>
    );
  };

  useLayoutEffect(() => {
    if (!isHorizontal || timelineEntries.length === 0) {
      setHorizontalTopSlotHeight(null);
      setHorizontalBottomSlotHeight(null);
      return;
    }

    const measureSlotHeights = () => {
      const topHeights = timelineEntries.map(
        (entry) => horizontalTopSlotRefs.current[String(entry.key)]?.scrollHeight || 0,
      );
      const bottomHeights = timelineEntries.map(
        (entry) => horizontalBottomSlotRefs.current[String(entry.key)]?.scrollHeight || 0,
      );

      setHorizontalTopSlotHeight(getSharedHorizontalSlotSize(topHeights, horizontalSlotMinHeight));
      setHorizontalBottomSlotHeight(getSharedHorizontalSlotSize(bottomHeights, horizontalSlotMinHeight));
    };

    measureSlotHeights();

    if (typeof window === 'undefined') return;

    window.addEventListener('resize', measureSlotHeights);
    return () => {
      window.removeEventListener('resize', measureSlotHeights);
    };
  }, [horizontalSlotMinHeight, isHorizontal, resolvedMode, timelineEntries]);

  const verticalItems = timelineEntries.map((entry, index) => {
    const reverseMedia = verticalTimelineMode === 'right' || (verticalTimelineMode === 'alternate' && index % 2 === 1);

    return {
      dot: entry.imageUrl ? (
        <img
          style={{ width: `${timelineNodeSize}px`, height: `${timelineNodeSize}px`, objectFit: 'cover' }}
          src={entry.imageUrl}
          alt="icon"
        />
      ) : null,
      color: entry.dotColor,
      label:
        entry.formattedStartTime || entry.formattedEndTime ? (
          <div style={{ color: '#999', fontSize: '12px', lineHeight: 1.6 }}>
            {entry.formattedStartTime && <div>{entry.formattedStartTime}</div>}
            {entry.formattedEndTime && <div>{entry.formattedEndTime}</div>}
          </div>
        ) : undefined,
      children: renderItemBody(entry, { reverseMedia }),
    };
  });

  const timelineWrapperStyle = {
    '--timeline-line-color': timelineColor,
    '--timeline-line-width': `${timelineLineWidth}px`,
    '--timeline-node-size': `${timelineNodeSize}px`,
    '--timeline-node-padding': `${timelineNodePadding}px`,
    '--timeline-horizontal-item-width': `${horizontalItemWidth}px`,
    '--timeline-horizontal-slot-min-height': `${horizontalTopSlotHeight ?? horizontalSlotMinHeight}px`,
    '--timeline-horizontal-bottom-slot-height': `${horizontalBottomSlotHeight ?? horizontalSlotMinHeight}px`,
    '--timeline-horizontal-node-row-height': `${horizontalNodeRowHeight}px`,
  } as React.CSSProperties;

  const verticalTimelineStyles = `
    .custom-timeline-wrapper .ant-timeline-item-tail {
      border-inline-start-color: var(--timeline-line-color, #1890ff) !important;
      border-inline-start-width: var(--timeline-line-width, 2px) !important;
    }

    .custom-timeline-wrapper .ant-timeline-item-head:not(.ant-timeline-item-head-custom) {
      width: var(--timeline-node-size, 10px) !important;
      height: var(--timeline-node-size, 10px) !important;
      margin-inline-start: var(--timeline-node-padding, -4px) !important;
    }

    .custom-timeline-wrapper .ant-timeline-item-content {
      padding: 0 ${minNumber}px !important;
      inset-block-start: ${timelineTitlePadding}px !important;
    }

    .custom-timeline-wrapper .ant-timeline-item-label {
      padding: 0 ${minNumber}px !important;
      inset-block-start: ${timelineTimePadding}px !important;
    }

    .custom-timeline-wrapper .ant-timeline-item-content,
    .custom-timeline-wrapper .ant-timeline-item-label {
      word-break: break-word;
    }

    .custom-timeline-wrapper .ant-timeline-item {
      padding-bottom: 8px;
    }
  `;

  const horizontalTimelineStyles = `
    .custom-timeline-horizontal-wrapper {
      overflow: hidden;
      height: 100%;
      min-height: 0;
    }

    .custom-timeline-horizontal-scroll {
      height: 100%;
      min-height: 0;
      overflow-x: auto;
      overflow-y: auto;
      padding-bottom: 8px;
    }

    .custom-timeline-horizontal-scroll-inner {
      width: max-content;
      min-width: 100%;
      min-height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .custom-timeline-horizontal-track {
      position: relative;
      display: inline-flex;
      align-items: stretch;
      width: max-content;
    }

    .custom-timeline-horizontal-track::before {
      content: '';
      position: absolute;
      left: calc(var(--timeline-horizontal-item-width) / 2);
      right: calc(var(--timeline-horizontal-item-width) / 2);
      top: calc(var(--timeline-horizontal-slot-min-height) + (var(--timeline-horizontal-node-row-height) / 2));
      border-top: var(--timeline-line-width, 2px) solid var(--timeline-line-color, #1890ff);
      z-index: 0;
    }

    .custom-timeline-horizontal-item {
      position: relative;
      flex: 0 0 var(--timeline-horizontal-item-width);
      min-width: var(--timeline-horizontal-item-width);
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 1;
    }

    .custom-timeline-horizontal-slot {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .custom-timeline-horizontal-slot.slot-top {
      min-height: var(--timeline-horizontal-slot-min-height);
      align-items: flex-end;
    }

    .custom-timeline-horizontal-slot.slot-bottom {
      min-height: var(--timeline-horizontal-bottom-slot-height);
      align-items: flex-start;
    }

    .custom-timeline-horizontal-content {
      width: 100%;
      max-width: calc(var(--timeline-horizontal-item-width) - 24px);
      text-align: center;
      word-break: break-word;
    }

    .custom-timeline-horizontal-title {
      width: 100%;
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }

    .custom-timeline-horizontal-node-row {
      width: 100%;
      height: var(--timeline-horizontal-node-row-height);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .custom-timeline-horizontal-node-dot {
      border-style: solid;
      border-width: var(--timeline-line-width, 2px);
      border-radius: 50%;
      background: #fff;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .custom-timeline-horizontal-node-image {
      object-fit: cover;
      flex-shrink: 0;
      border-radius: 50%;
      background: #fff;
    }

    .custom-timeline-horizontal-axis-time {
      color: #999;
      font-size: 12px;
      line-height: 1.6;
      text-align: center;
      word-break: break-word;
    }
  `;

  if (model.resource.loading) {
    if (isHorizontal) {
      return (
        <div style={timelineWrapperStyle} className="custom-timeline-wrapper custom-timeline-horizontal-wrapper">
          <style>{horizontalTimelineStyles}</style>
          <div className="custom-timeline-horizontal-scroll">
            <div className="custom-timeline-horizontal-scroll-inner">
              <div className="custom-timeline-horizontal-track">
                <div className="custom-timeline-horizontal-item">
                  <div className="custom-timeline-horizontal-slot slot-top" />
                  <div className="custom-timeline-horizontal-node-row">
                    <div
                      className="custom-timeline-horizontal-node-dot"
                      style={{
                        width: `${timelineNodeSize}px`,
                        height: `${timelineNodeSize}px`,
                        borderColor: timelineColor,
                      }}
                    />
                  </div>
                  <div className="custom-timeline-horizontal-slot slot-bottom" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={timelineWrapperStyle} className="custom-timeline-wrapper">
        <style>{`${verticalTimelineStyles}
          .custom-timeline-wrapper .ant-timeline-item {
            margin-bottom: 20px;
          }`}</style>
        <Timeline mode={verticalTimelineMode} items={[]} />
      </div>
    );
  }

  if (isHorizontal) {
    return (
      <div style={timelineWrapperStyle} className="custom-timeline-wrapper custom-timeline-horizontal-wrapper">
        <style>{horizontalTimelineStyles}</style>
        <div className="custom-timeline-horizontal-scroll">
          <div className="custom-timeline-horizontal-scroll-inner">
            <div className="custom-timeline-horizontal-track">{timelineEntries.map(renderHorizontalItem)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={timelineWrapperStyle} className="custom-timeline-wrapper">
      <style>{verticalTimelineStyles}</style>
      <Timeline mode={verticalTimelineMode} items={verticalItems} />
    </div>
  );
});
