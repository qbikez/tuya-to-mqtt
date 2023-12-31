import {
  DeviceBase,
  DeviceType,
  DeviceConfig,
  mapDps,
  Sensor,
  getDeviceTopic as getDeviceTopic,
  DataPointValue,
  commandToDps,
} from "./base-device";
import TuyaDevice, { DataPointSet } from "../../lib/tuya-driver/src/device";
import { Switch } from "./switch";
import { StateMessage, deviceData, discoveryData } from "../homeassistant";

/**
 * https://developer.tuya.com/en/docs/iot/product-standard-function-introduction?id=K9tp15ceh63gr#title-1-DP%20list%20of%20standard%20functions
 */
export class Plug extends Switch {
  public override type: DeviceType = "plug";



  constructor(options: DeviceConfig, client: TuyaDevice) {
    super(options, client);
  }

  override getSensors(): Sensor[] {
    const sensors: Sensor[] = [
      {
        dpId: "1",
        identifier: "switch_1",
        values: [true, false],
        type: "switch",
      },
      {
        dpId: "9",
        identifier: "countdown_1",
        values: [0, 86400],
        pitch: 1,
        scale: 0,
        unit: "seconds",
        type: "number",
      },
      {
        dpId: "17",
        // incremental power consumption
        identifier: "add_ele",
        values: [0, 50000],
        pitch: 100,
        scale: 3,
        unit: "kWh",
        device_class: "energy"
      },
      {
        dpId: "18",
        identifier: "cur_current",
        values: [0, 30000],
        pitch: 1,
        scale: 0,
        unit: "mA",
        device_class: "current"
      },
      {
        dpId: "19",
        identifier: "cur_power",
        values: [0, 80000],
        pitch: 1,
        scale: 1,
        unit: "W",
        device_class: "power"
      },
      {
        dpId: "20",
        identifier: "cur_voltage",
        values: [0, 5000],
        pitch: 1,
        scale: 1,
        unit: "V",
      },
      {
        dpId: "21",
        identifier: "test_bit",
        values: [0, 5],
        pitch: 1,
        scale: 0,
      },
      {
        dpId: "22",
        identifier: "voltage_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      {
        dpId: "23",
        identifier: "electric_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      {
        dpId: "24",
        identifier: "power_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      {
        dpId: "25",
        identifier: "elecricity_coe",
        values: [0, 1000000],
        pitch: 1,
        scale: 0,
      },
      {
        dpId: "26",
        identifier: "fault",
        values: ["ov_vol", "ov_pwr", "ls_cr", "ls_vol", "ls_pow"],
      },
      {
        dpId: "38",
        identifier: "relay_status",
        values: ["off", "on", "memory"],
      },
      {
        dpId: "41",
        identifier: "cycle_time",
        values: [],
      },
      {
        dpId: "42",
        identifier: "random_time",
        values: [],
      },
    ];
    return sensors;
  }

  override discoveryMessage(baseTopic: string) {
    var deviceTopic = getDeviceTopic(baseTopic, this);
    const discovery = discoveryData(deviceTopic, this.name);
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
    };
  }

  override onClientState(dps: DataPointSet): void {
    super.onClientState(dps);
  }

  override command(command: string, arg1: string): boolean {    
    return super.command(command, arg1);
  }

  setCountdown(countdown: number) {
    this.setClientState({ "9": countdown });
  }
}
