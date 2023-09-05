import fs from "fs";
import TuyaDevice, { DataPointSet } from "../lib/tuya-driver/src/device";
import { Find } from "../lib/tuya-driver/src/find";

import logfactory from "debug";
import { createDevice } from "./device-classes";
import {
  DeviceBase,
  DeviceConfig,
  getDeviceTopic,
} from "./devices/base-device";
const log = logfactory("tuya:discovery");

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
  onUpdate: (device: DeviceWrapper) => Promise<void>,
  onDeviceState: (state: DataPointSet, device: DeviceWrapper) => Promise<void>
) {
  const find = new Find();
  find.on("broadcast", (msg) => {
    const device = devices.find((d) => d.config.id == msg.gwId);
    if (!device) {
      log(`Found unlisted device ${msg.gwId} ${msg.ip}`, msg);
      return;
    }

    device.config.ip = msg.ip;
    device.config.version ??= parseFloat(msg.version);

    if (!device.client) {
      log(`discovered NEW device ${device.config.name} at ${device.config.ip}`);

      device.client = new TuyaDevice({
        heartbeatInterval: 5000,
        ...device.config,
      });
      device.device = createDevice(msg, device.config, device.client);
      device.device.on("stateChanged", (state) => {
        void onDeviceState(state, device);
      });
    }
    if (device.client) {
      if (device.client.connecting()) {
        log(
          `device ${device.config.name} (${device.config.version}) at ${device.config.ip}: connecting=${device.client.connecting()} connected=${device.client.connected}`
        );
      } else if (!device.client.connected) {
        log(
          `connecting device ${device.config.name} (${device.config.version}) at ${device.config.ip}`
        );
        device.client.connect({
          enableHeartbeat: true, // heartbeat is needed to keep the connection alive
          updateOnConnect: true,
        });
      }
    }

    void onUpdate(device);
  });
  find.start();
}

export function findByTopic(
  devices: DeviceWrapper[],
  baseTopic: string,
  topic: string
): DeviceWrapper | undefined {
  return devices.find(
    (d) =>
      !!d.device &&
      `${topic}/`.startsWith(`${getDeviceTopic(d.device, baseTopic)}/`)
  );
}
