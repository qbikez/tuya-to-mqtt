import { DeviceBase, DeviceType, DeviceConfig } from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";
import { Switch } from "./switch";
import { deviceData, discoveryData } from "../homeassistant";

type Sensor = {
  id: string;
  values: Array<object | number | boolean | string>;
  pitch?: number;
  scale?: number;
  unit?: string;
};
/**
 * https://developer.tuya.com/en/docs/iot/product-standard-function-introduction?id=K9tp15ceh63gr#title-1-DP%20list%20of%20standard%20functions
 */
export class Plug extends Switch {
  public override type: DeviceType = "plug";
  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override discoveryMessage(baseTopic: string) {
    const discovery = discoveryData(baseTopic, this.name);
    const device = deviceData(
      this.options.id + (this.options.idSuffix ?? ""),
      this.displayName
    );

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

    const sensors: Record<string, Sensor> = {
      "1": {
        id: "switch_1",
        values: [true, false],
      },
      "9": {
        id: "countdown_1",
        values: [0, 86400],
        pitch: 1,
        scale: 0,
        unit: "seconds",
      },
      "17": {
        // incremental power consumption
        id: "add_ele",
        values: [0, 50000],
        pitch: 100,
        scale: 3,
        unit: "kWh",
      },
      "18": {
        id: "cur_current",
        values: [0, 30000],
        pitch: 1,
        scale: 0,
        unit: "mA",
      },
      "19": {
        id: "cur_power",
        values: [0, 80000],
        pitch: 1,
        scale: 1,
        unit: "W",
      },
      "20": {
        id: "cur_voltage",
        values: [0, 5000],
        pitch: 1,
        scale: 1,
        unit: "V",
      },
      "21": {
        id: "test_bit",
        values: [0, 5],
        pitch: 1,
        scale: 0,
      },
      "22": {
        id: "voltage_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      "23": {
        id: "electric_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      "24": {
        id: "power_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      "25": {
        id: "elecricity_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      "26": {
        id: "fault",
        values: ['ov_vol', 'ov_pwr', 'ls_cr', 'ls_vol', 'ls_pow']
      },
      "38": {
        id: "relay_status",
        values: ['off', 'on', 'memory'],
      },
      "41": {
        id: "cycle_time",
        values: []
      },
      "42": {
        id: "random_time",
        values: []
      }
    };
  }
}
