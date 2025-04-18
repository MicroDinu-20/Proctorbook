const express = require("express");
const router = express.Router();
const updateGpaCgpa = require("../utils/updateGpaCgpa"); // ✅ Ensure the correct import path

router.post("/update-gpa-cgpa", async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({ success: false, message: "Student ID is required" });

        await updateGpaCgpa(studentId);
        res.json({ success: true, message: "GPA & CGPA updated successfully" });
    } catch (error) {
        console.error("Error updating GPA & CGPA:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = router;
