document.addEventListener("DOMContentLoaded", () => {
    const proctorButton = document.getElementById("proctorButton");
    const studentButton = document.getElementById("studentButton");
    const adminButton = document.getElementById("adminButton");
    const selectedRoleInput = document.getElementById("selectedRole");
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    const rememberMeCheckbox = document.getElementById("rememberMe");
    const emailInput = document.getElementById("email");
    const loginForm = document.getElementById("loginForm");

    // ✅ Default role: Admin
    selectedRoleInput.value = "proctor";
    adminButton.classList.add("deselected");
    studentButton.classList.add("deselected");
    proctorButton.classList.add("selected");

    // ✅ Remember Me: Load saved email
    if (emailInput && rememberMeCheckbox) {
        if (localStorage.getItem("rememberMe") === "true") {
            emailInput.value = localStorage.getItem("rememberedEmail") || "";
            rememberMeCheckbox.checked = true;
        }
    }

    // ✅ Role selection function
    function selectRole(role, selectedButton) {
        selectedRoleInput.value = role;

        [adminButton, proctorButton, studentButton].forEach((btn) => {
            btn.classList.toggle("selected", btn === selectedButton);
            btn.classList.toggle("deselected", btn !== selectedButton);
        });
    }

    adminButton.addEventListener("click", () => selectRole("admin", adminButton));
    proctorButton.addEventListener("click", () => selectRole("proctor", proctorButton));
    studentButton.addEventListener("click", () => selectRole("student", studentButton));

    // ✅ Password visibility toggle
    // togglePassword.addEventListener("click", () => {
    //     passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    //     togglePassword.textContent = passwordInput.type === "password" ? "👁️" : "🙈";
    // });

    // ✅ Handle login form submission
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = selectedRoleInput.value.trim();
        const rememberMe = rememberMeCheckbox.checked;

        if (!email || !password || !role) {
            alert("⚠️ All fields are required!");
            return;
        }

        try {//RAILWAY
            // const response = await fetch('/login', {
            const response = await fetch('https://studentsrecordsystem-production.up.railway.app/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role, rememberMe }),
                credentials: "include"
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Login Successful:", data);

            // ✅ Store "Remember Me" preference
            if (rememberMe) {
                localStorage.setItem("rememberMe", "true");
                localStorage.setItem("rememberedEmail", email);
                
                // ✅ Store session in IndexedDB (ONLY if Remember Me is checked)
                await saveSessionToDB({
                    email,
                    role,
                    userId: data.userId,
                    department: data.department || 'N/A',
                    redirectUrl: data.redirectUrl
                });
            } else {
                localStorage.removeItem("rememberMe");
                localStorage.removeItem("rememberedEmail");
            }

            // ✅ Redirect user to dashboard
            const redirectURL = data.redirectUrl || {
                student: "/studentDashboard",
                proctor: "/proctorDashboard",
                admin: "/adminDashboard",
            }[role];

            if (!redirectURL) throw new Error("No redirect URL provided");
            window.location.href = redirectURL;

        } catch (error) {
            console.error("❌ Login failed:", error);
            alert(error.message || "Login failed. Please check your credentials.");
        }
    });

    // ✅ Function to store session safely
    async function saveSessionToDB(sessionData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("UserSessionDB", 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("sessions")) {
                    db.createObjectStore("sessions", { keyPath: "id" });
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                const tx = db.transaction("sessions", "readwrite");
                const store = tx.objectStore("sessions");
                const saveRequest = store.put({ id: "userSession", ...sessionData });
                saveRequest.onsuccess = () => {
                    console.log("✅ Session saved in IndexedDB");
                    resolve();
                };
                saveRequest.onerror = (err) => {
                    console.error("❌ Error saving session:", err);
                    reject(err);
                };
            };
            request.onerror = (err) => {
                console.error("❌ IndexedDB error:", err);
                reject(err);
            };
        });
    }
});
