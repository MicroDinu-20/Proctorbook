const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Adjust path as needed to your database connection
const { sendWhatsAppMessage } = require('../utils/whatsappSender');


// Endpoint to get students by year
router.get('/getStudentsByYear', async (req, res) => {
    const year = req.query.year;
    
    try {
        const [students] = await db.query(
            'SELECT student_id, name FROM students WHERE year_of_study = ?',
            [year]
        );

        res.json(students);
    } catch (error) {
        console.error("Error fetching students by year:", error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

//whatsapp

router.post('/notifyParents', async (req, res) => {
  try {
    const { semester } = req.body;
    const proctorId = req.session.proctor_id;

    const [students] = await db.execute(
      "SELECT name, parent_phone_number FROM students WHERE proctor_id = ?",
      [proctorId]
    );

    if (!students.length) {
      return res.status(404).json({ message: "No assigned students found." });
    }

    for (const student of students) {
      await sendWhatsAppMessage(
        student.parent_phone_number,
        process.env.TWILIO_TEMPLATE_SID,
        {
          "1": student.name,
          "2": semester
        }
      );
      
    }

    res.json({ message: "✅ Parents notified successfully." });
  } catch (error) {
    console.error("❌ Error notifying parents:", error);
    res.status(500).json({ message: "Error sending WhatsApp messages." });
  }
});



//SMS

// router.post('/notifyParents', async (req, res) => {
//   try {
//     const { semester } = req.body;
//     const proctorId = req.session.proctor_id;

//     const [students] = await db.execute(
//       "SELECT name, parent_phone_number FROM students WHERE proctor_id = ?",
//       [proctorId]
//     );

//     if (!students.length) {
//       return res.status(404).json({ message: "No assigned students found." });
//     }

//     for (const student of students) {
//       const messageText = `Hello, this is the proctor of ${student.name}. The semester ${semester} results are now available. Please check the student portal for more details.`;
//       await sendSMSMessage(student.parent_phone_number, messageText);
//     }

//     res.json({ message: "✅ Parents notified via SMS." });
//   } catch (error) {
//     console.error("❌ Error notifying parents via SMS:", error);
//     res.status(500).json({ message: "Failed to send SMS messages." });
//   }
// });


module.exports = router;


