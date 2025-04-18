const twilio = require('twilio');
require('dotenv').config();

const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendWhatsAppMessage(toNumber, contentSid, contentVars = {}) {
  try {
    // Ensure the number is in +91 format
    if (!toNumber.startsWith('+')) {
      toNumber = '+91' + toNumber;
    }

    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', 
      to: `whatsapp:${toNumber}`,
//SMS
      // from: process.env.TWILIO_PHONE_NUMBER,
      // to: toNumber,

      contentSid,
      contentVariables: JSON.stringify(contentVars),
    });

    console.log(`✅ Sent to ${toNumber}: ${message.sid}`);
  } catch (err) {
    console.error(`❌ Failed for ${toNumber}: ${err.message}`);
  }
}

module.exports = { sendWhatsAppMessage };
