const express = require('express');
const { protect } = require('../middleware/auth');
const router  = express.Router();

// All coach routes require login
router.use(protect);

// ─────────────────────────────────────────────────────────────
// POST /api/coach/chat
// Calls your locally-running fine-tuned FitX model via Ollama
// instead of the Anthropic API. Completely free, runs offline.
// ─────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages array is required' });
  }

  // Take just the latest user message — our model was trained
  // on single-turn instruction/response pairs, not multi-turn chat
  const latestMessage = messages[messages.length - 1]?.content || '';

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:  'fitx-coach',
        prompt: latestMessage,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Ollama error:', errText);
      return res.status(500).json({ message: 'Local AI model error — is Ollama running?' });
    }

    const data = await response.json();

    // Reshape Ollama's response to match the format the frontend expects
    // (same shape as Anthropic's API response, so frontend code doesn't change)
    res.json({
      content: [{ type: 'text', text: data.response }],
    });
  } catch (err) {
    console.error('Coach chat error:', err);
    res.status(500).json({ message: 'Failed to reach local AI coach. Make sure Ollama is running (ollama serve).' });
  }
});

module.exports = router;
