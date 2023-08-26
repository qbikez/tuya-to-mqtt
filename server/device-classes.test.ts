import { describe } from "node:test";
import { Cover, CoverState, CoverStateDp } from "./devices/cover";
import Device from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";
import { DeviceWrapper, findByTopic } from "./devices";
import { DeviceConfig } from "./devices/base-device";
import { createDevice } from "./device-classes";

vi.mock("../lib/tuya-driver/src/device");

describe("factory", () => {
  const deviceConfig = { name: "my cover" } as DeviceConfig;

  it("creates device based on configured type", () => {
    const device = createDevice(
      {} as DiscoveryMessage,
      { ...deviceConfig, type: "cover" },
      new Device(deviceConfig)
    );

    expect(device.type).toBe("cover");
  });

  it("creates device based on productKey", () => {
    const device = createDevice(
      { productKey: "aacztutbu69gdpdf" } as DiscoveryMessage,
      deviceConfig,
      new Device(deviceConfig)
    );

    expect(device.type).toBe("cover");
  });
});

