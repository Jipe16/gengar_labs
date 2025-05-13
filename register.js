document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("✅ Registration successful! Please check your email to verify your account.");
                registerForm.reset();
            } else {
                alert(`❌ ${data.error || "Registration failed."}`);
            }
        } catch (err) {
            console.error("Error:", err);
            alert("❌ Error occurred during registration.");
        }
    });
});
