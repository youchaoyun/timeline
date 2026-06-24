import { Plugin } from '@nocobase/client';
import models from './models';
import { timelineDisplayMode, timelineDirectionMode } from '../client/models/TimeLineModel';
import { registerTimelineCoverFieldInterfaces } from './gallery-cover-field-interfaces';

export class PluginTimelineClient extends Plugin {
  /**
   * 注册时间轴封面字段接口。
   * @param interfaceNames 需要追加注册的字段接口名称列表。
   */
  registerTimelineCoverFieldInterfaces(interfaceNames: string[] = []) {
    registerTimelineCoverFieldInterfaces(interfaceNames);
  }

  async load() {
    this.flowEngine.registerModels(models);
    this.flowEngine.registerActions({ timelineDisplayMode, timelineDirectionMode });
  }
}

export default PluginTimelineClient;