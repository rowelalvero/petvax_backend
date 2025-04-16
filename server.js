const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
//const { fireBaseConnection } = require('./utils/fbConnect');
app.options('*', cors());
// Route imports
const authRoute = require("./routes/auth");
const clinicAdminRoutes = require('./routes/clinicAdminRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const clinicRoute = require("./routes/clinicRoutes");

dotenv.config();
//fireBaseConnection();

// MongoDB connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.log(err));

const app = express();

// Define allowed origins
const allowedOrigins = [
  'https://petvax-12a65.web.app',
  'http://localhost:57443/',
  'http://localhost:57443/#/add-clinic'
];

// CORS setup
app.use(cors({
  origin: function (origin, callback) {
    // Check if the origin is in the allowed list or is undefined (undefined allows non-browser requests like Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression setup
app.use(compression({ level: 6, threshold: 0 }));

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes setup
app.use("/", authRoute);
app.use('/api/clinic-admin', clinicAdminRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use("/api/clinic", clinicRoute);

// After mongoose connection
require('./services/reminderScheduler');
console.log('Reminder scheduler started');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Server setup
const ip = "127.0.0.1";
const port = process.env.PORT || 8000;

app.listen(port, ip, () => {
  console.log(`Product server listening on ${ip}:${port}`);
});
