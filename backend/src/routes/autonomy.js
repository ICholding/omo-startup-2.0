const express = require('express');
const ClawbotCore = require('../../lib/autonomy/clawbot-core');

const router = express.Router();
const clawbot = new ClawbotCore();

router.post('/initialize', async (req, res) => {
  const status = await clawbot.initialize();
  res.json({
    status: 'initialized',
    clawbot: status
  });
});

router.get('/status', (req, res) => {
  res.json({
    clawbot: clawbot.status()
  });
});

router.post('/task', async (req, res) => {
  const { type, payload } = req.body || {};

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }

  const task = clawbot.taskManager.create({
    type,
    payload,
    handler: async () => {
      await clawbot.memorySystem.storeConversation({
        sessionId: `task:${type}`,
        message: `Task received: ${type}`,
        response: 'Task processed by autonomous queue',
        metadata: payload || {}
      });
    }
  });

  return res.status(201).json({ task });
});

router.get('/memory/recent', async (req, res) => {
  const recent = await clawbot.memorySystem.recent();
  res.json({ items: recent });
});

module.exports = router;
