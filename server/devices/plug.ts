import { DeviceBase, DeviceType, DeviceConfig } from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";
import { Switch } from "./switch";
import { deviceData, discoveryData } from "../homeassistant";

export class Plug extends Switch {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override discoveryMessage(baseTopic: string) {
    const discovery = discoveryData(baseTopic, this.name);
    const device = deviceData(this.options.id + (this.options.idSuffix ?? ""), this.displayName);

    const baseData = super.discoveryMessage(baseTopic);

    return {
      ...baseData,
      [`switch/${this.name}/config`]: {
        ...baseData[`${this.type}/${this.name}/config`],
      },
      [`sensor/${this.name}/config`]: {
        ...discovery,
        device,
      },
    };
  }

  override onClientState(dps: DataPointSet): void {
    super.onClientState(dps);
  }
}
