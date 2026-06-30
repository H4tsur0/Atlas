// FOR LOCAL TESTING: Point this directly to your local Wrangler development server
const BACKEND_URL = "http://127.0.0.1:8787"; 

let isLoginMode = true;

const formToggle = document.getElementById("formToggle");
const submitBtn = document.getElementById("submitBtn");
const feedback = document.getElementById("authFeedback");

// Let users click to flip between Login and Register states
formToggle.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        submitBtn.textContent = "Authenticate (Login)";
        formToggle.textContent = "Need an account? Register here";
    } else {
        submitBtn.textContent = "Create Account (Register)";
        formToggle.textContent = "Have an account? Login here";
    }
    feedback.textContent = "";
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedback.textContent = "Processing secure context...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Dynamically pick the backend route based on mode
    const endpoint = isLoginMode ? "/api/v1/auth/login" : "/api/v1/auth/register";

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Action refused by edge runtime.");

        if (isLoginMode) {
            feedback.style.color = "#f4f4f4";
            feedback.textContent = "Access Granted. Redirecting...";
            localStorage.setItem("atlas_user", JSON.stringify(data.user));
            window.location.href = "dashboard.html";
        } else {
            feedback.style.color = "#44ff44"; // Clean green success text
            feedback.textContent = "Registration complete! You can now log in.";
            // Flip back to login mode automatically
            formToggle.click();
        }

    } catch (error) {
        feedback.style.color = "var(--accent-color)";
        feedback.textContent = `[DENIED] ${error.message}`;
    }
});
