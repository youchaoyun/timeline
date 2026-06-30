/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import {
  MultiRecordResource,
  AddSubModelButton,
  FlowSettingsButton,
  observer,
  VariableInput,
  MetaTreeNode,
  createEphemeralContext,
  createCollectionContextMeta,
  useFlowSettingsContext,
  defineAction,
} from '@nocobase/flow-engine';
import { SettingOutlined } from '@ant-design/icons';
import { CollectionBlockModel, BlockSceneEnum, ActionModel, ISchema, FieldModel } from '@nocobase/client';
import React, { FC, useMemo } from 'react';
import { TimeLine } from '../TimeLine';
import { getTimelineModeOptions, normalizeTimelineDirection } from '../timeline-layout';
import { tExpr, useT } from '../locale';
import { isString } from 'lodash';
import { ColorPicker, ColorPickerProps, InputNumber, Button, Popconfirm } from 'antd';
import { Color } from 'antd/es/color-picker';
import { useForm } from '@formily/react';

type TimeLineModelStructure = {
  subModels: {
    actions: ActionModel[];
  };
};

const DEFAULT_APPEARANCE_PARAMS = {
  color: '#1890ff',
  lineWidth: 2,
  nodeSize: 12,
  nodePadding: -4,
  titlePadding: -7,
  timePadding: -6,
};

// 默认假数据
const DEFAULT_MOCK_DATA = [
  {
    id: 1,
    title: '项目启动',
    content: '项目正式启动，团队成员到位',
    time: '2024-01-01 10:00:00',
  },
  {
    id: 2,
    title: '需求评审',
    content: '完成需求文档评审，确定开发计划',
    time: '2024-01-05 14:30:00',
  },
  {
    id: 3,
    title: '开发阶段',
    content: '进入开发阶段，按计划推进',
    time: '2024-01-10 09:00:00',
  },
  {
    id: 4,
    title: '测试上线',
    content: '完成测试，准备上线',
    time: '2024-01-20 16:00:00',
  },
];

const RestoreAppearanceDefaultButton: FC = () => {
  const form = useForm();
  const t = useT();
  const handleRestore = () => {
    form.setValues({
      ...form.values,
      ...DEFAULT_APPEARANCE_PARAMS,
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <Popconfirm
        title={t('Restore appearance defaults?')}
        onConfirm={handleRestore}
        okText={t('Confirm')}
        cancelText={t('Cancel')}
      >
        <Button style={{ marginBottom: 12 }}>{t('Restore default')}</Button>
      </Popconfirm>
    </div>
  );
};

const parseFieldPath = (field: string): string => {
  if (!field) return '';

  // 匹配到第一个字段，遇到点、空格、或 }} 就停止
  const match = field.match(/\{\{\s*ctx\.collection\.([^\s.}]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return field;
};
export class TimeLineModel extends CollectionBlockModel<TimeLineModelStructure> {
  static scene = BlockSceneEnum.many;

  _defaultCustomModelClasses = {
    CollectionActionGroupModel: 'CollectionActionGroupModel',
  };

  get resource() {
    return super.resource as MultiRecordResource;
  }

  createResource(ctx: any, params: any) {
    const resource = this.context.createResource(MultiRecordResource);

    const fieldMapping = ctx?.blockModel?.stepParams?.TimeLineSettings?.fieldMapping || {};
    const collection = ctx?.collection?.options?.fields || [];
    // 将 fieldMapping 中 ctx.collection 引用的字段添加到 resource.appends 中
    // 这样可以让 resource.getData 时自动填充关联字段
    if (Object.keys(fieldMapping).length > 0) {
      for (const key in fieldMapping) {
        if (!Object.hasOwn(fieldMapping, key)) continue;

        if (fieldMapping[key] && isString(fieldMapping[key]) && fieldMapping[key].includes('ctx.collection')) {
          const element = parseFieldPath(fieldMapping[key]);
          const matched = collection.find((field: any) => field.name === element);
          if (matched) {
            if (matched.type.includes('belongs')) {
              resource.addAppends(element);
            }
          }
        }
      }
    }

    // 如果没有数据源配置，使用默认假数据
    if (!this.props.collection) {
      resource.setData(DEFAULT_MOCK_DATA);
      resource.setMeta({ count: DEFAULT_MOCK_DATA.length });
    }

    return resource;
  }

  renderConfiguireActions() {
    return (
      <AddSubModelButton
        key={'timeline-add-actions'}
        model={this}
        subModelBaseClass={this.getModelClassName('CollectionActionGroupModel')}
        subModelKey="actions"
      >
        <FlowSettingsButton icon={<SettingOutlined />}>{this.translate('Actions')}</FlowSettingsButton>
      </AddSubModelButton>
    );
  }

  renderComponent() {
    return <TimeLine model={this} />;
  }
}

// 简化的本地辅助：按需获取 ctx.collection 的字段树（MetaTreeNode[]）
async function buildCollectionLeftMetaTreeLocal(ctx: any): Promise<MetaTreeNode[]> {
  const resolve = async (sub: any): Promise<MetaTreeNode[]> => {
    if (Array.isArray(sub)) return sub as MetaTreeNode[];
    if (typeof sub === 'function') return await (sub as () => Promise<MetaTreeNode[]>)();
    return [];
  };

  // 1) 若已有 collection meta，直接复用
  if (ctx.getPropertyOptions?.('collection')?.meta) {
    const sub = ctx.getPropertyMetaTree?.('{{ ctx.collection }}');
    return await resolve(sub);
  }

  // 2) 否则在本组件范围内临时构建
  const getCollection = () => (ctx as any)?.collection ?? null;
  const scoped = await createEphemeralContext(ctx, {
    defineProperties: {
      collection: {
        get: getCollection,
        meta: createCollectionContextMeta(getCollection, 'Current collection'),
      },
    },
  });
  const subTree = scoped.getPropertyMetaTree?.('{{ ctx.collection }}');
  return await resolve(subTree);
}

type OperatorMeta = {
  value: string;
  label: string | React.ReactNode;
  noValue?: boolean;
  schema?: ISchema;
  visible?: (meta: MetaTreeNode) => boolean;
};

type FieldInterfaceDef = {
  filterable?: {
    operators?: OperatorMeta[];
    children?: Array<{ name: string; title?: string; schema?: ISchema; operators?: OperatorMeta[] }>;
  };
};

interface FilterGroupProps {
  model?: any;
  value?: any;
  onChange?: (value: any) => void;
  filter?: (field: MetaTreeNode) => boolean;
  fieldNames?: {
    label: string;
    value: string;
  };
}

type CommonFieldGroupProps = FilterGroupProps & {
  allowedInterfaces?: string[];
};

export const timelineDisplayMode = defineAction({
  name: 'timelineDisplayMode',
  title: tExpr('Mode'),
  uiMode: (ctx) => {
    const direction = normalizeTimelineDirection(ctx.model?.stepParams?.TimeLineSettings?.direction?.direction);
    const options = getTimelineModeOptions(direction).map((option) => ({
      value: option.value,
      label: tExpr(option.labelKey),
    }));

    return {
      type: 'select',
      key: 'mode',
      props: {
        options,
      },
    };
  },
  defaultParams: {
    mode: 'left',
  },
  handler(ctx, params) {
    const blockModel = ctx.blockModel as CollectionBlockModel;
    if (!blockModel) return;
    blockModel.setProps({ mode: params.mode });
  },
});

export const timelineDirectionMode = defineAction({
  name: 'timelineDirectionMode',
  title: tExpr('Direction'),
  uiMode: {
    type: 'select',
    key: 'direction',
    props: {
      options: [
        { value: 'vertical', label: tExpr('Vertical') },
        { value: 'horizontal', label: tExpr('Horizontal') },
      ],
    },
  },
  defaultParams: {
    direction: 'vertical',
  },
  handler(ctx, params) {
    const blockModel = ctx.blockModel as CollectionBlockModel;
    if (!blockModel) return;
    blockModel.setProps({ direction: params.direction });
  },
});

export const CommonFieldGroup: React.FC<CommonFieldGroupProps> = observer(
  (props) => {
    const { value, onChange, allowedInterfaces } = props;
    const flowContext = useFlowSettingsContext<FieldModel>();
    const model = flowContext.model;

    const enhancedMetaTree = useMemo(() => {
      return async () => {
        const dm = model.context.app?.dataSourceManager;
        const fiMgr = dm?.collectionFieldInterfaceManager;
        const nodes: MetaTreeNode[] = await buildCollectionLeftMetaTreeLocal(model.context);

        const shouldFilter = Array.isArray(allowedInterfaces) && allowedInterfaces.length > 0;

        const enhanceNode = async (node: MetaTreeNode): Promise<MetaTreeNode | null> => {
          if (shouldFilter && (!node.interface || !allowedInterfaces?.includes(node.interface))) {
            return null;
          }

          const fi = node.interface
            ? (fiMgr?.getFieldInterface(node.interface) as FieldInterfaceDef | undefined)
            : undefined;

          const extraChildren: MetaTreeNode[] = [];
          const filterable = fi?.filterable;
          const childrenDefs = filterable?.children as
            | Array<{ name: string; title?: string; schema?: ISchema; operators?: OperatorMeta[] }>
            | undefined;

          if (Array.isArray(childrenDefs) && childrenDefs.length) {
            for (const c of childrenDefs) {
              extraChildren.push({
                name: c.name,
                title: c.title || c.name,
                type: (c.schema?.type as string) || 'string',
                interface: c.schema?.['x-component'] === 'Select' ? 'select' : 'input',
                uiSchema: { ...(c.schema || {}), 'x-filter-operators': c.operators },
                paths: [...(node.paths || []), c.name],
                parentTitles: [...(node.parentTitles || []), node.title],
              });
            }
          }

          if (typeof node.children === 'function') {
            const original = node.children;
            return {
              ...node,
              children: async () => {
                const base = await original();
                const merged = [...(Array.isArray(base) ? base : []), ...extraChildren];
                return [...new Map(merged.map((i) => [i.name, i])).values()];
              },
            } as MetaTreeNode;
          }

          const merged = [...(Array.isArray(node.children) ? (node.children as MetaTreeNode[]) : []), ...extraChildren];
          return { ...node, children: merged.length ? merged : node.children } as MetaTreeNode;
        };

        const out: MetaTreeNode[] = [];
        for (const n of nodes) {
          const enhanced = await enhanceNode(n);
          if (enhanced) out.push(enhanced);
        }
        return out;
      };
    }, [model, allowedInterfaces]);

    return (
      <VariableInput
        value={value}
        onChange={onChange}
        metaTree={enhancedMetaTree}
        showValueComponent={false}
        style={{ flex: '1 1 40%', minWidth: 160, maxWidth: '100%' }}
        onlyLeafSelectable={true}
      />
    );
  },
  { displayName: 'CommonFieldGroup' },
);

interface ColorPickerWrapperProps {
  value?: string;
  onChange?: (value: string) => void;
  showText?: boolean;
  format?: ColorPickerProps['format'];
}

const ColorPickerWrapper: FC<ColorPickerWrapperProps> = ({ value, onChange, showText = true, format = 'hex' }) => {
  const handleChange = (color: Color) => {
    if (onChange) {
      // 将 Color 对象转换为 hex 字符串
      onChange(color.toHexString());
    }
  };

  return <ColorPicker value={value} onChange={handleChange} showText={showText} format={format} />;
};

// 注册配置流程
TimeLineModel.registerFlow({
  key: 'TimeLineSettings',
  sort: 500,
  title: tExpr('Timeline settings'),
  steps: {
    fieldMapping: {
      title: tExpr('Field mapping'),
      preset: true,
      uiSchema: {
        basicFields: {
          type: 'void',
          'x-component': 'FormLayout',
          'x-component-props': {
            layout: 'vertical',
          },
          properties: {
            fieldGroup: {
              type: 'void',
              'x-component': 'Card',
              'x-component-props': {
                title: tExpr('Basic fields'),
                size: 'small',
              },
              properties: {
                titleField: {
                  type: 'string',
                  title: tExpr('Title field'),
                  'x-component': CommonFieldGroup,

                  'x-decorator': 'FormItem',
                },
                titleImageField: {
                  type: 'string',
                  title: tExpr('Title image field'),
                  'x-component': CommonFieldGroup,
                  'x-component-props': {
                    allowedInterfaces: ['attachment'],
                  },
                  'x-decorator': 'FormItem',
                },
                summaryField: {
                  type: 'string',
                  title: tExpr('Summary field'),
                  'x-component': CommonFieldGroup,
                  'x-decorator': 'FormItem',
                },

                nodeField: {
                  type: 'string',
                  title: tExpr('Node field'),
                  'x-component': CommonFieldGroup,
                  'x-component-props': {
                    allowedInterfaces: ['attachment', 'dictDataSingle'],
                  },
                  'x-decorator': 'FormItem',
                },
              },
            },
            timeGroup: {
              type: 'void',
              'x-component': 'Card',
              'x-component-props': {
                title: tExpr('Time fields'),
                size: 'small',
              },
              properties: {
                startTimeField: {
                  type: 'string',
                  title: tExpr('Start time field'),
                  'x-component': CommonFieldGroup,
                  'x-component-props': {
                    allowedInterfaces: [
                      'createdAt',
                      'updatedAt',
                      'datetimeNoTz',
                      'unixTimestamp',
                      'date',
                      'time',
                      'unixTimestamp',
                    ],
                  },
                  'x-decorator': 'FormItem',
                },
                endTimeField: {
                  type: 'string',
                  title: tExpr('End time field'),
                  'x-component': CommonFieldGroup,
                  'x-component-props': {
                    allowedInterfaces: [
                      'createdAt',
                      'updatedAt',
                      'datetimeNoTz',
                      'unixTimestamp',
                      'date',
                      'time',
                      'unixTimestamp',
                    ],
                  },
                  'x-decorator': 'FormItem',
                },
                timeFormat: {
                  type: 'string',
                  title: tExpr('Time format'),
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    placeholder: 'YYYY-MM-DD',
                  },
                },
              },
            },
          },
        },
      },
      defaultParams: {
        titleField: 'title',
        titleImageField: '',
        timeField: 'time',
        summaryField: 'summary',
        nodeField: '',
        startTimeField: '',
        endTimeField: '',
        timeFormat: 'YYYY-MM-DD',
        color: '#1890ff',
        lineWidth: 2,
      },
    },

    direction: {
      use: 'timelineDirectionMode',
    },

    mode: {
      use: 'timelineDisplayMode',
    },

    appearance: {
      title: tExpr('Appearance'),
      uiSchema: {
        styleSettings: {
          type: 'void',
          'x-component': 'FormLayout',
          'x-component-props': {
            layout: 'vertical',
          },
          properties: {
            restoreDefault: {
              type: 'void',
              'x-component': RestoreAppearanceDefaultButton,
            },

            color: {
              type: 'string',
              title: tExpr('Timeline color'),
              'x-component': ColorPickerWrapper,
              'x-decorator': 'FormItem',
              'x-component-props': {
                showText: true,
                format: 'hex',
              },
            },
            lineWidth: {
              type: 'number',
              title: tExpr('Line width'),
              'x-component': InputNumber,
              'x-decorator': 'FormItem',
              'x-component-props': {
                min: 1,
                max: 10,
                placeholder: '2',
                addonAfter: 'px',
              },
            },
            nodeSize: {
              type: 'number',
              title: tExpr('Node size'),
              'x-component': InputNumber,
              'x-decorator': 'FormItem',
              'x-component-props': {
                min: 8,
                max: 100,
                placeholder: '12',
                addonAfter: 'px',
              },
            },
            nodePadding: {
              type: 'string',
              title: tExpr('Node padding'),
              description: tExpr("Setting only the node's offset does not apply to the node image."),
              'x-component': InputNumber,
              'x-decorator': 'FormItem',
              default: -4,
              'x-component-props': {
                placeholder: '-4',
                addonAfter: 'px',
              },
            },
            titlePadding: {
              type: 'number',
              title: tExpr('Title padding'),
              description: tExpr('Only for adjusting the top and bottom margins of the title field.'),
              'x-component': InputNumber,
              'x-decorator': 'FormItem',
              'x-component-props': {
                placeholder: '-7',
                addonAfter: 'px',
              },
              default: -7,
            },
            timePadding: {
              type: 'number',
              title: tExpr('Time padding'),
              description: tExpr('Only for adjusting the top and bottom margins of the time field.'),
              'x-component': InputNumber,
              'x-decorator': 'FormItem',
              'x-component-props': {
                placeholder: '-6',
                addonAfter: 'px',
              },
              default: -6,
            },
          },
        },
      },
      defaultParams: DEFAULT_APPEARANCE_PARAMS,
    },

    dataScope: {
      use: 'dataScope',
      title: tExpr('Data scope'),
    },
    defaultSorting: {
      use: 'sortingRule',
      title: tExpr('Default sorting'),
    },
  },
});

// 定义区块
TimeLineModel.define({
  label: tExpr('Time line'),
  searchable: true,
  searchPlaceholder: tExpr('Search'),
  createModelOptions: {
    use: 'TimeLineModel',
  },
  sort: 600,
});

// 注册时间轴条目点击事件
TimeLineModel.registerEvents({
  itemClick: {
    title: tExpr('Item click'),
    name: 'itemClick',
    async handler() {
      // 事件由 popupSettings flow 处理
    },
  },
});

// 注册点击条目时打开弹窗的流程（使用 openView action）
TimeLineModel.registerFlow({
  key: 'popupSettings',
  title: tExpr('Popup settings'),
  on: 'itemClick',
  sort: 300,
  steps: {
    openView: {
      use: 'openView',
    },
  },
  defaultParams: (ctx) => {
    const collectionName = ctx.collection?.name;
    const dataSourceKey = ctx.collection?.dataSourceKey;
    return {
      openView: {
        collectionName,
        dataSourceKey,
        // 禁用路由导航，直接打开弹窗。
        // 因为 popupSettings flow 绑定了 on: 'itemClick' 事件，
        // 路由二次进入时无法重新触发该事件来打开弹窗。
        navigation: false,
      },
    };
  },
});
