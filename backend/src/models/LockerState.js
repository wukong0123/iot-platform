const mongoose = require("mongoose");

const lockerStateSchema = new mongoose.Schema(
  {
    locker_id: {
      type: Number,
      required: true,
      unique: true,
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
    package_since: {
      type: Date,
      default: null
    },
    door_open_since: {
      type: Date,
      default: null
    },
    alerts: {
      type: [String],
      default: []
    },
    last_warning: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      required: true
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model("LockerState", lockerStateSchema);
