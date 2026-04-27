const express = require("express");

const LockerReading = require("../models/LockerReading");
const LockerState = require("../models/LockerState");

function createLockerRouter(historyLimit) {
  const router = express.Router();

  router.get("/lockers", async (_request, response, next) => {
    try {
      const lockers = await LockerState.find().sort({ locker_id: 1 }).lean();
      response.json(lockers);
    } catch (error) {
      next(error);
    }
  });

  router.get("/locker/:id", async (request, response, next) => {
    try {
      const lockerId = Number(request.params.id);
      const locker = await LockerState.findOne({ locker_id: lockerId }).lean();

      if (!locker) {
        return response.status(404).json({ message: "Locker not found." });
      }

      response.json(locker);
    } catch (error) {
      next(error);
    }
  });

  router.get("/history/:id", async (request, response, next) => {
    try {
      const lockerId = Number(request.params.id);
      const limit = Math.min(Number(request.query.limit) || historyLimit, historyLimit);
      const history = await LockerReading.find({ locker_id: lockerId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      response.json(history);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createLockerRouter
};
