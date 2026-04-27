const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env")
});

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: readNumber("PORT", 3000),
  mqttPort: readNumber("MQTT_PORT", 1883),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_locker_iot",
  packageStaleSeconds: readNumber("PACKAGE_STALE_SECONDS", 30),
  doorOpenStaleSeconds: readNumber("DOOR_OPEN_STALE_SECONDS", 20),
  historyLimit: readNumber("HISTORY_LIMIT", 100),
  frontendDir: path.resolve(__dirname, "../../frontend")
};
