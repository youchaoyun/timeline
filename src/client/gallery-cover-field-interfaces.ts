const DEFAULT_GALLERY_COVER_FIELD_INTERFACES = ['attachment'];
const GALLERY_COVER_FIELD_INTERFACES_KEY = '__YOUCHAO_GALLERY_COVER_FIELD_INTERFACES__';

type GalleryCoverFieldInterfaceStore = {
  interfaces: Set<string>;
};

type GalleryCoverFieldGlobal = typeof globalThis & {
  [GALLERY_COVER_FIELD_INTERFACES_KEY]?: GalleryCoverFieldInterfaceStore;
};

/**
 * 获取画廊封面字段接口注册表。
 * @param initialInterfaces 首次初始化时需要写入的默认接口名称列表。
 */
function getGalleryCoverFieldInterfaceStore(
  initialInterfaces: string[] = DEFAULT_GALLERY_COVER_FIELD_INTERFACES,
): GalleryCoverFieldInterfaceStore {
  const registryTarget = globalThis as GalleryCoverFieldGlobal;

  if (!registryTarget[GALLERY_COVER_FIELD_INTERFACES_KEY]) {
    registryTarget[GALLERY_COVER_FIELD_INTERFACES_KEY] = {
      interfaces: new Set(initialInterfaces.filter(Boolean)),
    };
  }

  return registryTarget[GALLERY_COVER_FIELD_INTERFACES_KEY] as GalleryCoverFieldInterfaceStore;
}

/**
 * 注册可用于时间轴封面字段的字段接口。
 * @param interfaceNames 需要追加注册的字段接口名称列表。
 */
export function registerTimelineCoverFieldInterfaces(interfaceNames: string[] = []) {
  const store = getGalleryCoverFieldInterfaceStore();

  interfaceNames.filter(Boolean).forEach((interfaceName) => {
    store.interfaces.add(interfaceName);
  });
}

/**
 * 获取当前已注册的时间轴封面字段接口列表。
 */
export function getTimelineCoverFieldInterfaces() {
  return Array.from(getGalleryCoverFieldInterfaceStore().interfaces);
}

/**
 * 解析时间轴字段选择器允许的接口列表。
 * @param allowedInterfaces 显式传入的接口白名单。
 * @param useRegisteredInterfaces 是否在未显式传入白名单时，读取全局注册表。
 */
export function resolveTimelineFieldInterfaces(
  allowedInterfaces: string[] = [],
  useRegisteredInterfaces = false,
) {
  const normalizedAllowedInterfaces = allowedInterfaces.filter(Boolean);

  if (normalizedAllowedInterfaces.length > 0) {
    return normalizedAllowedInterfaces;
  }

  return useRegisteredInterfaces ? getTimelineCoverFieldInterfaces() : [];
}

/**
 * 重置时间轴封面字段接口注册表，仅用于测试场景。
 */
export function resetTimelineCoverFieldInterfacesForTest() {
  const registryTarget = globalThis as GalleryCoverFieldGlobal;

  registryTarget[GALLERY_COVER_FIELD_INTERFACES_KEY] = {
    interfaces: new Set(DEFAULT_GALLERY_COVER_FIELD_INTERFACES),
  };
}
