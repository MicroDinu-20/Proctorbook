const cron = require('node-cron');
const db = require('../config/database'); // Database connection

// Function to promote students and update student_academics
const updateStudentsYear = async () => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        // const currentMonth=5;

        // Check if it's June (Month 5 because it's zero-based index)
        if (currentMonth === 5) {
            // Promote students who are NOT in 4th year
            const studentUpdateQuery = `
                UPDATE students 
                SET year_of_study = year_of_study + 1 
                WHERE year_of_study < 4
            `;
            const [studentResult] = await db.execute(studentUpdateQuery);

            // Mark 4th year students as "Passed Out" in both tables
            const markPassedOutStudentsQuery = `
                UPDATE students 
                SET status = 'Passed Out' 
                WHERE year_of_study = 4
            `;
            const [passedOutStudentsResult] = await db.execute(markPassedOutStudentsQuery);

            const markPassedOutAcademicsQuery = `
                UPDATE student_academics 
                SET status = 'Passed Out' 
                WHERE year_of_study = 4
            `;
            const [passedOutAcademicsResult] = await db.execute(markPassedOutAcademicsQuery);

            // Promote students in student_academics (excluding Passed Out students)
            const academicsUpdateQuery = `
                UPDATE student_academics 
                SET year_of_study = year_of_study + 1 
                WHERE year_of_study < 4
            `;
            const [academicsResult] = await db.execute(academicsUpdateQuery);

            console.log('✅ Student years updated:', studentResult.affectedRows);
            console.log('✅ Students marked as "Passed Out":', passedOutStudentsResult.affectedRows);
            console.log('✅ Student academics marked as "Passed Out":', passedOutAcademicsResult.affectedRows);
            console.log('✅ Student academics updated:', academicsResult.affectedRows);
        } else {
            console.log("⏳ Not June yet. No updates applied.");
        }
    } catch (err) {
        console.error('❌ Error updating student records:', err);
    }
};

// Run job at midnight on June 1st every year
cron.schedule('0 0 1 6 *', updateStudentsYear);

// Run job every minute (for testing)
// cron.schedule('5 * * * *', updateStudentsYear);

// ✅ Run immediately to test
// updateStudentsYear();
