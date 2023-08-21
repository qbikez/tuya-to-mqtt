import TuyaDevice, { DeviceOptions } from "../lib/tuya-driver/src/device";
import * as mqtt from "mqtt";

export type DeviceType = "Cover" | "Switch" | "Plug";

export type DeviceConfig = DeviceOptions & {
  type: DeviceType;
  name: string;
};

export class DeviceBase {
  constructor(protected options: DeviceConfig) {}

  public discoveryPayload(baseTopic: string) {
    const deviceData = {
      ids: [this.options.id],
      name: this.options.name ?? this.options.id,
      mf: "Tuya",
    };
    const discoveryData = {
      name: this.options.name ?? this.options.id,
      state_topic: `${baseTopic}state`,
      command_topic: `${baseTopic}command`,
      availability_topic: `${baseTopic}status`,
      payload_available: "online",
      payload_not_available: "offline",
      unique_id: this.options.name,
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
    const discoveryData = {
      ...baseData,
      position_topic: `${baseTopic}position`,
      set_position_topic: `${baseTopic}set_position`,
      optimistic: true,
    };

    return discoveryData;
  }
}
