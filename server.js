const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { fireBaseConnection } = require('./utils/fbConnect');

const app = express();

dotenv.config();
fireBaseConnection();

// Define allowed origins
const allowedOrigins = [
  'https://petvax-a9e9b.web.app', // production
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost in development
    const isLocalhost = origin && origin.startsWith('http://localhost');

    if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Allow preflight OPTIONS requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// MongoDB connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.log(err));

// Compression setup
app.use(compression({ level: 6, threshold: 0 }));

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes setup
const authRoute = require("./routes/auth");
const clinicAdminRoutes = require('./routes/clinicAdminRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const clinicRoute = require("./routes/clinicRoutes");
const mapsRoute = require("./routes/mapsRoutes");

app.use("/", authRoute);
app.use('/api/clinic-admin', clinicAdminRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use("/api/clinic", clinicRoute);
app.use("/api/maps", mapsRoute);

// Start reminder scheduler
require('./services/reminderScheduler');
console.log('Reminder scheduler started');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Server setup
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Product server listening on port ${port}`);
});
