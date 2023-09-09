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
  
  lastSeen?: Date;
  client?: TuyaDevice;
  device?: DeviceBase;
};

export function initDevices(configPath: string): DeviceWrapper[] {
  const content = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(content) as DeviceConfig[];

  return config.map((opts) => {
    return { config: opts };
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

    device.lastSeen = new Date();
    if (device.config.ip && device.config.ip !== msg.ip) {
      log(`${device.config.name}: IP changed`, device.config.ip, msg.ip);
    }
    device.config.ip = msg.ip;

    const messageVersion = parseFloat(msg.version);
    if (device.config.version && messageVersion != device.config.version) {
      log(`${device.config.name}: message version ${messageVersion} doesn't match configured: ${device.config.version}`);
    }
    device.config.version ??= messageVersion;

    if (!device.client) {
      log(`discovered NEW device ${device.config.name} at ${device.config.ip}`);
    }
    if (!device.client?.connected && !device.client?.connecting()) {
      log(
        `connecting device ${device.config.name} (${device.config.version}) at ${device.config.ip}`
      );

      device.client = new TuyaDevice({
        heartbeatInterval: 5000,
        ...device.config,
      });
      device.device = createDevice(msg, device.config, device.client);
      device.device.on("stateChanged", (state) => {
        void onDeviceState(state, device);
      });

      device.client.connect({
        enableHeartbeat: true, // heartbeat is needed to keep the connection alive
        updateOnConnect: true,
      });
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
      `${topic}/`.startsWith(`${getDeviceTopic(baseTopic, d.device)}/`)
  );
}
