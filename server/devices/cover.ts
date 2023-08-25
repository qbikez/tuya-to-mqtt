import { DeviceBase, DeviceConfig, DeviceType } from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";

export type CoverState = "open" | "opening" | "closed" | "closing" | "unknown";
export type CoverStateCommand = "open" | "close" | "stop";
export type CoverStateDp = "close" | "open" | "stop";
type Direction = "up" | "down";

export class Cover extends DeviceBase {
  private static readonly positionClosed = 100;
  private static readonly positionOpen = 0;
  private static readonly positionUnknown = 50;

  public override type: DeviceType = "cover";

  public state: CoverState = "unknown";
  public lastMove: Direction = "up";
  public position: number = 0;

  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  public override discoveryMessage(baseTopic: string) {
    const baseData = super.discoveryMessage(baseTopic);
    const deviceTopic = this.deviceTopic(baseTopic);

    const device = {
      ...baseData.device,
      mdl: "Cover",
    };
    const message = {
      ...baseData,
      device,
      position_topic: `${deviceTopic}/position`,
      set_position_topic: `${deviceTopic}/set_position`,
      optimistic: true,
    };

    return message;
  }

  public override stateMessage(baseTopic: string) {
    const baseData = super.stateMessage(baseTopic);
    const deviceTopic = `${baseTopic}/${this.name}`;
    return {
      ...baseData,
      [`${deviceTopic}/state`]: this.state,
      [`${deviceTopic}/position`]: this.position,
    };
  }

  override onStateChange(dps: DataPointSet) {
    const baseState = dps["1"] as CoverStateDp;
    const isMoving = baseState == "open" || baseState == "close";
    if (isMoving) {
      this.lastMove = baseState == "open" ? "up" : "down";
    }
    this.state = Cover.toCoverState(baseState, this.lastMove);
    this.position = Cover.getPosition(this.state, this.lastMove);
  }
  
  override command(command: string, arg1: string) {
    switch (command) {
      case "set_position":
        const position = parseInt(arg1);
        this.setPosition(position);
        return;
      case "command": // open, close, stop
        const state = arg1.toLowerCase();
        this.setState(state as CoverStateCommand);
        return;
      default:
        throw new Error(`Unknown command ${command} for device ${this.type}`);
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
      case "closed":
      case "closing":
        return "close";
      case "stop":
        return "stop";
      default:
        throw new Error(`Unknown DP state ${state}`);
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
        throw new Error(`Unknown target state ${state}`);
    }
  }
}