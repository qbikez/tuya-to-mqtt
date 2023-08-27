import TuyaDevice, {
  DataPointSet,
  DeviceOptions,
} from "../../lib/tuya-driver/src/device";

import logfactory from "debug";
import { EntityDiscovery, StateMessage, deviceData, discoveryData } from "../homeassistant";
const log = logfactory("tuya:device");

export type DeviceType = "cover" | "switch" | "plug" | "generic";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
  idSuffix?: string;
};


export type Sensor = {
  dpId: string;
  identifier: string;
  values: Array<object | number | boolean | string>;
  pitch?: number;
  scale?: number;
  unit?: string;
};


export class DeviceBase {
  public type: DeviceType = "generic";
  public displayName: string;
  public name: string;
  log: logfactory.Debugger;
  dps: DataPointSet = {};

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

  public discoveryMessage(baseTopic: string): Record<string, EntityDiscovery> {
    const topic = deviceTopic(this, baseTopic);
    const devData = deviceData(
      this.options.id + (this.options.idSuffix ?? ""),
      this.displayName
    );
    const discovery = discoveryData(topic, this.name);

    return {
      [`${this.type}/${this.name}/config`]: {
        ...discovery,
        device: devData,
      },
    };
  }

  public stateMessage(): StateMessage {
    return {
      [`state`]: {},
      [`status`]: this.client.connected ? "online" : "offline",
      [`dps`]: this.dps,
      [`ip`]: this.client.ip,
      [`id`]: this.client.id,
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

  public onClientState(state: DataPointSet) {
    this.log(`state change`, state);
    this.dps = this.client.getState();
  }

  protected refreshClientState() {
    this.client.update();
  }
}

export function mapDps(dps: DataPointSet, sensors: Record<string, Sensor>, includeUnknown = false): StateMessage {
  const result: StateMessage = {};
  for (const [dp, value] of Object.entries(dps)) {
    const sensor = sensors[dp];
    if (sensor) {
      const numberValue = value as number;
      const scaledValue = sensor.scale ? numberValue / Math.pow(10, sensor.scale) : value;
      result[sensor.identifier] = scaledValue;
    } else if(includeUnknown) {
      result[dp] = value;
    }
  }
  return result;
}

export function deviceTopic(device: DeviceBase, baseTopic: string) {
  return `${baseTopic}/${device.name}`;
}
