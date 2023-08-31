import {
  DeviceBase,
  DeviceConfig,
  DeviceType,
  Sensor,
  getDeviceTopic,
} from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";

export type CoverState = "open" | "opening" | "closed" | "closing" | "unknown";
export type CoverStateCommand = "open" | "close" | "stop";
export type CoverStateDp = "close" | "open" | "stop";
type Direction = "up" | "down";

export class Cover extends DeviceBase {
  private static readonly positionClosed = 0;
  private static readonly positionOpen = 100;
  private static readonly positionUnknown = 50;

  public override type: DeviceType = "cover";

  public state: CoverState = "unknown";
  public lastMove: Direction = "up";
  public position: number = 0;

  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  protected override getSensors(): Record<string, Sensor> {
    const sensors: Record<string, Sensor> = {
      "1": {
        dpId: "1",
        identifier: "switch_1",
        values: [true, false],
        type: "switch",
      },
      "7": {
        dpId: "7",
        identifier: "backlight",
        values: [true, false],
        type: "switch",
      },
    };

    return sensors;
  }

  public override discoveryMessage(baseTopic: string) {
    const baseData = super.discoveryMessage(baseTopic);

    const baseSensor = baseData[`${this.type}/${this.name}/config`];

    const topic = getDeviceTopic(this, baseTopic);

    const device = {
      ...baseSensor.device,
      mdl: "Cover",
    };
    const message = {
      ...baseSensor,
      device,
      position_topic: `${topic}/position`,
      set_position_topic: `${topic}/set_position`,
      optimistic: true,
    };

    return {
      ...baseData,
      [`${this.type}/${this.name}/config`]: message,
    };
  }

  public override stateMessage(dps: DataPointSet) {
    const baseData = super.stateMessage(dps);

    const { state, position, lastMove } = this.getBaseState(dps);
    return {
      ...baseData,
      [`state`]: state,
      [`position`]: position,
      [`last_move`]: lastMove,
    };
  }

  override onClientState(dps: DataPointSet) {
    super.onClientState(dps);
    const { state, position, lastMove } = this.getBaseState(dps);
    
    this.state = state ?? this.state;
    this.position = position ?? this.position;
    this.lastMove = lastMove ?? this.lastMove;
  }

  private getBaseState(dps: DataPointSet) {
    if (dps["1"] === undefined) return undefined;

    const baseState = dps["1"] as CoverStateDp;
    const isMoving = baseState == "open" || baseState == "close";
    const lastMove = isMoving
      ? baseState == "open"
        ? "up"
        : "down"
      : this.lastMove;
    const state = Cover.toCoverState(baseState, lastMove);
    const position = Cover.getPosition(this.state, lastMove);

    return { state, position, lastMove };
  }

  override command(command: string, arg1: string) {
    switch (command) {
      case "set_position":
        const position = parseInt(arg1);
        this.setPosition(position);
        return true;
      case "command": // open, close, stop
        const state = arg1.toLowerCase();
        this.setState(state as CoverStateCommand);
        return true;
      default:
        return super.command(command, arg1);
    }
  }

  public setState(state: CoverState | CoverStateCommand) {
    const dp = Cover.fromCoverState(state);
    this.setClientState({ "1": dp });
  }
  public setPosition(position: number) {
    const dp = Cover.fromPosition(position, this.position);
    this.setClientState({ "1": dp });
  }

  private static getPosition(state: CoverState, lastMove: Direction): number {
    return state == "open"
      ? Cover.positionOpen
      : state == "closed"
      ? Cover.positionClosed
      : lastMove == "up"
      ? Cover.positionOpen
      : lastMove == "down"
      ? Cover.positionClosed
      : Cover.positionUnknown;
  }

  private static fromCoverState(
    state: CoverState | CoverStateCommand
  ): CoverStateDp {
    switch (state) {
      case "open":
      case "opening":
        return "open";
      case "close":
      case "closed":
      case "closing":
        return "close";
      case "stop":
        return "stop";
      default:
        throw new Error(`Unknown cover state ${state}`);
    }
  }

  private static fromPosition(newPosition: number, currentPosition: number) {
    if (newPosition > currentPosition) {
      return "open";
    } else if (newPosition < currentPosition) {
      return "close";
    } else {
      return "stop";
    }
  }

  private static toCoverState(
    state: CoverStateDp,
    lastMove: Direction
  ): CoverState {
    switch (state) {
      case "open":
        return "opening";
      case "close":
        return "closing";
      case "stop":
        return lastMove == "up"
          ? "open"
          : lastMove == "down"
          ? "closed"
          : "unknown";
      default:
        throw new Error(`Unknown target state '${state}'`);
    }
  }
}
