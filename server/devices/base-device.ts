import TuyaDevice, {
  DataPointSet,
  DeviceOptions,
} from "../../lib/tuya-driver/src/device";

import logfactory from "debug";
import {
  DeviceDiscovery,
  EntityDiscovery,
  EntityType,
  StateMessage,
  deviceData,
  discoveryData,
} from "../homeassistant";
import { TypedEventEmitter } from "../shared/event-emiter";
const log = logfactory("tuya:device");

export type DeviceType = "cover" | "switch" | "plug" | "generic";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
  idSuffix?: string;
};

export type DataPointValue = number | boolean | string;

export type Sensor = {
  dpId: string;
  identifier: string;
  values: Array<DataPointValue>;
  pitch?: number;
  scale?: number;
  unit?: string;
  type?: EntityType;
  device_class?: string;
};

export interface DeviceCallbacks {
  stateChanged: (state: DataPointSet) => void;
}

export class DeviceBase extends TypedEventEmitter<DeviceCallbacks> {
  public type: DeviceType = "generic";
  public displayName: string;
  public name: string;
  log: logfactory.Debugger;
  dps: DataPointSet = {};
  lastStateChange: DataPointSet = {};

  constructor(protected options: DeviceConfig, protected client: TuyaDevice) {
    super();

    this.displayName = (options.name ?? options.id) + (options.idSuffix ?? "");
    this.name = this.sanitizeName(options.name) + (options.idSuffix ?? "");
    this.log = logfactory(`tuya:device:${this.name}`);

    client.on("state-change", (state) => {
      this.onClientState(state);
      this.emit("stateChanged", state);
    });
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

  protected sensorDiscovery(
    deviceTopic: string,
    device: DeviceDiscovery
  ): Record<string, EntityDiscovery> {
    const sensorDiscovery = {};

    this.getSensors().forEach((sensor) => {
      const entityType = sensor.type ?? "sensor";
      const sensorTopic = `${entityType}/${this.name}/${sensor.identifier}/config`;

      const entitySpecific = this.entitySpecificDiscovery(
        entityType,
        sensor,
        deviceTopic
      );

      const sensorMessage = {
        device,
        availability_topic: `${deviceTopic}/status`,
        payload_available: "online",
        payload_not_available: "offline",

        unique_id: `${this.name}_${sensor.identifier}`,
        name: `${this.displayName} ${sensor.identifier}`,

        unit_of_measurement: sensor.unit,

        state_topic: `${deviceTopic}/${sensor.identifier}`,

        ...entitySpecific,
        //value_template: `{{ value_json.${sensor.identifier} }}`,
      };

      sensorDiscovery[sensorTopic] = sensorMessage;
    });

    return sensorDiscovery;
  }

  private entitySpecificDiscovery(
    entityType: string,
    sensor: Sensor,
    deviceTopic: string
  ) {
    switch (entityType) {
      case "number":
        return {
          min: sensor.values[0],
          max: sensor.values[1],
          step: sensor.pitch,
          command_topic: `${deviceTopic}/set_${sensor.identifier}`,
        };
      case "switch":
        return {
          command_topic: `${deviceTopic}/set_${sensor.identifier}`,
        };
      case "sensor":
        return {
          device_class: sensor.device_class,
          expire_after: 120,
        };
      default:
        return {};
    }
  }

  public discoveryMessage(baseTopic: string): Record<string, EntityDiscovery> {
    const deviceTopic = getDeviceTopic(baseTopic, this);
    const devData = deviceData(
      this.options.id + (this.options.idSuffix ?? ""),
      this.displayName
    );
    const discovery = discoveryData(deviceTopic, this.name);
    const sensorDiscovery = this.sensorDiscovery(deviceTopic, devData);

    return {
      [`${this.type}/${this.name}/config`]: {
        ...discovery,
        device: devData,
      },
      ...sensorDiscovery,
    };
  }

  public fullStateMessage(): StateMessage {
    return this.stateMessage(this.dps);
  }

  public stateMessage(dps: DataPointSet): StateMessage {
    const defaultState = {
      [`state`]: {},
      [`status`]: this.client.connected ? "online" : "offline",
      [`dps`]: dps,
      [`ip`]: this.client.ip,
      [`id`]: this.client.id,
    };

    const sensors = this.getSensors();
    var mapped = mapDps(dps, sensors, false);
    return {
      ...defaultState,
      ...mapped,
      sensors,
    };
  }

  public command(command: string, arg1: string): boolean {
    const sensors = this.getSensors();
    const sensorCommand = commandToDps(Object.values(sensors), command, arg1);
    if (sensorCommand) {
      this.setClientState(sensorCommand);
      return true;
    }

    return false;
  }

  protected setClientState(message: DataPointSet) {
    this.log(`sending to ${this.name}`, message);
    this.client.setState(message);
    // make sure we recieve the updated state
    this.refreshClientState();
  }

  public onClientState(changed: DataPointSet) {
    this.log(`state change`, changed);
    this.dps = this.client.getState();
    this.lastStateChange = changed;
  }

  protected refreshClientState() {
    this.client.update();
  }

  protected getSensors(): Sensor[] {
    return [];
  }
}

export function mapDps(
  dps: DataPointSet,
  sensors: Sensor[],
  includeUnknown = false
): StateMessage {
  const result: StateMessage = {};
  for (const [dp, value] of Object.entries(dps)) {
    const matchingSensors = sensors.filter((s) => s.dpId === dp);
    if (matchingSensors.length > 0) {
      for (const sensor of matchingSensors) {
        const sensorType = sensor.type ?? "sensor";
        switch (sensorType) {
          case "number":
          case "sensor":
            const numberValue = value as number;
            const scaledValue = sensor.scale
              ? numberValue / Math.pow(10, sensor.scale)
              : value;
            result[sensor.identifier] = scaledValue;
            break;
          case "switch":
            result[sensor.identifier] = value ? "ON" : "OFF";
            break;
          default:
            result[sensor.identifier] = value;
            break;
        }
      }
    } else if (includeUnknown) {
      result[dp] = value;
    }
  }
  return result;
}

export function getDeviceTopic(baseTopic: string, device: DeviceBase | string) {
  if (typeof device === "string") {
    return `${baseTopic}/${device}`;
  }
  return `${baseTopic}/${device.name}`;
}

export function commandToDps(
  sensors: Sensor[],
  command: string,
  arg1: string
): DataPointSet | undefined {
  const targetSensor = sensors.find(
    (sensor) => command === `set_${sensor.identifier}`
  );
  if (targetSensor) {
    const value = parseSensorValue(targetSensor, arg1);
    return { [targetSensor.dpId]: value };
  }
  return undefined;
}

export function parseSensorValue(
  sensor: Sensor,
  value: string
): DataPointValue {
  switch (sensor.type) {
    case "switch":
      return value.toLowerCase() === "true" || value.toLowerCase() === "on";
    case "number":
      return parseInt(value);
    default:
      return value;
  }
}
