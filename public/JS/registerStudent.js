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
}
function validateStudentForm(event) {
    event.preventDefault();

    // ✅ Get input values
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const batch = document.getElementById("batch").value.trim();
    const department = document.getElementById("department").value.trim().toUpperCase();
    const year_of_study = document.getElementById("year_of_study").value.trim();
    const regid = document.getElementById("regid").value.trim();
    const phoneNumber = document.getElementById("phoneNumber").value.trim();
    const parentPhoneNumber = document.getElementById("parentPhoneNumber").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmpassword").value.trim();
    const profilePhoto = document.getElementById("studentPhoto").files[0]; // ✅ Get file

    // ✅ Name Validation
    const nameRegex = /^[A-Za-z ]+$/;
    if (!nameRegex.test(name)) {
        alert("Name should only contain letters and spaces!");
        return false;
    }

    // ✅ Register Number Validation
    const regidRegex = /^[0-9]+$/;
    if (!regidRegex.test(regid)) {
        alert("Register No. should only contain numbers!");
        return false;
    }

    // ✅ Email Validation (Must be College Email)
    const emailRegex = /^[A-Za-z0-9._%+-]+@jerusalemengg\.ac\.in$/;
    if (!emailRegex.test(email)) {
        alert("Please use a valid college email (e.g., someone@jerusalemengg.ac.in)");
        return false;
    }

    // ✅ Phone Number Validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
        alert("Phone number must be exactly 10 digits!");
        return false;
    }
    if (!phoneRegex.test(parentPhoneNumber)) {
        alert("Parent's phone number must be exactly 10 digits!");
        return false;
    }

    // ✅ Year of Study Validation
    const validYears = ["1", "2", "3", "4"];
    if (!validYears.includes(year_of_study)) {
        alert("Please select a valid Year of Study (1st - 4th Year).");
        return false;
    }

    // ✅ Password Match Validation
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return false;
    }

    // ✅ Check for missing values
    if (!name || !email || !department || !batch || !year_of_study || !regid || !password || !phoneNumber || !parentPhoneNumber) {
        alert('All fields are required!');
        return false;
    }

    // ✅ Create FormData object
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("batch", batch);
    formData.append("year_of_study", parseInt(year_of_study)); // 🔥 Convert to number
    formData.append("department", department);
    formData.append("regid", regid);
    formData.append("phone_number", phoneNumber);
    formData.append("parent_phone_number", parentPhoneNumber);
    formData.append("password", password);

    if (profilePhoto && profilePhoto.size > 0) {
        formData.append("profilePhoto", profilePhoto);
    }

    console.log("🔥 Sending Student Registration Data:");
    for (let pair of formData.entries()) {
        console.log(pair[0] + ": ", pair[1]);
    }

    fetch('/registerStudent', {
        method: 'POST',
        body: formData // ✅ No need for 'Content-Type'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            if (data.message.includes("success")) {
                document.getElementById("registrationForm").reset();
                window.location.href = "/login";
            }
        }
    })
    .catch(error => {
        console.error("❌ Registration Error:", error);
        alert("Error: " + error.message);
    });
}