const mqtt = require("mqtt");
const Aedes = require("aedes");
const net = require("net");

const LockerReading = require("../models/LockerReading");
const LockerState = require("../models/LockerState");

function parseTopic(topic) {
  const match = /^locker\/(\d+)\/data$/.exec(topic);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function normalizePayload(payload) {
  if (
    typeof payload?.temperature !== "number" ||
    ![0, 1].includes(payload?.door) ||
    ![0, 1].includes(payload?.has_package)
  ) {
    throw new Error("Payload must contain numeric temperature, door, and has_package fields.");
  }

  return {
    temperature: payload.temperature,
    door: payload.door,
    has_package: payload.has_package
  };
}

function buildAlerts(previousState, reading, thresholds) {
  const alerts = [];
  const warnings = [];
  const timestamp = reading.timestamp;

  let packageSince = null;
  if (reading.has_package === 1) {
    packageSince =
      previousState?.has_package === 1 && previousState.package_since
        ? previousState.package_since
        : timestamp;
    const packageAgeSeconds = Math.floor((timestamp - packageSince) / 1000);
    if (packageAgeSeconds >= thresholds.packageStaleSeconds) {
      alerts.push("package_stale");
      warnings.push(
        `Locker ${reading.locker_id} package has been waiting for ${packageAgeSeconds}s.`
      );
    }
  }

  let doorOpenSince = null;
  if (reading.door === 1) {
    doorOpenSince =
      previousState?.door === 1 && previousState.door_open_since
        ? previousState.door_open_since
        : timestamp;
    const doorOpenAgeSeconds = Math.floor((timestamp - doorOpenSince) / 1000);
    if (doorOpenAgeSeconds >= thresholds.doorOpenStaleSeconds) {
      alerts.push("door_open_too_long");
      warnings.push(
        `Locker ${reading.locker_id} door has been open for ${doorOpenAgeSeconds}s.`
      );
    }
  }

  if (reading.temperature > 35) {
    alerts.push("temperature_high");
    warnings.push(
      `Locker ${reading.locker_id} temperature is high at ${reading.temperature}C.`
    );
  }

  if (previousState && Math.abs(reading.temperature - previousState.temperature) >= 8) {
    alerts.push("temperature_spike");
    warnings.push(
      `Locker ${reading.locker_id} temperature changed abruptly from ${previousState.temperature}C to ${reading.temperature}C.`
    );
  }

  return {
    alerts,
    warnings,
    packageSince,
    doorOpenSince
  };
}

async function handleLockerMessage(topic, messageBuffer, thresholds, io) {
  const lockerId = parseTopic(topic);
  if (lockerId === null) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(messageBuffer.toString("utf8"));
  } catch (error) {
    console.error(`Invalid JSON on topic ${topic}:`, error.message);
    return;
  }

  let normalized;
  try {
    normalized = normalizePayload(payload);
  } catch (error) {
    console.error(`Rejected payload for topic ${topic}:`, error.message);
    return;
  }

  const timestamp = new Date();
  const reading = {
    locker_id: lockerId,
    temperature: normalized.temperature,
    door: normalized.door,
    has_package: normalized.has_package,
    timestamp
  };

  await LockerReading.create(reading);

  const previousState = await LockerState.findOne({ locker_id: lockerId }).lean();
  const alertState = buildAlerts(previousState, reading, thresholds);

  for (const warning of alertState.warnings) {
    console.warn(warning);
  }

  const state = {
    ...reading,
    package_since: alertState.packageSince,
    door_open_since: alertState.doorOpenSince,
    alerts: alertState.alerts,
    last_warning: alertState.warnings.length > 0 ? alertState.warnings.join(" | ") : null
  };

  const updatedState = await LockerState.findOneAndUpdate({ locker_id: lockerId }, state, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });

  if (io) {
    io.emit('telemetry_update', {
      reading: reading,
      state: updatedState
    });
  }
}

function startBroker(port) {
  const broker = Aedes();
  const server = net.createServer(broker.handle);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      console.log(`MQTT broker listening on port ${port}`);
      resolve({ broker, server });
    });
  });
}

function startMqttSubscriber(port, thresholds, io) {
  const client = mqtt.connect(`mqtt://127.0.0.1:${port}`);

  client.on("connect", () => {
    console.log("Backend MQTT subscriber connected.");
    client.subscribe("locker/+/data", (error) => {
      if (error) {
        console.error("Failed to subscribe to locker topics:", error.message);
      }
    });
  });

  client.on("message", async (topic, message) => {
    try {
      await handleLockerMessage(topic, message, thresholds, io);
    } catch (error) {
      console.error(`Failed to process topic ${topic}:`, error.message);
    }
  });

  client.on("error", (error) => {
    console.error("MQTT subscriber error:", error.message);
  });

  return client;
}

module.exports = {
  startBroker,
  startMqttSubscriber
};
