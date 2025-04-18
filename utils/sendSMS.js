const twilio = require('twilio');
require('dotenv').config();

const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendSMSMessage(toNumber, messageText) {
  try {
    if (!toNumber.startsWith('+')) {
      toNumber = '+91' + toNumber;
    }

    const message = await client.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });

    console.log(`✅ SMS sent to ${toNumber}: ${message.sid}`);
  } catch (err) {
    console.error(`❌ SMS failed for ${toNumber}: ${err.message}`);
  }
}

module.exports = { sendSMSMessage };
