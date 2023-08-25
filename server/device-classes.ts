import TuyaDevice, { DataPointSet } from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";

import { DeviceBase, DeviceConfig, DeviceType } from "./devices/base-device";
import { Cover } from "./devices/cover";

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

export type SwitchState = "ON" | "OFF";
export class Switch extends DeviceBase {
  public override type: DeviceType = "switch";
  public state: SwitchState;

  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  public setState(state: SwitchState) {
    const boolState = state === "ON";
    this.setClientState({ "1": boolState });
  }

  override onStateChange(dps: DataPointSet) {
    const baseState = dps["1"] as boolean;

    this.state = baseState === true ? "ON" : "OFF";
  }

  override discoveryMessage(baseTopic: string) {
    const baseData = super.discoveryMessage(baseTopic);
    return {
      device: {
        ...baseData.device,
        mdl: "Switch/Socket"
      },
      ...baseData,
    }
  }

  public override stateMessage(baseTopic: string) {
    const baseData = super.stateMessage(baseTopic);
    const deviceTopic = `${baseTopic}/${this.name}`;
    return {
      ...baseData,
      [`${deviceTopic}/state`]: this.state,
    };
  }

  override command(command: string, arg1: string) {
    switch (command) {
      case "command": // open, close, stop
        const state = arg1.toLowerCase();
        const targetState = (state == "on" || state == "open" || state == "true") ? "ON" : "OFF";
        this.setState(targetState);
        return;
      default:
        throw new Error(`Unknown command ${command} for device ${this.type}`);
    }
  }
}

export class Plug extends DeviceBase {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }
}
