import TuyaDevice, { DeviceOptions } from "../lib/tuya-driver/src/device";
import * as mqtt from "mqtt";

export type DeviceType = "Cover" | "Switch" | "Plug";

export type DeviceConfig = DeviceOptions & {
  type?: DeviceType;
  name: string;
};

export class DeviceBase {
  public displayName: string;
  public name: string;
  constructor(protected options: DeviceConfig) {
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

export class Cover extends DeviceBase {
  constructor(
    options: DeviceConfig,
    private client: TuyaDevice,
    private mqtt: mqtt.MqttClient
  ) {
    super(options);
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
