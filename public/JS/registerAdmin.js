function previewPhoto(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 🔹 2MB file size limit
            alert("File size must be less than 2MB!");
            event.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById("photoPreview").src = e.target.result;
            document.getElementById("photoPreview").style.display = "block";
        };
        reader.readAsDataURL(file);
    }
}function validateAdminForm(event) {
    event.preventDefault();

    // Get form values
    const username = document.getElementById("adminName")?.value.trim();
    const email = document.getElementById("adminEmail")?.value.trim();
    const password = document.getElementById("adminPassword")?.value.trim();
    const confirmPassword = document.getElementById("adminConfirmPassword")?.value.trim();
    const department = document.getElementById("adminDepartment")?.value.trim();
    const profilePhoto = document.getElementById("adminPhoto").files[0]; // ✅ Get file

    // ✅ Name Validation (Only Letters & Spaces)
    const usernameRegex = /^[A-Za-z ]+$/;
    if (!usernameRegex.test(username)) {
        alert("Name should only contain letters and spaces!");
        return false;
    }

    // ✅ Email Validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        return false;
    }



    // ✅ Password Validation
    if (password.length < 6) {
        alert("Password must be at least 6 characters long!");
        return false;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return false;
    }

    // ✅ Use FormData to send both text and file data
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("department", department);
    formData.append("password", password);
    
    if (profilePhoto && profilePhoto.size > 0) {
        formData.append("profilePhoto", profilePhoto);
    }

    console.log("🔥 Sending admin Registration Data:");
    for (let pair of formData.entries()) {
        console.log(pair[0] + ": ", pair[1]);
    }

    fetch('/registerAdmin', {
        method: 'POST',
        body: formData // ✅ Auto-sets Content-Type
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            if (data.message.includes("success")) {
                document.getElementById("adminRegistrationForm").reset();
                window.location.href = "/login";
            }
        }
    })
    .catch(error => {
        console.error("❌ Registration Error:", error);
        alert("Error: " + error.message);
    });
}