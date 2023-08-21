import express from "express";
import { initDevices, listenToBroadcast } from "./devices";
import * as mqtt from "mqtt";

import logfactory from "debug";
const log = logfactory("tuya-to-mqtt");


const app = express();

log("connecting MQTT client");

const mqttClient = await mqtt.connectAsync({
  host: "192.168.1.9"
});

log("starting device dicsovery");

const devices = initDevices("config/devices.json");
listenToBroadcast(devices);

app.get("/", (_, res) => {
  res.send("Hello World!");
});





if (import.meta.env.PROD) app.listen(3000);
export const viteNodeApp = app;
