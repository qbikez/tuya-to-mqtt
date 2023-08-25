import { DeviceBase, DeviceType, DeviceConfig } from "./base-device";
import TuyaDevice from "../../lib/tuya-driver/src/device";

export class Plug extends DeviceBase {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override discoveryMessage(baseTopic: string) {
    const baseData = super.discoveryMessage(baseTopic)[`${this.type}/${this.name}/config`];

    const device = baseData.device;
    return {
      [`switch/${this.name}/config`]: {
        ...baseData,
        device,
      },
      [`sensor/${this.name}/config`]: {
        ...baseData,
        device,
      },
    };
  }
}
