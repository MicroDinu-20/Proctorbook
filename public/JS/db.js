const dbName = "UserSessionDB";
const storeName = "sessions";

// 📌 Initialize IndexedDB and create object store
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(`❌ IndexedDB error: ${event.target.errorCode}`);
    });
}

// ✅ Save session data
window.saveSessionToDB = async function (sessionData) {
    try {
        const db = await initDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.put({ id: "userSession", ...sessionData });

        tx.oncomplete = () => console.log("✅ Session saved in IndexedDB");
        tx.onerror = (err) => console.error("❌ Error saving session:", err);
    } catch (error) {
        console.error("❌ IndexedDB error:", error);
    }
};

// 🔍 Retrieve session data
window.getSessionFromDB = async function () {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            if (!db.objectStoreNames.contains(storeName)) {
                console.error("❌ Object store not found!");
                return reject("Object store does not exist.");
            }

            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.get("userSession");

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("❌ Failed to get session");
        });
    } catch (error) {
        console.error("❌ IndexedDB error:", error);
    }
};

// ❌ Delete session (logout)
window.deleteSessionFromDB = async function () {
    try {
        const db = await initDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.delete("userSession");

        tx.oncomplete = () => console.log("✅ Session deleted from IndexedDB");
        tx.onerror = (err) => console.error("❌ Error deleting session:", err);
    } catch (error) {
        console.error("❌ IndexedDB error:", error);
    }
};

// ✅ Check and log session data after IndexedDB initializes
initDB().then((db) => {
    if (!db.objectStoreNames.contains(storeName)) {
        console.error("❌ Object store not found!");
        return;
    }

    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const getSession = store.get("userSession"); // ✅ Corrected key

    getSession.onsuccess = () => {
        console.log("✅ Session data:", getSession.result);
    };

    getSession.onerror = () => {
        console.error("❌ Error fetching session data");
    };
});
