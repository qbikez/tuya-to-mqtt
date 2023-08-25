import { DeviceBase, DeviceConfig, DeviceType } from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";

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
    const baseData = super.discoveryMessage(baseTopic)[`${this.type}/${this.name}/config`];
    return {
      [`${this.type}/${this.name}/config`]: {
        device: {
          ...baseData.device,
          mdl: "Switch/Socket",
        },
        ...baseData,
      },
    };
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
        const targetState =
          state == "on" || state == "open" || state == "true" ? "ON" : "OFF";
        this.setState(targetState);
        return;
      default:
        throw new Error(`Unknown command ${command} for device ${this.type}`);
    }
  }
}
