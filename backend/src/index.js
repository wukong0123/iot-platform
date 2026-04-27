const express = require("express");

const config = require("./config");
const { connectToDatabase } = require("./db");
const { createLockerRouter } = require("./routes/lockers");
const { startBroker, startMqttSubscriber } = require("./services/lockerService");

async function main() {
  await connectToDatabase(config.mongoUri);
  console.log("Connected to MongoDB.");

  await startBroker(config.mqttPort);
  startMqttSubscriber(config.mqttPort, {
    packageStaleSeconds: config.packageStaleSeconds,
    doorOpenStaleSeconds: config.doorOpenStaleSeconds
  });

  const app = express();
  app.use(express.json());
  app.use(createLockerRouter(config.historyLimit));
  app.use(express.static(config.frontendDir));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      mqttPort: config.mqttPort,
      packageStaleSeconds: config.packageStaleSeconds,
      doorOpenStaleSeconds: config.doorOpenStaleSeconds
    });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: "Internal server error." });
  });

  app.listen(config.port, () => {
    console.log(`HTTP server listening on http://127.0.0.1:${config.port}`);
  });
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
