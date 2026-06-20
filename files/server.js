const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());                        // Allow frontend to talk to this server
app.use(express.json());                // Parse incoming JSON request bodies

// ─── Serve the frontend ───────────────────────────────────────
// This makes fitx-frontend.html available at http://localhost:5000/
// Frontend and backend now share the same origin — no CORS issues.
app.use(express.static(__dirname));

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/data',    require('./routes/data'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/coach',   require('./routes/coach'));

// ─── Serve frontend on root ────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'fitx-frontend.html'));
});

// ─── Connect to MongoDB, then start server ───────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    console.log(`👉 Open http://localhost:${PORT} in your browser`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
