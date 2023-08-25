import { DeviceBase, DeviceType, DeviceConfig } from "./base-device";
import TuyaDevice from "../../lib/tuya-driver/src/device";

export class Plug extends DeviceBase {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override discoveryMessage(baseTopic: string) {
    const baseData = this.discoveryData(baseTopic);
    const device = this.deviceData();
    
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
