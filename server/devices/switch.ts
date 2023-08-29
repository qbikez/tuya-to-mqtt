import { DeviceBase, DeviceConfig, DeviceType } from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";
import { StateMessage } from "../homeassistant";

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

  public override stateMessage(): StateMessage {
    const baseData = super.stateMessage();
    return {
      ...baseData,
      [`state`]: this.state,
    };
  }

  override command(command: string, arg1: string) {
    switch (command) {
      case "command": // open, close, stop
        const state = arg1.toLowerCase();
        const targetState =
          state == "on" || state == "open" || state == "true" ? "ON" : "OFF";
        this.setState(targetState);
        return true;
      default:
        return false;
    }
  }
}
