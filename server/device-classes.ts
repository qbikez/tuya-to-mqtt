import TuyaDevice, {
  DataPointSet,
  DeviceOptions,
} from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";

export type DeviceType = "cover" | "switch" | "plug" | "generic";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
};

export function createDevice(
  msg: DiscoveryMessage,
  config: DeviceConfig,
  client: TuyaDevice
) {
  const modelType =
    config.type?.toLocaleLowerCase() ?? getModel(msg.productKey);

  switch (modelType) {
    case "cover":
      return new Cover(config, client);
    case "switch":
      return new Switch(config, client);
    case "plug":
      return new Plug(config, client);
    default:
      return new DeviceBase(config, client);
  }
}

export function getModel(productKey: string): DeviceType {
  const knownModels: Record<DeviceType, string[]> = {
    cover: ["aacztutbu69gdpdf"],
    switch: ["key7axydcvmea3x9"],
    plug: ["keyjup78v54myhan"],
    generic: [],
  };
  return (
    (Object.entries(knownModels).find(([_, models]) =>
      models.includes(productKey)
    )?.[0] as DeviceType) ?? "generic"
  );
}
export class DeviceBase {
  public type: DeviceType = "generic";
  public displayName: string;
  public name: string;

  constructor(protected options: DeviceConfig, protected client: TuyaDevice) {
    this.displayName = (options.name ?? options.id) + "_2";
    this.name = options.name.replace(/ /g, "_").toLowerCase() + "_2";
    client.on("state-change", (state) => this.onStateChange(state));
  }

  protected onStateChange(state: DataPointSet) {}

  public discoveryTopic(discoveryPrefix: string) {
    return `${discoveryPrefix}/${this.type}/${this.name}/config`;
  }

  public discoveryMessage(baseTopic: string) {
    const deviceTopic = `${baseTopic}/${this.name}`;
    const deviceData = {
      ids: [this.options.id + "_2"],
      name: this.displayName,
      mf: "Tuya",
    };
    const discoveryData = {
      name: this.name,
      state_topic: `${deviceTopic}/state`,
      command_topic: `${deviceTopic}/command`,
      availability_topic: `${deviceTopic}/status`,
      payload_available: "online",
      payload_not_available: "offline",
      unique_id: this.name,
      device: deviceData,
    };

    return discoveryData;
  }

  public stateMessage(
    baseTopic: string
  ): Record<string, object | string | number> {
    const deviceTopic = `${baseTopic}/${this.name}`;
    return {
      [`${deviceTopic}/state`]: {},
      [`${deviceTopic}/status`]: this.client.connected ? "online" : "offline",
      [`${deviceTopic}/dps`]: this.client.getState(),
    };
  }
}

export class Switch extends DeviceBase {
  public override type: DeviceType = "switch";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }
}

export class Plug extends DeviceBase {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }
}

type CoverState = "open" | "opening" | "closed" | "closing" | "unknown";
type CoverStateDp = "close" | "open" | "stop";
type Direction = "up" | "down";
export class Cover extends DeviceBase {
  private static readonly positionClosed = 100;
  private static readonly positionOpen = 0;
  private static readonly positionUnknown = 50;

  public override type: DeviceType = "cover";
  
  private state: CoverState = "unknown";
  private lastMove: Direction = "up";
  private position: number = 0;

  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  public override discoveryMessage(baseTopic: string) {
    const baseData = super.discoveryMessage(baseTopic);
    const deviceTopic = `${baseTopic}/${this.name}`;

    const device = {
      ...baseData.device,
      mdl: "Cover",
    };
    const message = {
      ...baseData,
      device,
      position_topic: `${deviceTopic}/position`,
      set_position_topic: `${deviceTopic}/set_position`,
      optimistic: true,
    };

    return message;
  }

  public override stateMessage(baseTopic: string) {
    const baseData = super.stateMessage(baseTopic);
    const deviceTopic = `${baseTopic}/${this.name}`;
    return {
      ...baseData,
      [`${deviceTopic}/state`]: this.state,
      [`${deviceTopic}/position`]: this.position,
    };
  }

  override onStateChange(dps: DataPointSet) {
    const baseState = dps["1"] as CoverStateDp;
    const isMoving = baseState == "open" || baseState == "close";
    if (isMoving) {
      this.lastMove = baseState == "open" ? "up" : "down";
    }
    this.state = this.translateState(baseState);
    this.position = this.getPosition();
  }

  private getPosition(): number {
    return this.state == "open"
      ? Cover.positionOpen
      : this.state == "closed"
      ? Cover.positionClosed
      : this.lastMove == "up"
      ? Cover.positionOpen
      : this.lastMove == "down"
      ? Cover.positionClosed
      : Cover.positionUnknown;
  }

  private translateState(state: CoverStateDp): CoverState {
    switch (state) {
      case "open":
        return "opening";
      case "close":
        return "closing";
      case "stop":
        return this.lastMove == "up"
          ? "open"
          : this.lastMove == "down"
          ? "closed"
          : "unknown";
      default:
        return "unknown";
    }
  }
}
