const mongoose = require("mongoose");

async function connectToDatabase(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
}

module.exports = {
  connectToDatabase
};
