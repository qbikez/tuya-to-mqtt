import { Device } from "../../lib/tuya-driver/src";
import { DeviceBase, DeviceConfig } from "./base-device";

vi.mock("../../lib/tuya-driver/src/device");

const cfg: DeviceConfig = {
  id: "bf9346c6635dfb4b38sj2p",
  name: "roleta Jeremi",
  ip: "192.168.0.1",
  key: "blah",
};
const deviceClient = new Device(cfg);
const baseDevice = new DeviceBase(cfg, deviceClient);

describe("base device", () => {
  it("state message", () => {
    const dps = { "1": "open" };
    deviceClient.getState = vitest.fn().mockReturnValue(dps);
    baseDevice.onClientState(dps);

    const stateMessage = baseDevice.stateMessage();
    expect(stateMessage).toEqual({
      dps: { "1": "open" },
      id: undefined,
      ip: undefined,
      state: {},
      sensors: {},
      status: "offline",
    });
  });
});
