export type DeviceDiscovery = {
  ids: string[];
  name: string;
  mf: string;
  mdl?: string;
};

export type EntityDiscovery = {
  name: string;
  state_topic: string;
  command_topic: string;
  availability_topic: string;
  payload_available: string;
  payload_not_available: string;
  unique_id: string;
  device: DeviceDiscovery;
};

export type StateMessage = {
  [topic: string]: string | number | boolean | Record<string, unknown>;
};

export function deviceData(id: string, displayName: string): DeviceDiscovery {
  return {
    ids: [id],
    name: displayName,
    mf: "Tuya",
  };
}

export function discoveryData(
  deviceTopic: string,
  name: string
): Omit<EntityDiscovery, "device"> {
  return {
    name: name,
    state_topic: `${deviceTopic}/state`,
    command_topic: `${deviceTopic}/command`,
    availability_topic: `${deviceTopic}/status`,
    payload_available: "online",
    payload_not_available: "offline",
    unique_id: name,
  };
}
