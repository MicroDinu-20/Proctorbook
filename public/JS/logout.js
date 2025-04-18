document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) throw new Error("Logout request failed!");

        // ✅ Clear IndexedDB session
        await deleteSessionFromDB();

        // ✅ Clear cookies manually
        document.cookie = "token=; Max-Age=0; path=/;";

        // ✅ Unregister service worker to remove cache
        if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                await reg.unregister();
            }
            console.log("✅ Service Worker unregistered.");
        }

        // ✅ Reload page to apply changes
        window.location.href = "/login.html";
        setTimeout(() => window.location.reload(), 100); // Extra safety

    } catch (error) {
        console.error("❌ Logout error:", error);
    }
});

// ✅ Function to delete session from IndexedDB
async function deleteSessionFromDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("UserSessionDB", 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const tx = db.transaction("sessions", "readwrite");
            const store = tx.objectStore("sessions");
            const deleteRequest = store.clear(); // ✅ Delete all sessions

            deleteRequest.onsuccess = () => {
                console.log("✅ Session deleted from IndexedDB");
                resolve();
            };
            deleteRequest.onerror = (err) => {
                console.error("❌ Error deleting session:", err);
                reject(err);
            };
        };
        request.onerror = (err) => {
            console.error("❌ IndexedDB error:", err);
            reject(err);
        };
    });
}
