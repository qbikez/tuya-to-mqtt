import { DeviceBase, DeviceType, DeviceConfig } from "./base-device";
import TuyaDevice from "../../lib/tuya-driver/src/device";
import { Switch } from "./switch";

export class Plug extends Switch {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override discoveryMessage(baseTopic: string) {
    const discoveryData = this.discoveryData(baseTopic);
    const device = this.deviceData();

    const baseData = super.discoveryMessage(baseTopic);

    return {
      ...baseData,
      [`sensor/${this.name}/config`]: {
        ...discoveryData,
        device,
      },
    };
  }
}
