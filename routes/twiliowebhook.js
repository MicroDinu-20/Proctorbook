// routes/twilioWebhook.js (new file)
const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;

router.post('/webhook', async (req, res) => {
  const fromNumber = req.body.From;
  const msg = req.body.Body;

  console.log(`📩 Reply from ${fromNumber}: ${msg}`);

  // You can log, store, or forward this to the proctor via:
  // - WhatsApp (send via Twilio)
  // - Email (nodemailer)
  
  // Example: Send back auto-reply to parent
  const twiml = new MessagingResponse();
  twiml.message('Thanks! Your response has been received.');

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

module.exports = router;
