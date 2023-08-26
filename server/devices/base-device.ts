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

type DeviceDiscovery = {
  ids: string[];
  name: string;
  mf: string;
  mdl?: string;
};

type EntityDiscovery = {
  name: string;
  state_topic: string;
  command_topic: string;
  availability_topic: string;
  payload_available: string;
  payload_not_available: string;
  unique_id: string;
  device: DeviceDiscovery;
};

export class DeviceBase {
  public type: DeviceType = "generic";
  public displayName: string;
  public name: string;
  log: logfactory.Debugger;

  constructor(protected options: DeviceConfig, protected client: TuyaDevice) {
    this.displayName = (options.name ?? options.id) + (options.idSuffix ?? "");
    this.name = this.sanitizeName(options.name) + (options.idSuffix ?? "");
    this.log = logfactory(`tuya:device:${this.name}`);

    client.on("state-change", (state) => this.onClientState(state));
    client.on("connected", () => {
      this.log("connected");
      this.refreshClientState();
    });
    client.on("disconnected", () => {
      this.log("disconnected");
    });
    client.on("error", (err) => {
      this.log("ERROR", err);
    });

  }

  protected sanitizeName(name: string) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, "_").toLowerCase();
  }

  public deviceTopic(baseTopic: string) {
    return `${baseTopic}/${this.name}`;
  }

  public discoveryMessage(baseTopic: string): Record<string, EntityDiscovery> {
    const deviceTopic = this.deviceTopic(baseTopic);
    const deviceData = this.deviceData();
    const discoveryData = this.discoveryData(deviceTopic);

    return {
      [`${this.type}/${this.name}/config`]: {
        ...discoveryData,
        device: deviceData,
      },
    };
  }

  protected deviceData(): DeviceDiscovery {
    return {
      ids: [this.options.id + (this.options.idSuffix ?? "")],
      name: this.displayName,
      mf: "Tuya",
    };
  }

  protected discoveryData(
    deviceTopic: string
  ): Omit<EntityDiscovery, "device"> {
    return {
      name: this.name,
      state_topic: `${deviceTopic}/state`,
      command_topic: `${deviceTopic}/command`,
      availability_topic: `${deviceTopic}/status`,
      payload_available: "online",
      payload_not_available: "offline",
      unique_id: this.name,
    };
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
    this.log(`sending to ${this.name}`, message);
    this.client.setState(message);
    // make sure we recieve the updated state
    this.refreshClientState();
  }

  protected onClientState(state: DataPointSet) {
    this.log(`state change`, state);
  }

  protected refreshClientState() {
    this.client.update();
  }
}
