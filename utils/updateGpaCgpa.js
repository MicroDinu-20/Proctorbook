const db = require("../config/database");
async function updateGpaCgpa(studentId) {
    try {
        console.log(`🔄 Updating GPA & CGPA for Student ID: ${studentId}`);

        // Fetch all subjects for the student
        const [subjects] = await db.execute(
            `SELECT subject_code, semester, credit FROM student_academics WHERE regid = ?`,
            [studentId]
        );

        if (!subjects.length) {
            console.log(`⚠️ No subjects found for Student ID: ${studentId}`);
            return;
        }

        let totalGpa = 0; // To store cumulative GPA for CGPA calculation
        let totalCredits = 0;

        // Group subjects by semester
        const semesters = {};
        subjects.forEach(({ semester, subject_code, credit }) => {
            if (!semesters[semester]) semesters[semester] = [];
            semesters[semester].push({ subject_code, credit });
        });

        // Loop through each semester to calculate GPA & CGPA
        for (const semester in semesters) {
            const [result] = await db.execute(`
                SELECT 
                    SUM(
                        CASE 
                            WHEN sa.grades = 'O' THEN 10 * sa.credit
                            WHEN sa.grades = 'A+' THEN 9 * sa.credit
                            WHEN sa.grades = 'A' THEN 8 * sa.credit
                            WHEN sa.grades = 'B+' THEN 7 * sa.credit
                            WHEN sa.grades = 'B' THEN 6 * sa.credit
                            WHEN sa.grades = 'C' THEN 5 * sa.credit
                            ELSE 0
                        END
                    ) / NULLIF(SUM(sa.credit), 0) AS gpa
                FROM student_academics sa
                WHERE sa.regid = ? AND sa.semester = ?
            `, [studentId, semester]);

            const gpa = result.length ? parseFloat(result[0].gpa) : 0;

            // Update GPA for each subject in this semester
            for (const { subject_code } of semesters[semester]) {
                await db.execute(`
                    UPDATE student_academics 
                    SET gpa = ? 
                    WHERE regid = ? AND semester = ? AND subject_code = ?
                `, [gpa, studentId, semester, subject_code]);
            }

            console.log(`✅ GPA updated for Student ID: ${studentId}, Semester: ${semester} -> GPA: ${gpa}`);

            // 🔹 CGPA Calculation (Cumulative)
            totalGpa += gpa * semesters[semester].length;
            totalCredits += semesters[semester].length;

            const cgpa = parseFloat((totalGpa / totalCredits).toFixed(3));

            // Update CGPA for all subjects in this semester
            for (const { subject_code } of semesters[semester]) {
                await db.execute(`
                    UPDATE student_academics 
                    SET cgpa = ? 
                    WHERE regid = ? AND semester = ? AND subject_code = ?
                `, [cgpa, studentId, semester, subject_code]);
            }

            console.log(`✅ CGPA updated for Student ID: ${studentId}, Semester: ${semester} -> CGPA: ${cgpa}`);
        }

    } catch (error) {
        console.error(`❌ Error updating GPA/CGPA for Student ID: ${studentId}:`, error);
    }
}

module.exports = updateGpaCgpa;
