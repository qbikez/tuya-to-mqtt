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
          mdl: "Switch/Socket",
        },
      },
      [`number/${sanitizedName}/countdown_1/config`]: expect.any(Object),
      [`switch/${sanitizedName}/switch_1/config`]: expect.any(Object),
      [`sensor/${sanitizedName}/relay_status/config`]: expect.any(Object)
    };

    const message = sw.discoveryMessage("tuya");
    expect(message).toMatchObject(expected);
  });

  it("state message", () => {
    const dps = { "1": true, "9": 0, "14": "off" };
    deviceClient.getState = vitest.fn().mockReturnValue(dps);

    sw.onClientState(dps);
    const stateMessage = sw.stateMessage();

    expect(stateMessage).toEqual({
      dps,
      id: undefined,
      ip: undefined,
      state: "ON",
      status: "offline",
      sensors: {
        "1": {
          dpId: "1",
          identifier: "switch_1",
          type: "switch",
          values: [true, false],
        },
        "14": {
          dpId: "14",
          identifier: "relay_status",
          values: ["off", "on", "memory"],
        },
        "9": {
          dpId: "9",
          identifier: "countdown_1",
          pitch: 1,
          scale: 0,
          type: "number",
          unit: "seconds",
          values: [0, 86400],
        },
      },
      switch_1: true,
      countdown_1: 0,
      relay_status: "off",
    });
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
        sw.onClientState({ "1": sequence[0] });
        sw.onClientState({ "1": sequence[1] });

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
