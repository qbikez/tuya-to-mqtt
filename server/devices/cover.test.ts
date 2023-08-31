import Device from "../../lib/tuya-driver/src/device";
import { DeviceWrapper, findByTopic } from "../devices";
import { DeviceConfig } from "./base-device";
import { Cover, CoverState, CoverStateDp } from "./cover";

vi.mock("../../lib/tuya-driver/src/device");

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
    const message = cover.discoveryMessage("tuya");
    expect(message).toMatchInlineSnapshot(`
      {
        "cover/roleta_jeremi/config": {
          "availability_topic": "tuya/roleta_jeremi/status",
          "command_topic": "tuya/roleta_jeremi/command",
          "device": {
            "ids": [
              "bf9346c6635dfb4b38sj2p",
            ],
            "mdl": "Cover",
            "mf": "Tuya",
            "name": "roleta Jeremi",
          },
          "name": "roleta_jeremi",
          "optimistic": true,
          "payload_available": "online",
          "payload_not_available": "offline",
          "position_topic": "tuya/roleta_jeremi/position",
          "set_position_topic": "tuya/roleta_jeremi/set_position",
          "state_topic": "tuya/roleta_jeremi/state",
          "unique_id": "roleta_jeremi",
        },
        "switch/roleta_jeremi/backlight/config": {
          "availability_topic": "tuya/roleta_jeremi/status",
          "command_topic": "tuya/roleta_jeremi/set_backlight",
          "device": {
            "ids": [
              "bf9346c6635dfb4b38sj2p",
            ],
            "mf": "Tuya",
            "name": "roleta Jeremi",
          },
          "name": "roleta Jeremi backlight",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/roleta_jeremi/backlight",
          "unique_id": "roleta_jeremi_backlight",
          "unit_of_measurement": undefined,
        },
        "switch/roleta_jeremi/switch_1/config": {
          "availability_topic": "tuya/roleta_jeremi/status",
          "command_topic": "tuya/roleta_jeremi/set_switch_1",
          "device": {
            "ids": [
              "bf9346c6635dfb4b38sj2p",
            ],
            "mf": "Tuya",
            "name": "roleta Jeremi",
          },
          "name": "roleta Jeremi switch_1",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/roleta_jeremi/switch_1",
          "unique_id": "roleta_jeremi_switch_1",
          "unit_of_measurement": undefined,
        },
      }
    `);
  });

  it("state message", () => {
    const dps = { "1": "open" };
    deviceClient.getState = vitest.fn().mockReturnValue(dps);

    const stateMessage = cover.stateMessage(dps);
    expect(stateMessage).toEqual({
      dps: { "1": "open" },
      id: undefined,
      ip: undefined,
      position: 100,
      state: "opening",
      last_move: "up",
      status: "offline",
      sensors: expect.anything(),
      switch_1: "ON",
    });
  });

  describe("find by topic", () => {
    const devices: DeviceWrapper[] = [
      {
        config: cfg,
        device: cover,
      },
    ];
    const cases = [
      { topic: "tuya/roleta_jeremi/state", expected: cover },
      { topic: "tuya/roleta_jeremi/set_position", expected: cover },
      { topic: "tuya/roleta_jeremi", expected: cover },
    ];
    it.each(cases)("$topic", ({ topic, expected }) => {
      const found = findByTopic(devices, "tuya", topic);
      expect(found).not.toBeNull();
      expect(found?.device).toBe(expected);
    });
  });

  describe("stateChange", () => {
    const changes = [
      { sequence: ["close", "open"], state: "opening", position: 100 },
      { sequence: ["open", "stop"], state: "open", position: 100 },
      { sequence: ["open", "close"], state: "closing", position: 0 },
      { sequence: ["close", "stop"], state: "closed", position: 0  },
    ];
    it.each(changes)(
      "state change: $sequence => $state",
      ({ sequence, state, position }) => {
        cover.state = "unknown";
        cover.position = 50;
        cover.lastMove = "up";

        cover.onClientState({ "1": sequence[0] });
        cover.onClientState({ "1": sequence[1] });

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

  describe("setPosition", () => {
    const changes: Array<{ from: number; to: number; dp: CoverStateDp }> = [
      { from: 0, to: 100, dp: "open" },
      { from: 100, to: 100, dp: "stop" },
      { from: 100, to: 0, dp: "close" },
    ];

    it.each(changes)("setPosition $from => $to: $dp", ({ from, to, dp }) => {
      cover.position = from;
      cover.setPosition(to);

      expect(deviceClient.setState).toBeCalledWith({ "1": dp });
    });
  });

  describe("commands", () => {
    it("set_positions", () => {
      cover.setPosition = vi.fn();
      cover.command("set_position", "100");

      expect(cover.setPosition).toBeCalledWith(100);
    });

    it("set_state", () => {
      cover.setState = vi.fn();
      cover.command("command", "OPEN");

      expect(cover.setState).toBeCalledWith("open");
    });
  });
});
