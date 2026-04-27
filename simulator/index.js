const path = require("path");
const mqtt = require("mqtt");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const brokerUrl = process.env.SIMULATOR_BROKER_URL || "mqtt://127.0.0.1:1883";
const intervalMs = Number(process.env.SIMULATOR_INTERVAL_MS || 5000);
const lockerIds = (process.env.SIMULATOR_LOCKER_IDS || "1,2,3")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));

const client = mqtt.connect(brokerUrl);
const stateByLocker = new Map();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nextLockerState(lockerId) {
  const current =
    stateByLocker.get(lockerId) || {
      temperature: randomInt(24, 32),
      door: 0,
      has_package: 0
    };

  const next = {
    temperature: clamp(current.temperature + randomInt(-2, 3), 20, 40),
    door: Math.random() < 0.15 ? 1 - current.door : current.door,
    has_package: Math.random() < 0.2 ? 1 - current.has_package : current.has_package
  };

  if (next.has_package === 1 && Math.random() < 0.25) {
    next.door = 1;
  }

  if (next.has_package === 0 && next.door === 1 && Math.random() < 0.5) {
    next.door = 0;
  }

  stateByLocker.set(lockerId, next);
  return next;
}

function publishLocker(lockerId) {
  const payload = nextLockerState(lockerId);
  const topic = `locker/${lockerId}/data`;

  client.publish(topic, JSON.stringify(payload), { qos: 0 }, (error) => {
    if (error) {
      console.error(`Failed to publish ${topic}:`, error.message);
      return;
    }

    console.log(`[SIM] ${topic} ${JSON.stringify(payload)}`);
  });
}

client.on("connect", () => {
  console.log(`Simulator connected to ${brokerUrl}`);

  lockerIds.forEach((lockerId) => publishLocker(lockerId));
  setInterval(() => {
    lockerIds.forEach((lockerId) => publishLocker(lockerId));
  }, intervalMs);
});

client.on("error", (error) => {
  console.error("Simulator MQTT error:", error.message);
});
