import express from "express";
import { findByTopic, initDevices, listenToBroadcast } from "./devices";
import * as mqtt from "mqtt";

import logfactory from "debug";
const log = logfactory("tuya:server");
const mqttlog = logfactory("tuya:mqtt");

const app = express();

const config = {
  mqtt: {
    host: "192.168.1.9",
    discoveryTopic: "homeassistant/discovery",
    deviceTopic: "tuya2",
  },
};

mqttlog("connecting MQTT client");

const mqttClient = mqtt.connect({
  host: config.mqtt.host,
  port: 1883,
  reconnectPeriod: 1000,
});

mqttClient.on("error", (error) => {
  mqttlog("Unable to connect to MQTT server", error);
});
mqttClient.on("connect", async () => {
  mqttlog("Connected to MQTT server");
  const topic = `${config.mqtt.deviceTopic}/#`;
  mqttlog(`subscribing to ${topic}`);
  const grants = await mqttClient.subscribeAsync(topic);
  mqttlog(`subscribed to ${topic}`, grants);
});
mqttClient.on("reconnect", () => {
  if (mqttClient.connected) {
    mqttlog("Connection to MQTT server lost. Attempting to reconnect...");
  } else {
    mqttlog("Unable to connect to MQTT server");
  }
});

log("starting device dicsovery");

const devices = initDevices("config/devices.json");
listenToBroadcast(devices, async (deviceWrapper) => {
  const { device } = deviceWrapper;
  if (!device) return;

  const message = device.discoveryMessage(config.mqtt.deviceTopic);
  const discoveryTopic = device.discoveryTopic(config.mqtt.discoveryTopic);

  await mqttClient.publishAsync(discoveryTopic, JSON.stringify(message));

  const stateMessage = device.stateMessage(config.mqtt.deviceTopic);
  for (const [topic, payload] of Object.entries(stateMessage)) {
    await mqttClient.publishAsync(
      topic,
      payload instanceof Object ? JSON.stringify(payload) : `${payload}`
    );
  }
});

mqttClient.on("message", (topic, payload, packet) => {
  const regex = new RegExp(`^${config.mqtt.deviceTopic}/(?<device_id>[^/]+)/(?<command>.+)`);
  const matches = regex.exec(topic);

  if (!matches) {
    mqttlog("ignored MQTT topic", topic);
    return;
  }

  const { device_id, command } = matches.groups ?? {};

  const knownCommands = ["set", "command", "set_.*"];

  if (!knownCommands.some(c => new RegExp(c).test(command))) {
    return;
  }

  mqttlog("MQTT message", topic, payload.toString(), packet);

  try {
    const found = findByTopic(devices, config.mqtt.deviceTopic, topic);
    if (!found) {
      mqttlog("Device not found for topic", topic);
      return;
    }

    const device = found.device;
    if (!device) {
      mqttlog("Device not connected for topic", topic);
      return;
    }
    
    device.command(command, payload.toString());
  } catch (err) {
    console.error(err);
    //mqttlog("Error processing MQTT message", err);
  }
});

app.get("/", (_, res) => {
  res.send("Hello World!");
});

//if ((import.meta as any).env.PROD)
app.listen(3000);
export const viteNodeApp = app;
