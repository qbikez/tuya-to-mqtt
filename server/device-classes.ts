import TuyaDevice, { DeviceOptions } from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";

export type DeviceType = "Cover" | "Switch" | "Plug" | "Generic";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
};

export function createDevice(
  msg: DiscoveryMessage,
  config: DeviceConfig,
  client: TuyaDevice
) {
  const modelType = config.type ?? getModel(msg.productKey);

  switch (modelType) {
    case "Cover":
      return new Cover(config, client);
    case "Switch":
      return new Switch(config, client);
    case "Plug":
      return new Plug(config, client);
    default:
      return new DeviceBase(config, client);
  }
}

export function getModel(productKey: string): DeviceType {
  const knownModels: Record<DeviceType, string[]> = {
    Cover: ["aacztutbu69gdpdf"],
    Switch: ["key7axydcvmea3x9"],
    Plug: ["keyjup78v54myhan"],
    Generic: [],
  };
  return Object.entries(knownModels).find(([_, models]) =>
    models.includes(productKey)
  )?.[0] as DeviceType ?? "Generic";
}
export class DeviceBase {
  public type: DeviceType = "Generic";
  public displayName: string;
  public name: string;

  constructor(protected options: DeviceConfig, protected client: TuyaDevice) {
    this.displayName = options.name ?? options.id;
    this.name = options.name.replace(/ /g, "_").toLowerCase();
  }

  public discoveryPayload(baseTopic: string) {
    const deviceData = {
      ids: [this.options.id],
      name: this.displayName,
      mf: "Tuya",
    };
    const discoveryData = {
      name: this.name,
      state_topic: `${baseTopic}state`,
      command_topic: `${baseTopic}command`,
      availability_topic: `${baseTopic}status`,
      payload_available: "online",
      payload_not_available: "offline",
      unique_id: this.name,
      device: deviceData,
    };

    return discoveryData;
  }
}

export class Switch extends DeviceBase {
  public override type: DeviceType = "Switch";
  constructor(
    options: DeviceConfig,
    client: TuyaDevice,
  ) {
    super(options, client);
  }

}

export class Plug extends DeviceBase {
  public override type: DeviceType = "Plug";
  constructor(
    options: DeviceConfig,
    client: TuyaDevice,
  ) {
    super(options, client);
  }

}

export class Cover extends DeviceBase {
  public override type: DeviceType = "Cover";
  constructor(
    options: DeviceConfig,
    client: TuyaDevice,
  ) {
    super(options, client);
  }

  public override discoveryPayload(baseTopic: string) {
    const baseData = super.discoveryPayload(baseTopic);
    const device = {
      ...baseData.device,
      mdl: "Cover",
    };
    const discoveryData = {
      ...baseData,
      device,
      position_topic: `${baseTopic}position`,
      set_position_topic: `${baseTopic}set_position`,
      optimistic: true,
    };

    return discoveryData;
  }
}
