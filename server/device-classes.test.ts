import { describe } from "node:test";
import { Cover, DeviceConfig } from "./device-classes";
import Device from "../lib/tuya-driver/src/device";
import { MqttClient } from "mqtt";

describe("cover", () => {
  it("discoveryPayload", () => {
    const expected = {
      name: "roleta_jeremi",
      state_topic: "tuya/roleta_jeremi/state",
      command_topic: "tuya/roleta_jeremi/command",
      availability_topic: "tuya/roleta_jeremi/status",
      payload_available: "online",
      payload_not_available: "offline",
      unique_id: "roleta_jeremi",
      device: {
        ids: ["bf9346c6635dfb4b38sj2p"],
        name: "roleta Jeremi",
        mf: "Tuya",
        mdl: "Cover",
      },
      position_topic: "tuya/roleta_jeremi/position",
      set_position_topic: "tuya/roleta_jeremi/set_position",
      optimistic: true,
    };

    const cfg: DeviceConfig = {
        id: "bf9346c6635dfb4b38sj2p",
        name: "roleta Jeremi",     
        ip: "",
        key: ""   
    };
    const device = new Cover(cfg, new Device(cfg), undefined as any as MqttClient);

    const payload = device.discoveryPayload("tuya/roleta_jeremi/");
    expect(payload).toEqual(expected);
  });
});
