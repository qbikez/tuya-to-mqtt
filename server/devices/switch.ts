import {
  DeviceBase,
  DeviceConfig,
  DeviceType,
  Sensor,
  getDeviceTopic,
} from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";
import {
  EntityDiscovery,
  StateMessage,
  deviceData,
  discoveryData,
} from "../homeassistant";

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

  override onClientState(dps: DataPointSet) {
    super.onClientState(dps);

    const baseState = dps["1"] as boolean;

    this.state = baseState === true ? "ON" : "OFF";
  }

  override discoveryMessage(
    baseTopic: string
  ): Record<string, EntityDiscovery> {
    const deviceTopic = getDeviceTopic(this, baseTopic);
    const baseDiscovery = discoveryData(deviceTopic, this.name);
    const baseData = super.discoveryMessage(baseTopic);
    const devData = deviceData(
      this.options.id + (this.options.idSuffix ?? ""),
      this.displayName
    );

    return {
      ...baseData,
      [`${this.type}/${this.name}/config`]: {
        device: {
          ...devData,
          mdl: "Switch/Socket",
        },
        ...baseDiscovery,
      },
    };
  }

  public override stateMessage(): StateMessage {
    const baseData = super.stateMessage();
    return {
      ...baseData,
      [`state`]: this.state,
    };
  }

  protected override getSensors(): Record<string, Sensor> {
    const sensors: Record<string, Sensor> = {
      "1": {
        dpId: "1",
        identifier: "switch_1",
        values: [true, false],
        type: "switch",
      },
      "9": {
        dpId: "9",
        identifier: "countdown_1",
        values: [0, 86400],
        pitch: 1,
        scale: 0,
        unit: "seconds",
        type: "number",
      },
      "14": {
        dpId: "14",
        identifier: "relay_status",
        values: ["off", "on", "memory"],
      },
    };

    return sensors;
  }

  override command(command: string, arg1: string) {
    switch (command) {
      case "command": // open, close, stop
        const state = arg1.toString().toLowerCase();
        const targetState =
          state == "on" || state == "open" || state == "true" ? "ON" : "OFF";
        this.setState(targetState);
        return true;
      default:
        return super.command(command, arg1);
    }
  }
}
