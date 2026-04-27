const mongoose = require("mongoose");

const lockerReadingSchema = new mongoose.Schema(
  {
    locker_id: {
      type: Number,
      required: true,
      index: true
    },
    temperature: {
      type: Number,
      required: true
    },
    door: {
      type: Number,
      required: true,
      enum: [0, 1]
    },
    has_package: {
      type: Number,
      required: true,
      enum: [0, 1]
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

lockerReadingSchema.index({ locker_id: 1, timestamp: -1 });

module.exports = mongoose.model("LockerReading", lockerReadingSchema);
