const BACKEND_URL = "https://atlas-backend.yoursubdomain.workers.dev"; // Your worker URL

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const feedback = document.getElementById("authFeedback");
    feedback.textContent = "Verifying secure identity context...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Authentication refused.");

        // If successful, save standard non-sensitive session reference and move to the dashboard
        localStorage.setItem("atlas_user", JSON.stringify(data.user));
        window.location.href = "dashboard.html";

    } catch (error) {
        feedback.textContent = `[DENIED] ${error.message}`;
    }
});