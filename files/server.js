const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());                        // Allow frontend to talk to this server
app.use(express.json());                // Parse incoming JSON request bodies

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/data',    require('./routes/data'));
app.use('/api/profile', require('./routes/profile'));

// ─── Health check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '✅ FitX API is running' });
});

// ─── Connect to MongoDB, then start server ───────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
