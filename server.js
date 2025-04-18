require('dotenv').config();// Load environment variables from .env file
require('./jobs/scheduler');// Load scheduler of students year

// Required modules
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const mysql12 = require('mysql2/promise'); 
const { sendMail } = require('./utils/email');
const fs = require('fs');
const multer = require('multer');
const csvParser = require('csv-parser');
const db = require('./config/database');
const csv = require('csv-parser');
const crypto = require("crypto");
const router = express.Router();
const PORT = process.env.PORT || 3000 ;
const saltRounds = 10;
const app = express();
const studentRoutes = require("./routes/StudentRoutes");
const rateLimiter = require('express-rate-limit'); 
const proctorRoutes = require('./routes/proctorRoutes');
const { uploadProfilePhotoToDrive, uploadAchievementToDrive,auth } = require("./config/config");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const proctorRoute = require("./routes/proctor");
const updateGpaCgpa = require("./utils/updateGpaCgpa"); 
const twilioWebhook = require('./routes/twiliowebhook');




// // ✅ PostgreSQL Connection (Make sure Railway's DATABASE_URL is set correctly)
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false, // Enable SSL in production
});


  
app.use(
    session({
        store: new PgSession({
            pool: pgPool,
            tableName: "user_sessions",
            createTableIfMissing: true, // ✅ Auto-create the table (if using the latest version)
        }),
        
        secret: process.env.SESSION_SECRET ,
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Only save sessions if needed (better for performance)
        cookie: {
            secure: process.env.NODE_ENV === "production", // Use HTTPS in production
            httpOnly: true, // Protect against XSS attacks
            maxAge: 24 * 60 * 60 * 1000, // 1 day (adjust if needed)
        },
    })
);
 

// Session setup

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: { 
//         secure: false,  // Set to true if using HTTPS
//         httpOnly: true, 
//         maxAge: 24 * 60 * 60 * 1000 //1day
//     }
// }));



if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname); // Get file extension
        const safeTitle = req.body.title 
            ? req.body.title.replace(/[^a-zA-Z0-9-_]/g, "_") // Sanitize title
            : `file_${Date.now()}`; // Default if title missing
        
        const filename = `${safeTitle}${fileExt}`; // Format filename
        cb(null, filename);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, PDF, CSV, and DOCX are allowed!'), false);
    }
};


const forgotPasswordLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 5 requests per windowMs
    message: 'Too many password reset attempts. Please try again later.',
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter, // Allow up to 5MB files
});
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/", studentRoutes); // Use student routes
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));
app.use(proctorRoutes);
app.use("/JS", express.static(path.join(__dirname, "public/JS")));
app.use("/utils", express.static(path.join(__dirname, "utils")));
app.use("/api", proctorRoute);
app.use('/proctor', proctorRoutes);
app.use('/twilio', twilioWebhook);


const allowedOrigins = [
  "http://localhost:3000",  // Local frontend
  "http://localhost:5000",  // If you're testing from another local port
  "https://studentsrecordsystem-production.up.railway.app", // Deployed frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true, // Important for cookies/sessions
  })
);


app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});




function checkAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}


// async function updateStudentGpaCgpa(studentId) {
//     try {
//         const response = await fetch(`${window.location.origin}/api/update-gpa-cgpa`, { // ✅ Fix API URL
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ studentId }),
//         });

//         const data = await response.json();
//         if (data.success) {
//             console.log("✅ GPA & CGPA updated successfully!");
//             alert("GPA & CGPA updated successfully!");
//         } else {
//             console.error("❌ Error updating GPA & CGPA:", data.message);
//             alert("Failed to update GPA & CGPA.");
//         }
//     } catch (error) {
//         console.error("❌ Failed to update GPA & CGPA:", error);
//         alert("Server error occurred.");
//     }
// }



app.get("/*.js", (req, res, next) => {
    res.type("application/javascript"); // ✅ Forces correct MIME type
    next();
});

app.get('/studentDashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'studentDashboard.html'));
});

app.get('/proctorDashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'proctorDashboard.html'));
});

app.get('/adminDashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adminDashboard.html'));
});

app.use(express.static(path.join(__dirname, 'public')));
//console.log(process.env)

db.getConnection()
    .then(connection => {
        console.log('Connected to MySQL Database');
        connection.release(); 
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err);
    });

//routes to pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/registerStudent', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registerStudent.html')));
app.get('/registerProctor', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registerProctor.html')));
app.get('/registerAdmin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registerAdmin.html')));
app.get('/forgotPassword', (req, res) => res.sendFile(path.join(__dirname, 'public', 'forgotPassword.html')));
app.get('/resetPassword', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resetPassword.html')));
app.get('/proctorDashboard', (req, res) => {
    console.log('Accessing Proctor Dashboard. Session Info:', req.session);
    
    if (req.session.userId && req.session.role === 'proctor') {
        console.log('Proctor authorized. Loading dashboard...');
        res.sendFile(path.join(__dirname, 'public', 'proctorDashboard.html'));
    } else {
        console.log('Unauthorized access attempt to Proctor Dashboard. Redirecting to login.');
        res.redirect('/');
    }
});
app.get('/adminDashboard', (req, res) => {
    console.log('Accessing Admin Dashboard. Session Info:', req.session);
    
    if (req.session.userId && req.session.role === 'admin') {
        console.log('Admin authorized. Loading dashboard...');
        res.sendFile(path.join(__dirname, 'public', 'adminDashboard.html'));
    } else {
        console.log('Unauthorized access attempt to admin Dashboard. Redirecting to login.');
        res.redirect('/');
    }
});
app.get('/studentDashboard', (req, res) => {
    console.log('Accessing Student Dashboard. Session Info:', req.session);

    if (req.session.userId && req.session.role === 'student') {
        console.log('Student authorized. Loading dashboard...');
        res.sendFile(path.join(__dirname, 'public', 'studentDashboard.html'));
    } else {
        console.log('Unauthorized access attempt to Student Dashboard. Redirecting to login.');
        res.redirect('/');
    }
});

// ─────────────────────────────────AUTHENTICATION───────────────────────────────────────────────────
app.post("/logout", (req, res) => {
    res.clearCookie("token");  // ✅ Clear token cookie
    req.session.destroy(() => {
        res.status(200).json({ message: "Logged out successfully" });
    });
});
app.post("/registerStudent", upload.single("profilePhoto"), async (req, res) => {
    try {
        console.log("🔥 Received Student Registration Data:", req.body);

        const { name, email, department, batch, year_of_study, regid, password, phone_number, parent_phone_number } = req.body;

        if (!name || !email || !department || !batch || !year_of_study || !regid || !password || !phone_number || !parent_phone_number) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if the student already exists
        const [existingStudent] = await db.execute("SELECT * FROM students WHERE email = ? OR regid = ?", [email, regid]);
        if (existingStudent.length > 0) {
            return res.status(400).json({ message: "Student already registered!" });
        }

        // ✅ Default profile photo
        let profilePhoto = "https://drive.google.com/uc?id=10TyTgxEnZX0eRcbCiVmpL2Tqyo6zwyCx";

        // ✅ Upload Profile Photo if provided
        if (req.file) {
            const driveResponse = await uploadProfilePhotoToDrive(req.file, regid);
            console.log("📸 Drive Response:", driveResponse);

            if (driveResponse && driveResponse.webContentLink) {
                profilePhoto = driveResponse.webContentLink;
            } else if (driveResponse && driveResponse.id) {
                profilePhoto = `https://drive.google.com/uc?id=${driveResponse.id}`;
            }
        }

        // ✅ Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert new student with profile photo
        await db.execute(
            "INSERT INTO students (name, email, department, batch, year_of_study, regid, password, phone_number, parent_phone_number, profilePhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, email, department, batch, year_of_study, regid, hashedPassword, phone_number, parent_phone_number, profilePhoto]
        );

        console.log("✅ Student Registered:", { name, email, regid, profilePhoto });

        res.status(201).json({ message: "Student registered successfully!", fileUrl: profilePhoto });

    } catch (error) {
        console.error("❌ Error registering student:", error);
        res.status(500).json({ message: "Error registering student." });
    }
});


app.post("/registerProctor", upload.single("profilePhoto"), async (req, res) => {
    try {
        console.log("🔥 Received Proctor Registration Data:", req.body);

        const { name, email, designation, password, phone_number, department } = req.body;

        if (!name || !email || !designation || !password || !phone_number || !department) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if the proctor already exists
        const [existingProctor] = await db.execute("SELECT * FROM proctors WHERE email = ?", [email]);
        if (existingProctor.length > 0) {
            return res.status(400).json({ message: "Proctor already registered!" });
        }

        let profilePhoto = "https://drive.google.com/uc?id=10TyTgxEnZX0eRcbCiVmpL2Tqyo6zwyCx";

        // ✅ Upload Profile Photo if provided
        if (req.file) {
            const driveResponse = await uploadProfilePhotoToDrive(req.file, email);
            console.log("📸 Drive Response:", driveResponse);

            if (driveResponse && driveResponse.webContentLink) {
                profilePhoto = driveResponse.webContentLink;
            } else if (driveResponse && driveResponse.id) {
                profilePhoto = `https://drive.google.com/uc?id=${driveResponse.id}`;
            }
        }

        // ✅ Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert new proctor with profile photo
        await db.execute(
            "INSERT INTO proctors (name, email, designation, password, phone_number, department, profilePhoto) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, email, designation, hashedPassword, phone_number, department, profilePhoto]
        );

        res.status(201).json({ message: "Proctor registered successfully!", fileUrl: profilePhoto });

    } catch (error) {
        console.error("❌ Error registering proctor:", error);
        res.status(500).json({ message: "Error registering proctor." });
    }
});


app.post("/registerAdmin", upload.single("profilePhoto"), async (req, res) => {
    try {
        console.log("🔥 Received admin Registration Data:", req.body);

        const { username, email, password, department } = req.body;
        if (!username || !email || !password || !department) {
            console.error("❌ Error: Missing required fields!");
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if the admin already exists
        const [existingAdmin] = await db.execute("SELECT * FROM admins WHERE email = ?", [email]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ message: "Admin already registered!" });
        }

        let profilePhoto = "https://drive.google.com/uc?id=10TyTgxEnZX0eRcbCiVmpL2Tqyo6zwyCx";

        // ✅ Upload Profile Photo if provided
        if (req.file) {
            const driveResponse = await uploadProfilePhotoToDrive(req.file, username);
            console.log("📸 Drive Response:", driveResponse);

            if (driveResponse && driveResponse.webContentLink) {
                profilePhoto = driveResponse.webContentLink;
            } else if (driveResponse && driveResponse.id) {
                profilePhoto = `https://drive.google.com/uc?id=${driveResponse.id}`;
            }
        }


        // ✅ Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert new admin with profile photo
        await db.execute(
            "INSERT INTO admins(username, email, password, department, profilePhoto) VALUES (?, ?, ?, ?, ?)",
            [username, email, hashedPassword, department, profilePhoto]
        );

        res.status(201).json({ message: "Admin registered successfully!" });

    } catch (error) {
        console.error("❌ Error registering Admin:", error);
        res.status(500).json({ message: "Error registering Admin." });
    }
});
;
app.post('/login', async (req, res) => {
    const { email, password, role, rememberMe } = req.body;
    console.log('Login attempt:', { identifier: email, role });

    try {
        let query, identifier;

        // Determine user role query
        if (role === 'student') {
            query = 'SELECT * FROM students WHERE email = ?';
            identifier = email;
        } else if (role === 'proctor') {
            query = 'SELECT * FROM proctors WHERE email = ?';
            identifier = email;
        } else if (role === 'admin') {
            query = 'SELECT * FROM admins WHERE email = ?'; // ✅ Admin logs in with username
            identifier = email;
        } else {
            return res.status(400).json({ message: 'Invalid role selected!' });
        }

        // Fetch user from database
        const [rows] = await db.execute(query, [identifier]);
        if (rows.length === 0) {
            return res.status(400).json({ message: 'User not found!' });
        }

        const user = rows[0];

        // Validate password
        let match = false;
        if (!password) {
            return res.status(400).json({ message: 'Password is required!' });
        }

        if (role === 'admin') {
            if (user.password.startsWith("$2b$")) {
                match = await bcrypt.compare(password, user.password);
            } else {
                const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");
                match = sha256Hash === user.password;
            }
        } else {
            match = await bcrypt.compare(password, user.password);
        }

        if (!match) {
            console.log(`Invalid password attempt for user: ${identifier}`);
            return res.status(400).json({ message: 'Invalid password!' });
        }

        // Store session data
        req.session.userId = role === 'student' ? user.student_id :
                             role === 'proctor' ? user.proctor_id :
                             user.admin_id;

        if (role === 'proctor') req.session.proctor_id = user.proctor_id;
        if (role === 'admin') {
            req.session.admin_id = user.admin_id;
            req.session.department = user.department || null;
        }

        req.session.role = role;
        console.log('Session after login:', req.session);  // Log the session object

        // Set session expiration
        req.session.cookie.maxAge = rememberMe 
            ? 30 * 24 * 60 * 60 * 1000  // 30 days
            : 1 * 60 * 60 * 1000;  // 1 hour

        // Save session before responding
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session error, try again.' });
            }

            // Respond with login success & redirect URL
            const sessionId = req.sessionID;  // Get session ID
            res.status(200).json({
                success: true,
                message: 'Login successful!',
                role,
                sessionId,  // Send session ID for persistent login
                redirectUrl: role === 'student' ? '/studentDashboard' :
                             role === 'proctor' ? '/proctorDashboard' :
                             '/adminDashboard',
                userId: req.session.userId,
                department: req.session.department || 'N/A'
            });
        });

    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ message: 'An error occurred, please try again.' });
    }
});


app.post('/restoreSession', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ message: 'No session ID provided' });
    }

    // Restore session
    req.sessionStore.get(sessionId, (err, session) => {
        if (err || !session) {
            return res.status(401).json({ message: 'Session expired' });
        }

        req.session = session;  // Restore session in req
        res.json({
            success: true,
            message: 'Session restored',
            redirectUrl: session.role === 'student' ? '/studentDashboard' :
                         session.role === 'proctor' ? '/proctorDashboard' :
                         '/adminDashboard'
        });
    });
});

app.post('/forgotPassword', forgotPasswordLimiter, async (req, res) => {
    const { email, role } = req.body;

    // Validate role
    const tables = { student: 'students', proctor: 'proctors', admin: 'admins' };
    if (!tables[role]) {
        return res.status(400).send('Invalid role provided');
    }
    const tableName = tables[role];

    try {
        // Check if user exists
        const [results] = await db.execute(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
        if (results.length === 0) {
            return res.status(404).send('User not found');
        }

        // Generate secure reset code
        const code = crypto.randomInt(100000, 999999);
        const expiryDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

        // Update reset code and expiry in the database
        await db.execute(
            `UPDATE ${tableName} 
             SET reset_code = ?, reset_code_expiry = ? 
             WHERE email = ?`,
            [code, expiryDate, email]
        );

        // Send email with reset code
        try {
            await sendMail(
                email,
                'Password Reset Code',
                `Your password reset code is ${code}. It will expire in 15 minutes.`
            );
            return res.json({ message: 'Reset code sent to your email' });
        } catch (mailError) {
            console.error('Error sending reset email:', mailError);

            // Rollback reset code update to avoid inconsistency
            await db.execute(
                `UPDATE ${tableName} SET reset_code = NULL, reset_code_expiry = NULL WHERE email = ?`,
                [email]
            );

            return res.status(500).send('Failed to send reset email. Please try again.');
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        return res.status(500).send('Server error');
    }
});

app.post('/resetPassword', async (req, res) => {
    const { email, role, code, newPassword } = req.body;

    // Check if required fields are present
    if (!email || !role || !code || !newPassword) {
        return res.status(400).send('Missing required fields');
    }

    const tableName = 
        role === 'proctor' ? 'proctors' : 
        role === 'admin' ? 'admins' : 'students';

    try {
        console.log('Checking user with email:', email); // Log for debugging
        const [results] = await db.execute(
            `SELECT * FROM ${tableName} WHERE email = ? AND reset_code = ? AND reset_code_expiry > NOW()`, 
            [email, code]
        );

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired reset code');
        }

        // Hash the new password and update it in the database
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute(
            `UPDATE ${tableName} SET password = ?, reset_code = NULL, reset_code_expiry = NULL WHERE email = ?`, 
            [hashedPassword, email]
        );

        return res.json({ message: 'Password successfully reset' });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('Server error');
    }
});

// ─────────────────────────────────────Admin───────────────────────────────────────────────────────────

app.post('/importProctorData', upload.single('proctorFile'), async (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);

    if (req.file.mimetype === 'text/csv') {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    for (const row of results) {
                        // Validate the proctor data
                        if (!row.email.endsWith('@jerusalemengg.ac.in') || !/^[a-zA-Z\s]+$/.test(row.name)) {
                            throw new Error('Invalid email or name format for proctor.');
                        }
                       
                        if (!row.password) {
                            throw new Error('Password is required for proctor.');
                        }
                        if (!/^\d{10}$/.test(row.phone_number)) {
                            throw new Error('Phone number must be 10 digits.');
                        }

                        // Encrypt the password
                        const hashedPassword = await bcrypt.hash(row.password, saltRounds);

                        // Insert the proctor into the database
                        await db.execute(
                            `INSERT INTO proctors (name, email, password, designation, phone_number,department) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [row.name, row.email, hashedPassword,  row.designation, row.phone_number, row.department,]
                        );
                    }
                    res.send('Proctor data imported successfully.');
                } catch (error) {
                    const errorMessage = error.sqlMessage || 'Error importing proctor data.';
                    res.status(500).send({ message: errorMessage, error: error.message });
                } finally {
                    // Cleanup: Delete the uploaded file after processing
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting uploaded proctor file:', err);
                        }
                    });
                }
            });
    } else {
        res.status(400).send('Invalid file type. Please upload a CSV file for proctors.');
    }
});
app.post('/importStudentData', upload.single('studentFile'), async (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);

    if (req.file.mimetype === 'text/csv') {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    for (const row of results) {
                        // Validate the student data
                        if (!row.email.endsWith('@jerusalemengg.ac.in') || !/^[a-zA-Z\s]+$/.test(row.name)) {
                            throw new Error('Invalid email or name format for student.');
                        }
                        if (!/^\d+$/.test(row.regid)) {
                            throw new Error('Register No should be numeric.');
                        }
                        if (!row.password) {
                            throw new Error('Password is required for student.');
                        }
                        if (!/^\d{10}$/.test(row.phone_number)) {
                            throw new Error('Phone number must be 10 digits.');
                        }
                        if (!/^\d{10}$/.test(row.parent_phone_number)) {
                            throw new Error('Parent phone number must be 10 digits.');
                        }

                        // Encrypt the password
                        const hashedPassword = await bcrypt.hash(row.password, saltRounds);

                        // Insert the student into the database
                        await db.execute(
                            `INSERT INTO students 
                            (name, email, department, batch, regid, password, year_of_study, phone_number, parent_phone_number) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [row.name, row.email, row.department, row.batch, row.regid, hashedPassword, row.year_of_study, row.phone_number, row.parent_phone_number]
                        );
                    }
                    res.send('Student data imported successfully.');
                } catch (error) {
                    const errorMessage = error.sqlMessage || 'Error importing student data.';
                    res.status(500).send({ message: errorMessage, error: error.message });
                } finally {
                    // Cleanup: Delete the uploaded file after processing
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting uploaded student file:', err);
                        }
                    });
                }
            });
    } else {
        res.status(400).send('Invalid file type. Please upload a CSV file for students.');
    }
});
app.post('/addSubject', async (req, res) => {
    const { semester, subject_name, subject_code, credit, batch } = req.body;
    const department = req.session.department; // Ensure subjects are department-specific

    if (!semester || !subject_name || !subject_code || !credit || !batch) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        await db.execute(
            `INSERT INTO semester_subjects (semester, subject_name, subject_code, credit, department, batch)
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), credit = VALUES(credit), semester = VALUES(semester)`,
            [semester, subject_name, subject_code, credit, department, batch]
        );

        res.json({ message: 'Subject added successfully.' });
    } catch (error) {
        console.error('Error adding subject:', error);
        res.status(500).json({ message: 'Error adding subject.' });
    }
});
app.post('/deleteSubject', async (req, res) => {
    const { semester, subject_code, batch } = req.body;
    const department = req.session.department; // Ensure department-specific deletion

    if (!semester || !subject_code || !batch) {
        return res.status(400).json({ message: 'Semester, Subject Code, and Batch are required.' });
    }

    try {
        const [result] = await db.execute(
            `DELETE FROM semester_subjects
             WHERE semester = ? AND subject_code = ? AND batch = ? AND department = ?`,
            [semester, subject_code, batch, department]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No matching subject found.' });
        }

        res.json({ message: 'Subject deleted successfully.' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Error deleting subject.' });
    }
});
app.get('/getProctorsByDepartment', async (req, res) => {
    try {
        const adminDepartment = req.session.department; // Get department from session
        if (!adminDepartment) {
            return res.status(400).json({ message: "Admin department not found." });
        }

        const [proctors] = await db.execute(
            "SELECT proctor_id, name, designation, department FROM proctors WHERE department = ?",
            [adminDepartment]
        );
        if (proctors.length === 0) {
            return res.status(404).json({ message: "No proctors found in this department." });
        }

        res.json(proctors);
    } catch (error) {
        console.error("Error fetching proctors:", error);
        res.status(500).json({ message: "Error fetching proctors" });
    }
});
app.post('/getStudentsByYear', async (req, res) => {
    try {
        const { year } = req.body;
        const department = req.session.department;

        const [students] = await db.execute(
            "SELECT student_id, COALESCE(name, 'N/A') AS name, COALESCE(regid, 'N/A') AS regid FROM students WHERE year_of_study = ? AND department = ?", 
            [year, department]
        );

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Error fetching students" });
    }
});
app.post('/removeProctorFromStudents', async (req, res) => {
    try {
        const { proctor_id } = req.body;

        if (!proctor_id) {
            return res.status(400).json({ message: "Proctor ID is required!" });
        }

        // Remove proctor_id (set to NULL) for students assigned to this proctor
        await db.execute("UPDATE students SET proctor_id = NULL WHERE proctor_id = ?", [proctor_id]);

        res.json({ message: "Proctor unassigned from students successfully!" });
    } catch (error) {
        console.error("Error removing proctor from students:", error);
        res.status(500).json({ message: "Error unassigning proctor." });
    }
});
app.post('/getSubjectsByBatch', async (req, res) => {
    try {
        const { batch } = req.body;
        const department = req.session.department; // Get admin's department

        if (!batch || !department) {
            return res.status(400).json({ message: "Batch and department are required!" });
        }

        const [subjects] = await db.execute(
            `SELECT subject_name, subject_code, credit, semester, batch, department 
             FROM semester_subjects 
             WHERE batch = ? AND department = ?`,
            [batch, department]
        );

        if (subjects.length === 0) {
            return res.status(404).json({ message: "No subjects found for this batch." });
        }

        res.json(subjects);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ message: "Error fetching subjects" });
    }
});
app.post('/updateSubjects', async (req, res) => {
    try {
        const { subjects, batch } = req.body;
        const department = req.session.department;

        if (!batch || !department) {
            return res.status(400).json({ message: "Batch and department are required!" });
        }

        for (const subject of subjects) {
            const { subjectCode, subjectName, newSubjectCode, credits, semester } = subject;

            // ✅ Update semester_subjects table (for selected batch & department)
            await db.execute(
                `UPDATE semester_subjects 
                 SET subject_name = ?, subject_code = ?, credit = ?, semester = ? 
                 WHERE subject_code = ? AND batch = ? AND department = ?`,
                [subjectName, newSubjectCode, credits, semester, subjectCode, batch, department]
            );

            // ✅ Update student_academics table (for students in the batch)
            await db.execute(
                `UPDATE student_academics 
                 SET subject = ?, subject_code = ?, credit = ?, semester = ? 
                 WHERE subject_code = ? AND batch = ?`,
                [subjectName, newSubjectCode, credits, semester, subjectCode, batch]
            );
        }

        res.json({ message: "Subjects updated successfully!" });
    } catch (error) {
        console.error("Error updating subjects:", error);
        res.status(500).json({ message: "Error updating subjects" });
    }
});
app.post('/uploadSubjects', upload.single('subjectFile'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded!" });
    }
    const filePath = req.file.path;
    console.log("Uploaded file path:", filePath);

    try {
        const department = req.session.department;  // Admin's department
        const results = [];

        // Read CSV file
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    for (const row of results) {
                        // ✅ Validate CSV fields
                        if (!row.semester || !row.subject_name || !row.subject_code || !row.credit || !row.batch) {
                            throw new Error('Missing required fields in CSV.');
                        }

                        // ✅ Ensure the subject belongs to the correct department
                        if (row.department !== department) {
                            throw new Error(`Invalid department: ${row.department}. You can only upload subjects for ${department}.`);
                        }

                        // ✅ Check if the subject already exists for this batch & department
                        const [existing] = await db.execute(
                            `SELECT id FROM semester_subjects WHERE subject_code = ? AND batch = ? AND department = ?`,
                            [row.subject_code, row.batch, department]
                        );

                        if (existing.length > 0) {
                            // ✅ Update existing subject for this batch
                            await db.execute(
                                `UPDATE semester_subjects 
                                 SET subject_name = ?, credit = ?, semester = ?
                                 WHERE subject_code = ? AND batch = ? AND department = ?`,
                                [row.subject_name, row.credit, row.semester, row.subject_code, row.batch, department]
                            );
                        } else {
                            // ✅ Insert new subject for this batch
                            await db.execute(
                                `INSERT INTO semester_subjects (semester, subject_name, subject_code, credit, department, batch) 
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [row.semester, row.subject_name, row.subject_code, row.credit, department, row.batch]
                            );
                        }
                    }

                    res.json({ message: "Subjects uploaded successfully!" });

                } catch (error) {
                    res.status(500).json({ message: "Error processing CSV file.", error: error.message });
                } finally {
                    // Cleanup: Delete the uploaded file after processing
                    fs.unlink(filePath, (err) => { if (err) console.error("Error deleting file:", err); });
                }
            });

    } catch (error) {
        res.status(500).json({ message: "Error uploading file.", error: error.message });
    }
});
app.get('/getUniqueBatches', async (req, res) => {
    try {
        const [batches] = await db.execute("SELECT DISTINCT batch FROM students");
        if (!Array.isArray(batches)) {
            return res.status(500).json({ message: "Invalid data format received from database." });
        }
        
        res.json(batches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching batches" });
    }
});
app.post('/getStudentsByBatchYear', async (req, res) => {
    try {
        const { batch, year } = req.body;
        const department = req.session.department; // 🔥 Get admin's department

        if (!batch || !year || !department) {
            return res.status(400).json({ message: "Batch, year, and department are required." });
        }

        // Fetch only students in the same department, batch, and year
        const [students] = await db.execute(
            "SELECT student_id, name, regid FROM students WHERE batch = ? AND year_of_study = ? AND department = ? ORDER BY regid",
            [batch, year, department]
        );

        if (!Array.isArray(students)) {
            return res.status(500).json({ message: "Invalid data format received from database." });
        }

        res.json(students);
    } catch (error) {
        console.error("❌ Error fetching students:", error);
        res.status(500).json({ message: "Error fetching students." });
    }
});
app.post('/assignProctor', async (req, res) => {
    try {
        console.log("🔥 Received Assign Proctor Request:", req.body); // Debugging log

        const { proctor_id, student_ids } = req.body;

        if (!proctor_id || !student_ids || student_ids.length === 0) {
            return res.status(400).json({ message: "Missing proctor or students." });
        }

        // ✅ Validate proctor exists
        const [proctor] = await db.execute("SELECT proctor_id FROM proctors WHERE proctor_id = ?", [proctor_id]);
        if (proctor.length === 0) {
            return res.status(404).json({ message: "Proctor not found." });
        }

        console.log("✅ Found Proctor:", proctor); // Debugging log

        // ✅ Validate students exist
        const [students] = await db.execute(
            "SELECT student_id FROM students WHERE student_id IN (?)",
            [student_ids]
        );

        console.log("✅ Found Students in Query:", students.map(s => s.student_id)); // Debugging log

        // // ✅ Log missing students
        // let foundStudentIds = students.map(s => s.student_id);
        // let missingStudents = student_ids.filter(id => !foundStudentIds.includes(parseInt(id)));

        // console.log("❌ Missing Students:", missingStudents); // Debugging log

        // if (students.length !== student_ids.length) {
        //     return res.status(404).json({ 
        //         message: "One or more students not found.", 
        //         missing_students: missingStudents 
        //     });
        // }

        // ✅ Assign the proctor to each student
        for (const student_id of student_ids) {
            await db.execute("UPDATE students SET proctor_id = ? WHERE student_id = ?", [proctor_id, student_id]);
        }

        res.json({ message: "Proctor assigned successfully!" });

    } catch (error) {
        console.error("❌ Error assigning proctor:", error);
        res.status(500).json({ message: "Error assigning proctor." });
    }
});
app.post('/assignSubjectsByDepartment', async (req, res) => {
    try {
        const { batch } = req.body;
        const department = req.session.department;

        if (!department || !batch) {
            return res.status(400).json({ message: "Department and batch are required!" });
        }

        // 🔹 Fetch all students from the given batch & department
        const [students] = await db.execute(
            "SELECT student_id, regid, year_of_study FROM students WHERE batch = ? AND department = ?",
            [batch, department]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: "No students found for this batch and department." });
        }

        // 🔹 Fetch all subjects from the given batch & department
        const [subjects] = await db.execute(
            "SELECT subject_name, subject_code, semester, credit FROM semester_subjects WHERE batch = ? AND department = ?",
            [batch, department]
        );

        if (subjects.length === 0) {
            return res.status(404).json({ message: "No subjects found for this batch and department." });
        }

        // 🔹 Insert subjects into student_academics for each student
        for (const student of students) {
            for (const subject of subjects) {
                await db.execute(
                    `INSERT INTO student_academics (student_id, regid, subject, subject_code, semester, credit, year_of_study, department, batch) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE subject = VALUES(subject), credit = VALUES(credit), semester = VALUES(semester), year_of_study = VALUES(year_of_study)`,
                    [
                        student.student_id, student.regid, subject.subject_name, subject.subject_code,
                        subject.semester, subject.credit, student.year_of_study, department, batch
                    ]
                );
            }
        }

        res.json({ message: "Subjects assigned to students successfully!" });

    } catch (error) {
        console.error("Error assigning subjects:", error);
        res.status(500).json({ message: "Error assigning subjects." });
    }
});
app.get('/getBatchesByDepartment', async (req, res) => {
    try {
        const department = req.session.department;

        if (!department) {
            console.log("Error: Admin department not found in session.");
            return res.status(400).json({ message: "Admin department not found." });
        }

        console.log("Fetching batches for department:", department);

        const [batches] = await db.execute(
            "SELECT DISTINCT batch FROM students WHERE department = ?",
            [department]
        );

        console.log("Batches found:", batches);

        res.json(batches);
    } catch (error) {
        console.error("Error fetching department-specific batches:", error);
        res.status(500).json({ message: "Error fetching batches." });
    }
});
app.get('/getAdminDepartment', async (req, res) => {
    try {
        if (!req.session.department) {
            console.log("Error: No department found in session.");
            return res.status(400).json({ message: "Admin department not found." });
        }

        console.log("Admin department fetched:", req.session.department);
        res.json({ department: req.session.department });
    } catch (error) {
        console.error("Error fetching admin department:", error);
        res.status(500).json({ message: "Error fetching admin department." });
    }
});
// ─────────────────────────────────── PROCTOR───────────────────────────────────────────────────

app.get('/getAssignedStudents', async (req, res) => {
    try {
        const proctorId = req.session.proctor_id;
        const [proctor] = await db.execute("SELECT name, designation FROM proctors WHERE proctor_id = ?", [proctorId]);
        const [students] = await db.execute("SELECT student_id, name, regid FROM students WHERE proctor_id = ?", [proctorId]);

        res.json({
            proctorName: proctor[0].name,
            designation: proctor[0].designation,
            students
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching students." });
    }
});
app.get('/getGpaCgpa', async (req, res) => {
    try {
        const { studentId, semester } = req.query;

        // 🔹 Fetch the **average** GPA for the requested semester (ensures one value)
        const [gpaRow] = await db.execute(
            `SELECT AVG(gpa) AS gpa FROM student_academics WHERE student_id = ? AND semester = ?`,
            [studentId, semester]
        );

        // 🔹 Fetch the **average** CGPA (ensures one value)
        const [cgpaRow] = await db.execute(
            `SELECT AVG(cgpa) AS cgpa FROM student_academics WHERE student_id = ?`,
            [studentId]
        );

        // 🔹 Convert to fixed decimal (if not null)
        const gpa = gpaRow[0].gpa !== null ? Number(gpaRow[0].gpa).toFixed(2) : "--";
        const cgpa = cgpaRow[0].cgpa !== null ? Number(cgpaRow[0].cgpa).toFixed(2) : "--";

        res.json({ gpa, cgpa });

    } catch (error) {
        console.error("Error fetching GPA/CGPA:", error);
        res.status(500).json({ gpa: "--", cgpa: "--" });
    }
});
router.get('/downloadAchievement/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('SELECT file_path FROM student_achievements WHERE id = ?', [id]);
        if (result.length === 0) return res.status(404).json({ message: "File not found" });

        const filePath = path.join(__dirname, '../', result[0].file_path);
        res.download(filePath);
    } catch (error) {
        console.error("Error downloading achievement:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});
app.get('/getProctorProfile', async (req, res) => {
    try {
        const proctorId = req.session.proctor_id;
        if (!proctorId) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const [proctor] = await db.execute("SELECT *FROM proctors WHERE proctor_id = ?", [proctorId]);
        if (proctor.length === 0) {
            return res.status(404).json({ message: "Proctor not found." });
        }

        res.json(proctor[0]); // Send the proctor's details
    } catch (error) {
        console.error("Error fetching proctor profile:", error);
        res.status(500).json({ message: "Error fetching profile." });
    }
});
app.post('/updateProctorProfile', async (req, res) => {
    try {
        const proctorId = req.session.proctor_id;
        if (!proctorId) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const { name, email, designation, phone_number } = req.body;
        const updates = [];
        const values = [];

        if (name) {
            updates.push("name = ?");
            values.push(name);
        }
        if (email) {
            updates.push("email = ?");
            values.push(email);
        }
        if (designation) {
            updates.push("designation = ?");
            values.push(designation);
        }
        if (phone_number) {
            updates.push("phone_number = ?");
            values.push(phone_number);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No changes provided." });
        }

        values.push(proctorId);
        const query = `UPDATE proctors SET ${updates.join(", ")} WHERE proctor_id = ?`;

        await db.execute(query, values);
        res.json({ success: true, message: "Profile updated successfully!" });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile." });
    }
});
app.post('/uploadMarks', upload.single('marksFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const uploadPath = req.file.path;
        console.log(`📂 File uploaded: ${uploadPath}`);

        const results = new Map(); // Track updated students & semesters

        fs.createReadStream(uploadPath)
            .pipe(csvParser())
            .on('data', async (row) => {
                try {
                    const regid = (row.regid || '').trim();
                    const subject_code = (row.subject_code || '').trim();
                    const semester = parseInt(row.semester) || 0;
                    const test1 = row.test1 !== undefined && row.test1 !== '' ? parseFloat(row.test1) : null;
                    const test2 = row.test2 !== undefined && row.test2 !== '' ? parseFloat(row.test2) : null;
                    const attendance1 = row.attendance1 !== undefined && row.attendance1 !== '' ? parseFloat(row.attendance1) : null;
                    const attendance2 = row.attendance2 !== undefined && row.attendance2 !== '' ? parseFloat(row.attendance2) : null;
                    const grades = (row.grades || '').trim() || null;
                    const internal_marks = row.internal_marks !== undefined && row.internal_marks !== '' ? parseInt(row.internal_marks) : null;

                    if (!regid || !subject_code || semester === 0) {
                        console.warn("⚠️ Skipping row (missing required fields):", row);
                        return;
                    }

                    results.set(regid, semester);

                    // Check if the record already exists in the `marks` table
                    const [existingRecords] = await db.execute(
                        `SELECT * FROM marks WHERE regid = ? AND subject_code = ? AND semester = ?`,
                        [regid, subject_code, semester]
                    );

                    if (existingRecords.length > 0) {
                        // **Update only provided fields (partial update)**
                        const updates = [];
                        const values = [];

                        if (test1 !== null) {
                            updates.push("test1 = ?");
                            values.push(test1);
                        }
                        if (test2 !== null) {
                            updates.push("test2 = ?");
                            values.push(test2);
                        }
                        if (attendance1 !== null) {
                            updates.push("attendance1 = ?");
                            values.push(attendance1);
                        }
                        if (attendance2 !== null) {
                            updates.push("attendance2 = ?");
                            values.push(attendance2);
                        }
                        if (grades !== null) {
                            updates.push("grades = ?");
                            values.push(grades);
                        }
                        if (internal_marks !== null) {
                            updates.push("internal_marks = ?");
                            values.push(internal_marks);
                        }

                        if (updates.length > 0) {
                            values.push(regid, subject_code, semester);
                            await db.execute(
                                `UPDATE marks SET ${updates.join(", ")}
                                 WHERE regid = ? AND subject_code = ? AND semester = ?`,
                                values
                            );
                            console.log(`✅ Updated ${updates.length} fields for Reg ID: ${regid}, Subject: ${subject_code}`);
                        }
                    } else {
                        // **Insert new record if not exists**
                        await db.execute(
                            `INSERT INTO marks (regid, subject_code, test1, test2, attendance1, attendance2, grades, internal_marks, semester)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [regid, subject_code, test1, test2, attendance1, attendance2, grades, internal_marks, semester]
                        );
                        console.log(`✅ Inserted new record for Reg ID: ${regid}, Subject: ${subject_code}`);
                    }
                } catch (err) {
                    console.error("❌ Error processing row:", err);
                }
            })
            .on('end', async () => {
                // updateGpaCgpa()
                try {
                    if (results.size === 0) {
                        return res.status(400).json({ message: "No valid data found in CSV." });
                    }

                    console.log(`✅ Marks updated for ${results.size} students.`);

                    res.send(`
                        <script>
                            alert("Marks uploaded successfully.");
                            window.location.reload();
                        </script>
                    `);
                } catch (err) {
                    console.error("❌ Error after processing CSV:", err);
                    res.status(500).json({ message: "Error after processing CSV." });
                } finally {
                    fs.unlinkSync(uploadPath); // Clean up uploaded file
                }
            });
    } catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
app.post("/assignStudentMarks", async (req, res) => {
    try {
        const proctorId = req.session.proctor_id; // 🔥 Ensure req.user is defined
        if (!proctorId) {
            return res.status(403).json({ message: "Unauthorized access. No proctor ID found." });
        }

        // ✅ Fetch only students assigned to this proctor
        const [assignedStudents] = await db.query(
            "SELECT regid FROM students WHERE proctor_id = ?",
            [proctorId]
        );
        const assignedRegIds = new Set(assignedStudents.map(student => student.regid));

        // ✅ Fetch marks
        const [marks] = await db.query("SELECT * FROM marks");
        if (marks.length === 0) {
            return res.status(404).json({ message: "No marks found in the database." });
        }

        let updates = 0, inserts = 0;
        const processedStudents = new Set();

        for (const mark of marks) {
            const { regid, subject_code, semester, test1, test2, attendance1, attendance2, grades, internal_marks } = mark;

            // 🔥 Skip if student is not assigned to this proctor
            if (!assignedRegIds.has(regid)) {
                console.log(`⏩ Skipping Student ${regid} (Not Assigned to Proctor ${proctorId})`);
                continue;
            }

            // ✅ Check if student already has an entry in `student_academics`
            const [existingRecords] = await db.query(
                "SELECT * FROM student_academics WHERE regid = ? AND subject_code = ? AND semester = ?",
                [regid, subject_code, semester]
            );

            if (existingRecords.length > 0) {
                await db.query(
                    `UPDATE student_academics 
                    SET attendance1 = ?, attendance2 = ?, test1 = ?, test2 = ?, grades = ?, internal_marks = ?
                    WHERE regid = ? AND subject_code = ? AND semester = ?`,
                    [attendance1 ?? null, attendance2 ?? null, test1 ?? null, test2 ?? null, grades ?? null, internal_marks ?? null, regid, subject_code, semester]
                );
                updates++;
            } else {
                await db.query(
                    `INSERT INTO student_academics (regid, subject_code, semester, attendance1, attendance2, test1, test2, grades, internal_marks) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [regid, subject_code, semester, attendance1 ?? null, attendance2 ?? null, test1 ?? null, test2 ?? null, grades ?? null, internal_marks ?? null]
                );
                inserts++;
            }

            processedStudents.add(regid);
        }

        // 🔥 Trigger GPA & CGPA update for each processed student
        for (const studentId of processedStudents) {
            await updateGpaCgpa(studentId);
        }

        res.json({ message: `Marks assigned! ${updates} updated, ${inserts} inserted.` });

    } catch (error) {
        console.error("❌ Error assigning marks:", error.message);
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
});
app.post('/updateStudentMarks', async (req, res) => {
    const { regid, semester, updatedData } = req.body;

    if (!regid) {
        return res.status(400).json({ message: "Missing registration ID (regid)!" });
    }

    if (!updatedData || updatedData.length === 0) {
        return res.status(400).json({ message: "No changes detected." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const subject of updatedData) {
            const { subject_code, ...fieldsToUpdate } = subject;

            // ✅ Convert empty strings & undefined to NULL
            Object.keys(fieldsToUpdate).forEach(key => {
                if (fieldsToUpdate[key] === "" || fieldsToUpdate[key] === undefined) {
                    fieldsToUpdate[key] = null;
                }
            });

            if (Object.keys(fieldsToUpdate).length === 0) continue;

            let updateFields = Object.keys(fieldsToUpdate)
                .map(field => `${field} = ?`)
                .join(', ');

            let values = Object.values(fieldsToUpdate);
            values.push(regid, semester, subject_code);

            console.log("✅ Updating student_academics:", { regid, semester, subject_code, fieldsToUpdate });

            // ✅ Ensure no undefined values before query execution
            if (values.includes(undefined)) {
                console.error("🚨 Undefined value detected in query parameters:", values);
                continue;
            }

            // ✅ Update student_academics table
            const sqlAcademics = `UPDATE student_academics 
                                  SET ${updateFields} 
                                  WHERE regid = ? AND semester = ? AND subject_code = ?`;
            await connection.execute(sqlAcademics, values);

            // ✅ Update marks table
            const sqlMarks = `UPDATE marks 
                              SET ${updateFields} 
                              WHERE regid = ? AND semester = ? AND subject_code = ?`;
            await connection.execute(sqlMarks, values);
        }

        await connection.commit();
        res.json({ message: "Marks updated successfully." });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error updating marks:", error);
        res.status(500).json({ message: "Error updating marks." });

    } finally {
        connection.release();
    }
});

//──────────────────────────────────Proctor&Students───────────────────────────────────────────
app.get('/getStudentAcademicRecord/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Fetch student details
        const [student] = await db.execute(
            "SELECT name, regid FROM students WHERE student_id = ?", 
            [studentId]
        );

        // If student does not exist
        if (student.length === 0) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Fetch academic records
        const [subjects] = await db.execute(
            "SELECT * FROM student_academics WHERE student_id = ?", 
            [studentId]
        );

        res.json({ 
            student: student[0], 
            subjects 
        });

    } catch (error) {
        console.error("Error loading academic records:", error);
        res.status(500).json({ message: "Error loading academic records." });
    }
});
app.get('/getStudentAchievements/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const [achievements] = await db.execute(
            "SELECT id, title, file_path FROM student_achievements WHERE student_id = ?", 
            [studentId]
        );

        // 🔹 Convert file IDs to Google Drive preview & download links
        const achievementsWithLinks = achievements.map(ach => ({
            id: ach.id,
            title: ach.title,
            previewLink: `https://drive.google.com/file/d/${ach.file_path}/view?usp=sharing`,
            downloadLink: `https://drive.google.com/uc?export=download&id=${ach.file_path}`
        }));

        res.json(achievementsWithLinks);

    } catch (error) {
        console.error("❌ Error fetching achievements:", error);
        res.status(500).json({ message: "Error fetching achievements." });
    }
});
 
app.get('/downloadAchievement/:id', async (req, res) => {
    try {
        const achId = req.params.id;

        const [achievement] = await db.execute(
            "SELECT file_path, title FROM student_achievements WHERE id = ?", 
            [achId]
        );

        if (achievement.length === 0) {
            return res.status(404).json({ message: "Achievement not found." });
        }

        const filePath = path.join(__dirname, achievement[0].file_path);
        res.download(filePath, achievement[0].file_name);

    } catch (error) {
        console.error("Error downloading achievement:", error);
        res.status(500).json({ message: "Error downloading achievement." });
    }
});

app.get('/api/session', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const response = { userId: req.session.userId };  // Default: Return userId

    if (req.session.role === 'proctor') {
        response.role = req.session.role;  // Add role only for proctors
    }

    res.json(response);
});


// ✅ Upload Profile Photo API
app.post('/upload-profile', upload.single('profilePhoto'), async (req, res) => {
    try {
        const { userId, userType } = req.body; // 🔹 Get user type
        if (!userId || !userType) 
            return res.status(400).json({ success: false, message: "User ID and type are required" });

        // 🔹 Upload to Google Drive
        const driveFile = await uploadProfilePhotoToDrive(req.file, userId);
        if (!driveFile || !driveFile.profilePhoto) {
            return res.status(500).json({ success: false, message: "Drive upload failed" });
        }

        // 🔹 Dynamically update the correct table
        const validTables = ["admins", "students", "proctors"];
        if (!validTables.includes(userType)) 
            return res.status(400).json({ success: false, message: "Invalid user type" });

        await db.execute(
            `UPDATE ${userType} SET profilePhoto = ? WHERE id = ?`, 
            [driveFile.profilePhoto, userId]
        );

        res.json({ 
            success: true, 
            message: "Profile photo uploaded successfully!",
            fileUrl: driveFile.profilePhoto 
        });

    } catch (error) {
        console.error("❌ Profile Photo Upload Error:", error);
        res.status(500).json({ success: false, message: "Server error while uploading profile photo" });
    }
});



// ✅ Upload Achievement API
app.post('/uploadAchievement', upload.single('file'), async (req, res) => {
    try {
        const { student_id, title } = req.body;
        if (!title) return res.status(400).json({ success: false, message: "Title is required" });

        // 🔹 Upload file to Google Drive
        const driveFile =await uploadAchievementToDrive(req.file, student_id, title);
        if (!driveFile || !driveFile.id) {
            return res.status(500).json({ success: false, message: "Drive upload failed" });
        }

        // 🔹 Store file ID in the database
        await db.execute(
            "INSERT INTO student_achievements (student_id, title, file_path) VALUES (?, ?, ?)",
            [student_id, title, driveFile.id]
        );

        res.json({ 
            success: true, 
            message: "Achievement uploaded successfully!",
            previewLink: driveFile.webViewLink,
            downloadLink: driveFile.webContentLink
        });

    } catch (error) {
        console.error("❌ Error uploading achievement:", error);
        res.status(500).json({ success: false, message: "Server error while uploading achievement" });
    }
});

app.get("/getUserProfile", async (req, res) => {
    try {
        console.log(req.session);

        // Check if session exists and has userId & role
        if (!req.session || !req.session.userId || !req.session.role) {
            return res.status(400).json({ message: "Session not found or incomplete" });
        }

        const { userId, role } = req.session;
        let profilePhotoUrl = '';

        let query = "";
        let param = [];

        if (role === "student") {
            query = "SELECT profilePhoto FROM students WHERE student_id = ?";
            param = [userId];
        } else if (role === "proctor") {
            query = "SELECT profilePhoto FROM proctors WHERE proctor_id = ?";
            param = [userId];
        } else if (role === "admin") {
            query = "SELECT profilePhoto FROM admins WHERE admin_id = ?";
            param = [userId];
        } else {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Execute the query
        const [rows] = await db.execute(query, param);

        if (rows.length === 0) {
            return res.status(404).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} not found` });
        }

        profilePhotoUrl = rows[0].profilePhoto;

        // Convert Google Drive links to direct image links
        if (profilePhotoUrl.includes("drive.google.com")) {
            const match = profilePhotoUrl.match(/(?:id=|\/d\/)([^\/?]+)/);
            if (match) {
                profilePhotoUrl = `https://drive.google.com/uc?id=${match[1]}`;
            }

        }

        res.json({ profilePhoto: profilePhotoUrl });

    } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/api/getStudentProfile', async (req, res) => {
    try {
        const studentId = req.session.userId;
        if (!studentId) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const [student] = await db.execute("SELECT *FROM students WHERE student_id = ?", [studentId]);
        if (student.length === 0) {
            return res.status(404).json({ message: "Student not found." });
        }

        res.json(student[0]); // Send the proctor's details
    } catch (error) {
        console.error("Error fetching student profile:", error);
        res.status(500).json({ message: "Error fetching student." });
    }
});
app.post('/updateStudentProfile', async (req, res) => {
    try {
        const studentId = req.session.userId;
        if (!studentId) {
            return res.status(401).json({ message: "Unauthorized. Please log in again." });
        }

        const { name, email, department, batch, regid, phone_number, status } = req.body;
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push("name = ?");
            values.push(name);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            values.push(email);
        }
        if (department !== undefined) {
            updates.push("department = ?");
            values.push(department);
        }
        if (batch !== undefined) {
            updates.push("batch = ?");
            values.push(batch);
        }
        if (regid !== undefined) {
            updates.push("regid = ?");
            values.push(regid);
        }
        if (phone_number !== undefined) {
            updates.push("phone_number = ?");
            values.push(phone_number);
        }
        if (status !== undefined) {
            updates.push("status = ?");
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No changes provided." });
        }

        values.push(studentId);
        const query = `UPDATE students SET ${updates.join(", ")} WHERE student_id = ?`;

        await db.execute(query, values);
        res.json({ success: true, message: "Profile updated successfully!" });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile." });
    }
});





//──────────────────────────────────Routes───────────────────────────────────────────────────
router.use((req, res) => {
    res.status(404).json({ success: false, message: "API not found" });
});

// Start the server//RAILWAY
app.listen(PORT, () => {
    // console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Server is running on Railway : ${PORT}`);
});

module.exports = app;
module.exports = router;

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.set("trust proxy", 1); // Trust first proxy
