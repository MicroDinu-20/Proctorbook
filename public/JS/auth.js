document.addEventListener("DOMContentLoaded", () => {
  autoLogin();
});

// ✅ Handle Login
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const rememberMe = document.getElementById("rememberMe").checked;

  try {
      const response = await fetch('/login', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe }),
          credentials: "include"
      });

      if (!response.ok) throw new Error("Login failed");

      const data = await response.json();

      // ✅ Save session to IndexedDB
      saveSessionToDB({
          email,
          userId: data.userId,
          redirectUrl: data.redirectUrl
      });

      // ✅ Store "Remember Me" details
      if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedEmail", email);
      } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("rememberedEmail");
      }

      // ✅ Redirect user
      window.location.href = data.redirectUrl;

  } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
  }
}

// ✅ Auto Login
function autoLogin() {
  getSessionFromDB((session) => {
      if (session) {
          console.log("✅ Auto-login: Redirecting to dashboard...");
          window.location.href = session.redirectUrl; // ✅ Auto-login
      }
  });
}
// Store session in IndexedDB
async function saveSession(sessionId, role) {
  if (!window.indexedDB) return;

  const dbRequest = indexedDB.open("UserSessionDB", 1);
  dbRequest.onupgradeneeded = function () {
      const db = dbRequest.result;
      db.createObjectStore("session", { keyPath: "id" });
  };

  dbRequest.onsuccess = function () {
      const db = dbRequest.result;
      const tx = db.transaction("session", "readwrite");
      const store = tx.objectStore("session");
      store.put({ id: "currentSession", sessionId, role });
  };
}
function getSessionFromDB() {
  return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open("UserSessionDB", 1);

      dbRequest.onsuccess = function () {
          const db = dbRequest.result;
          const tx = db.transaction("session", "readonly");
          const store = tx.objectStore("session");
          const getRequest = store.get("currentSession");

          getRequest.onsuccess = function () {
              resolve(getRequest.result || null);
          };

          getRequest.onerror = function () {
              reject("Error fetching session from IndexedDB");
          };
      };

      dbRequest.onerror = function () {
          reject("Error opening IndexedDB");
      };
  });
}


// Auto-login if session exists
window.onload = async function () {
  const session = await getSessionFromDB();
  if (session && session.sessionId) {
      fetch("/restoreSession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.sessionId })
      })
      .then(res => res.json())
      .then(data => {
          if (data.success) {
              window.location.href = data.redirectUrl;
          }
      })
      .catch(err => console.error("Auto-login failed", err));
  }
};



