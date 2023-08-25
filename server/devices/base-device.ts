import TuyaDevice, {
  DataPointSet,
  DeviceOptions,
} from "../../lib/tuya-driver/src/device";

import logfactory from "debug";
const log = logfactory("tuya:device");

export type DeviceType = "cover" | "switch" | "plug" | "generic";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
  idSuffix?: string;
};

export class DeviceBase {
  public type: DeviceType = "generic";
  public displayName: string;
  public name: string;

  constructor(protected options: DeviceConfig, protected client: TuyaDevice) {
    this.displayName = (options.name ?? options.id) + (options.idSuffix ?? "");
    this.name = this.sanitizeName(options.name) + (options.idSuffix ?? "");
    client.on("state-change", (state) => this.onStateChange(state));
  }

  protected sanitizeName(name: string) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
  }

  protected onStateChange(state: DataPointSet) {}

  public discoveryTopic(discoveryPrefix: string) {
    return `${discoveryPrefix}/${this.type}/${this.name}/config`;
  }

  public deviceTopic(baseTopic: string) {
    return `${baseTopic}/${this.name}`;
  }

  public discoveryMessage(baseTopic: string) {
    const deviceTopic = this.deviceTopic(baseTopic);
    const deviceData = {
      ids: [this.options.id + (this.options.idSuffix ?? "")],
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
  ): Record<string, object | string | number | boolean> {
    const deviceTopic = this.deviceTopic(baseTopic);
    return {
      [`${deviceTopic}/state`]: {},
      [`${deviceTopic}/status`]: this.client.connected ? "online" : "offline",
      [`${deviceTopic}/dps`]: this.client.getState(),
    };
  }

  public command(command: string, arg1: string) {
    throw new Error("Method not implemented.");
  }

  protected setClientState(message: DataPointSet) {
    log(`sending to ${this.name}`, message);
    this.client.setState(message);
  }
}
