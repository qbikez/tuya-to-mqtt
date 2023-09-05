import express from "express";
import {
  DeviceWrapper,
  findByTopic,
  initDevices,
  listenToBroadcast,
} from "./devices";
import * as mqtt from "mqtt";

import logfactory from "debug";
import { DeviceBase, getDeviceTopic } from "./devices/base-device";
import { DataPointSet } from "../lib/tuya-driver/src/device";
import * as fs from "fs";
const log = logfactory("tuya:server");
const mqttlog = logfactory("tuya:mqtt");

const defaultConfig = {
  mqtt: {
    host: "127.0.0.1",
    port: 1883,
    username: "",
    password: "",
  },
  homeassistant: {
    discovery_topic: "homeassistant/discovery",
    device_topic: "tuya",
    status_topic: "homeassistant/status",
  },
};

type Config = typeof defaultConfig;

const app = express();

const userconfig = JSON.parse(
  fs.readFileSync("config/config.json", "utf-8")
) as Config;
const config = { ...defaultConfig, ...userconfig };

mqttlog("connecting MQTT client");

const mqttClient = mqtt.connect({
  host: config.mqtt.host,
  port: config.mqtt.port,
  username: config.mqtt.username,
  password: config.mqtt.password,
  reconnectPeriod: 100,
  clientId: "tuya-mqtt",
});

mqttClient.on("error", (error) => {
  mqttlog("MQTT error", error);
});
mqttClient.on("connect", async () => {
  mqttlog("Connected to MQTT server");
  const topic = `${config.homeassistant.device_topic}/#`;
  mqttlog(`subscribing to ${topic}`);
  await mqttClient.subscribeAsync(topic);
  mqttlog(`subscribing to ${config.homeassistant.status_topic}`);
  await mqttClient.subscribeAsync(config.homeassistant.status_topic);
});
mqttClient.on("reconnect", () => {
  mqttlog(
    `MQTT reconnect (connected=${mqttClient.connected} reconnecting=${mqttClient.reconnecting})`
  );
});
mqttClient.on("disconnect", () => {
  mqttlog(`MQTT disconnect`);
});
mqttClient.on("offline", () => {
  mqttlog(`MQTT offline`);
});
mqttClient.on("close", () => {
  mqttlog(`MQTT close`);
});

log("starting device dicsovery");

const devices = initDevices("config/devices.json");

const onDeviceDiscovery = async (deviceWrapper: DeviceWrapper) => {
  const { device } = deviceWrapper;
  if (!device) return;

  publishDeviceDiscovery(device);
};

const onDeviceState = async (
  dps: DataPointSet,
  deviceWrapper: DeviceWrapper
) => {
  const { device } = deviceWrapper;
  await publishDeviceState(device, dps);
};

listenToBroadcast(devices, onDeviceDiscovery, onDeviceState);

mqttClient.on("message", (topic, payload, packet) => {
  if (topic === config.homeassistant.status_topic) {
    devices.forEach((deviceWrapper) => {
      const { device } = deviceWrapper;
      if (!device) return;
      publishDeviceDiscovery(device);
      publishDeviceState(device);
    });
    return;
  }
  
  const regex = new RegExp(
    `^${config.homeassistant.device_topic}/(?<device_id>[^/]+)/(?<command>.+)`
  );
  const matches = regex.exec(topic);

  if (!matches) {
    mqttlog("ignored MQTT topic", topic);
    return;
  }

  const { device_id, command } = matches.groups ?? {};

  const knownCommands = ["set", "command", "set_.*"];

  if (!knownCommands.some((c) => new RegExp(c).test(command))) {
    return;
  }

  mqttlog("MQTT message", topic, payload.toString(), packet);

  try {
    const found = findByTopic(devices, config.homeassistant.device_topic, topic);
    if (!found) {
      mqttlog("Device not found for topic", topic);
      return;
    }

    const device = found.device;
    if (!device) {
      mqttlog("Device not connected for topic", topic);
      return;
    }

    const processed = device.command(command, payload.toString());
    if (!processed) {
      throw new Error(`Command '${command}' not understood`);
      return;
    }
  } catch (err) {
    console.error(err);
    //mqttlog("Error processing MQTT message", err);
  }
});

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.get("/devices", (_, res) => {
  res.send(devices);
});

//if ((import.meta as any).env.PROD)
app.listen(3000);
export const viteNodeApp = app;

async function publishDeviceState(device: DeviceBase, dps?: DataPointSet) {
  const stateMessage = !!dps ? device.stateMessage(dps) : device.fullStateMessage();
  for (const [subTopic, payload] of Object.entries(stateMessage)) {
    const topic = getDeviceTopic(device, config.homeassistant.device_topic) + "/" + subTopic;
    await mqttClient.publishAsync(
      topic,
      payload instanceof Object ? JSON.stringify(payload) : `${payload}`
    );
  }
}

function publishDeviceDiscovery(device: DeviceBase) {
  const discoveryMessages = device.discoveryMessage(config.homeassistant.device_topic);

  for (const [topic, payload] of Object.entries(discoveryMessages)) {
    mqttClient.publishAsync(
      `${config.homeassistant.discovery_topic}/${topic}`,
      JSON.stringify(payload)
    );
  }
}

