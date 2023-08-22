import fs from "fs";
import TuyaDevice from "../lib/tuya-driver/src/device";
import { Find } from "../lib/tuya-driver/src/find";

import logfactory from "debug";
import { DeviceBase, DeviceConfig, createDevice } from "./device-classes";
const log = logfactory("tuya-to-mqtt");

export type DeviceWrapper = {
  config: DeviceConfig;
  client?: TuyaDevice;
  device?: DeviceBase;
};

export function initDevices(configPath: string) {
  const content = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(content) as DeviceConfig[];

  return config.map((opts) => {
    return { config: opts } as DeviceWrapper;
  });
}

export function listenToBroadcast(
  devices: DeviceWrapper[],
  onUpdate: (device: DeviceWrapper) => void
) {
  const find = new Find();
  find.on("broadcast", (msg) => {
    const device = devices.find((d) => d.config.id == msg.gwId);
    if (!device) {
      log(`Found unlisted device ${msg.gwId} ${msg.ip}`);
      return;
    }

    device.config.ip = msg.ip;

    if (!device.client) {
      device.client = new TuyaDevice(device.config);
      device.device = createDevice(msg, device.config, device.client);
    }
    if (device.client && !device.client.connected) {
      device.client.connect();
    }

    onUpdate(device);
  });
  find.start();
}
