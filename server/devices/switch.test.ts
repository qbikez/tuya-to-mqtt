import Device from "../../lib/tuya-driver/src/device";
import { DeviceWrapper, findByTopic } from "../devices";
import { DeviceConfig } from "./base-device";
import { Cover, CoverState, CoverStateDp } from "./cover";
import { Switch, SwitchState } from "./switch";

vi.mock("../../lib/tuya-driver/src/device");

describe("switch", () => {
  const cfg: DeviceConfig = {
    id: "someMagicId",
    name: "mySwitch+",
    ip: "",
    key: "",
  };
  const deviceClient = new Device(cfg);
  const sw = new Switch(cfg, deviceClient);
  const sanitizedName = sw.name;

  it("discoveryPayload", () => {
    const expected = {
      [`switch/${sanitizedName}/config`]: {
        name: `${sanitizedName}`,
        state_topic: `tuya/${sanitizedName}/state`,
        command_topic: `tuya/${sanitizedName}/command`,
        availability_topic: `tuya/${sanitizedName}/status`,
        payload_available: "online",
        payload_not_available: "offline",
        unique_id: `${sanitizedName}`,
        device: {
          ids: ["someMagicId"],
          name: cfg.name,
          mf: "Tuya",
        },
      },
    };

    const message = sw.discoveryMessage("tuya");
    expect(message).toEqual(expected);
  });

  describe("find by topic", () => {
    const devices: DeviceWrapper[] = [
      {
        config: cfg,
        device: sw,
      },
    ];
    const cases = [
      { topic: `tuya/${sanitizedName}/state`, expected: sw },
      { topic: `tuya/${sanitizedName}/set_position`, expected: sw },
      { topic: `tuya/${sanitizedName}`, expected: sw },
    ];
    it.each(cases)("$topic", ({ topic, expected }) => {
      const found = findByTopic(devices, "tuya", topic);
      expect(found).not.toBeNull();
      expect(found?.device).toBe(expected);
    });
  });

  describe("stateChange", () => {
    const changes = [
      { sequence: [false, true], state: "ON" },
      { sequence: [true, false], state: "OFF" },
    ];
    it.each(changes)(
      "state change: $sequence => $state",
      ({ sequence, state }) => {
        sw.onStateChange({ "1": sequence[0] });
        sw.onStateChange({ "1": sequence[1] });

        expect(sw.state).toBe(state);
      }
    );
  });

  describe("setState", () => {
    const changes: Array<{ state: SwitchState; dp: boolean }> = [
      { state: "ON", dp: true },
      { state: "OFF", dp: false },
    ];

    it.each(changes)("setState $state => $dp", ({ state, dp }) => {
      sw.setState(state as SwitchState);

      expect(deviceClient.setState).toBeCalledWith({ "1": dp });
    });
  });

  describe("commands", () => {
    it("set_state", () => {
      sw.setState = vi.fn();
      sw.command("command", "OFF");

      expect(sw.setState).toBeCalledWith("OFF");
    });
  });
});
