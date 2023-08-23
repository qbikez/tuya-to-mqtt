import { describe } from "node:test";
import {
  Cover,
  CoverState,
  CoverStateDp,
  DeviceConfig,
  createDevice,
} from "./device-classes";
import Device from "../lib/tuya-driver/src/device";
import { DiscoveryMessage } from "../lib/tuya-driver/src/find";

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

describe("cover", () => {
  const cfg: DeviceConfig = {
    id: "bf9346c6635dfb4b38sj2p",
    name: "roleta Jeremi",
    ip: "",
    key: "",
  };
  const deviceClient = new Device(cfg);
  const cover = new Cover(cfg, deviceClient);

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

    const message = cover.discoveryMessage("tuya");
    expect(message).toEqual(expected);
  });

  describe("stateChange", () => {
    const changes = [
      { sequence: ["", "open"], state: "opening", position: 0 },
      { sequence: ["open", "stop"], state: "open", position: 0 },
      { sequence: ["open", "close"], state: "closing", position: 100 },
      { sequence: ["close", "stop"], state: "closed", position: 100 },
    ];
    it.each(changes)(
      "state change: $sequence => $state",
      ({ sequence, state, position }) => {
        cover.state = "unknown";
        cover.position = 50;
        cover.lastMove = "up";

        cover.onStateChange({ "1": sequence[0] });
        cover.onStateChange({ "1": sequence[1] });

        expect(cover.state).toBe(state);
        expect(cover.position).toBe(position);
      }
    );
  });

  describe("setState", () => {
    const changes: Array<{ state: CoverState; dp: CoverStateDp }> = [
      { state: "open", dp: "open" },
      { state: "closed", dp: "close" },
    ];

    it.each(changes)("setState $state => $dp", ({ state, dp }) => {
      cover.setState(state as CoverState);

      expect(deviceClient.setState).toBeCalledWith({ "1": dp });
    });
  });
});
