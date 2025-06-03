document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");

    const isStrongPassword = (password) => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&^()\-_=+])[A-Za-z\d@$!%*?#&^()\-_=+]{8,}$/;
        return strongPasswordRegex.test(password);
    };

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        if (!isStrongPassword(password)) {
            alert("Password must be at least 8 characters, include uppercase, lowercase, number and special character.");
            return;
        }

        try {
            const response = await fetch("/register", {
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
