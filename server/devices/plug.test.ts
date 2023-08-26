import Device from "../../lib/tuya-driver/src/device";
import { DeviceWrapper, findByTopic } from "../devices";
import { DeviceConfig } from "./base-device";
import { Switch as Plug, SwitchState } from "./switch";

vi.mock("../../lib/tuya-driver/src/device");

describe("plug", () => {
  const cfg: DeviceConfig = {
    id: "someMagicId",
    name: "myPlug+",
    ip: "",
    key: "",
  };
  const deviceClient = new Device(cfg);
  const plug = new Plug(cfg, deviceClient);
  const sanitizedName = plug.name;

  it("discoveryPayload for switch", () => {
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

    const message = plug.discoveryMessage("tuya");
    expect(message).toEqual(expected);
  });

  describe("find by topic", () => {
    const devices: DeviceWrapper[] = [
      {
        config: cfg,
        device: plug,
      },
    ];
    const cases = [
      { topic: `tuya/${sanitizedName}/state`, expected: plug },
      { topic: `tuya/${sanitizedName}/set_position`, expected: plug },
      { topic: `tuya/${sanitizedName}`, expected: plug },
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
        plug.onClientState({ "1": sequence[0] });
        plug.onClientState({ "1": sequence[1] });

        expect(plug.state).toBe(state);
      }
    );
  });

  describe("setState", () => {
    const changes: Array<{ state: SwitchState; dp: boolean }> = [
      { state: "ON", dp: true },
      { state: "OFF", dp: false },
    ];

    it.each(changes)("setState $state => $dp", ({ state, dp }) => {
      plug.setState(state as SwitchState);

      expect(deviceClient.setState).toBeCalledWith({ "1": dp });
    });
  });

  describe("commands", () => {
    it("set_state", () => {
      plug.setState = vi.fn();
      plug.command("command", "OFF");

      expect(plug.setState).toBeCalledWith("OFF");
    });
  });
});
