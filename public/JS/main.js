window.addEventListener("load", async () => {
    // Check if the user has a saved session
    const session = await getSessionFromDB(); // Ensure this function returns a Promise

    if (session && session.redirectUrl) {
        console.log("✅ User is already signed in. Redirecting...");
        window.location.href = session.redirectUrl;
    }

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(() => {
            // First, unregister any existing service workers
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                return Promise.all(registrations.map((registration) => registration.unregister()));
            }).then(() => {
                // Now register a fresh service worker
                return navigator.serviceWorker.register("./service-worker.js");
            }).then((registration) => {
                console.log("✅ Service Worker registered:", registration.scope);
            }).catch((error) => {
                console.error("❌ Service Worker registration failed:", error);
            });
        });
    }
});
