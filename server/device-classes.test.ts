import { describe } from "node:test";
import { Cover, DeviceConfig, createDevice } from "./device-classes";
import Device from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";

describe("factory", () => {
  it("creates device based on configured type", () => {
    const device = createDevice(
      {} as DiscoveryMessage,
      { type: "cover", name: "my cover" } as DeviceConfig,
      {} as Device
    );

    expect(device.type).toBe("Cover");
  });

  it("creates device based on productKey", () => {
    const device = createDevice(
      { productKey: "aacztutbu69gdpdf" } as DiscoveryMessage,
      { name: "my cover" } as DeviceConfig,
      {} as Device
    );

    expect(device.type).toBe("Cover");
  });
});

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
      key: "",
    };
    const device = new Cover(cfg, new Device(cfg));

    const message = device.discoveryMessage("tuya");
    expect(message).toEqual(expected);
  });
});
