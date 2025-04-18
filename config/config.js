require("dotenv").config();
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

// ✅ Load Google Credentials
if (process.env.GOOGLE_CREDENTIALS) {
    const serviceAccount = Buffer.from(process.env.GOOGLE_CREDENTIALS, "base64").toString("utf8");
    const credentialsPath = path.join(__dirname, "service-account.json");
    fs.writeFileSync(credentialsPath, serviceAccount);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

// ✅ Initialize Google Auth & Drive
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS ||  "S:\\PROJECT-DPB\\service-account.json",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});
const drive = google.drive({ version: "v3", auth });

/**
 * ✅ Upload Profile Photo to Google Drive
 */
async function uploadProfilePhotoToDrive(file, userId) {
    try {
        const folderId = process.env.PROFILE_PHOTO_FOLDER_ID;
        const fileMetadata = {
            name: `${userId}-${file.originalname}`,
            parents: [folderId],
        };

        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: "id, webViewLink, webContentLink",
        });

        // ✅ Make file public
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: { role: "reader", type: "anyone" },
        });

        // ✅ Delete temp file
        fs.unlink(file.path, (err) => {
            if (err) console.error("File deletion error:", err);
        });

        return {
            id: response.data.id,
            profilePhoto: `https://drive.google.com/uc?id=${response.data.id}`,
        };
    } catch (error) {
        console.error("🚨 Profile Photo Upload Error:", error);
        throw new Error("Failed to upload profile photo to Google Drive");
    }
}

/**
 * ✅ Upload Achievement to Google Drive
 */
async function uploadAchievementToDrive(file, studentId, title) {
    const fileMetadata = {
        name: `${studentId}-${file.originalname}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // 🔹 Drive Folder ID
    };

    const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id, webViewLink, webContentLink",
    });

    // 🔹 Cleanup temp file
    fs.unlinkSync(file.path);

    return response.data; // Returns file ID & links
}


// ✅ Export everything
module.exports = { uploadProfilePhotoToDrive, uploadAchievementToDrive, auth };
