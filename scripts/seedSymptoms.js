// scripts/seedSymptoms.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const seedSymptoms = require('../utils/seedSymptoms');

dotenv.config({ path: './config.env' });

const DB = process.env.MONGO_URL.replace('<PASSWORD>', process.env.MONGO_PASSWORD);

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('DB connection successful!');
  seedSymptoms().then(() => mongoose.connection.close());
});