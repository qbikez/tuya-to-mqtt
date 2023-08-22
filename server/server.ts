import express from "express";
import { initDevices, listenToBroadcast } from "./devices";
import * as mqtt from "mqtt";

import logfactory from "debug";
const log = logfactory("tuya-to-mqtt");


const app = express();

const config = {
  mqtt: {
    host: "192.168.1.9",
    discoveryTopic: "homeassistant/discovery_test"
  },
}

log("connecting MQTT client");

const mqttClient = await mqtt.connectAsync({
  host: config.mqtt.host
});

log("starting device dicsovery");

const devices = initDevices("config/devices.json");
listenToBroadcast(devices, (device) => {  
  mqttClient.publish("discoveryTopic", JSON.stringify(device.config));
});

app.get("/", (_, res) => {
  res.send("Hello World!");
});





if (import.meta.env.PROD) app.listen(3000);
export const viteNodeApp = app;
