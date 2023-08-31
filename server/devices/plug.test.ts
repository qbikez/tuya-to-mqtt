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
    const message = plug.discoveryMessage("tuya");
    expect(message).toMatchInlineSnapshot(`
      {
        "number/myplug_/countdown_1/config": {
          "availability_topic": "tuya/myplug_/status",
          "command_topic": "tuya/myplug_/set_countdown_1",
          "device": {
            "ids": [
              "someMagicId",
            ],
            "mf": "Tuya",
            "name": "myPlug+",
          },
          "max": 86400,
          "min": 0,
          "name": "myPlug+ countdown_1",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/myplug_/countdown_1",
          "step": 1,
          "unique_id": "myplug__countdown_1",
          "unit_of_measurement": "seconds",
        },
        "number/myplug_/countdown_2/config": {
          "availability_topic": "tuya/myplug_/status",
          "command_topic": "tuya/myplug_/set_countdown_2",
          "device": {
            "ids": [
              "someMagicId",
            ],
            "mf": "Tuya",
            "name": "myPlug+",
          },
          "max": 86400,
          "min": 0,
          "name": "myPlug+ countdown_2",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/myplug_/countdown_2",
          "step": 1,
          "unique_id": "myplug__countdown_2",
          "unit_of_measurement": "seconds",
        },
        "sensor/myplug_/relay_status/config": {
          "availability_topic": "tuya/myplug_/status",
          "device": {
            "ids": [
              "someMagicId",
            ],
            "mf": "Tuya",
            "name": "myPlug+",
          },
          "name": "myPlug+ relay_status",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/myplug_/relay_status",
          "unique_id": "myplug__relay_status",
          "unit_of_measurement": undefined,
        },
        "switch/myplug_/config": {
          "availability_topic": "tuya/myplug_/status",
          "command_topic": "tuya/myplug_/command",
          "device": {
            "ids": [
              "someMagicId",
            ],
            "mdl": "Switch/Socket",
            "mf": "Tuya",
            "name": "myPlug+",
          },
          "name": "myplug_",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/myplug_/state",
          "unique_id": "myplug_",
        },
        "switch/myplug_/switch_1/config": {
          "availability_topic": "tuya/myplug_/status",
          "command_topic": "tuya/myplug_/set_switch_1",
          "device": {
            "ids": [
              "someMagicId",
            ],
            "mf": "Tuya",
            "name": "myPlug+",
          },
          "name": "myPlug+ switch_1",
          "payload_available": "online",
          "payload_not_available": "offline",
          "state_topic": "tuya/myplug_/switch_1",
          "unique_id": "myplug__switch_1",
          "unit_of_measurement": undefined,
        },
      }
    `);
  });

  it("state message", () => {
    const dps = { "1": true };

    const stateMessage = plug.stateMessage(dps);

    expect(stateMessage).toEqual({
      dps,
      id: undefined,
      ip: undefined,
      state: "ON",
      status: "offline",
      switch_1: "ON",
      sensors: expect.anything(),
    });
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
