document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
        alert("You must be logged in to view your account.");
        window.location.href = "login.html";
        return;
    }

    const usernameSpan = document.getElementById("current-username");
    const emailSpan = document.getElementById("current-email");
    const maskedPasswordSpan = document.getElementById("current-password");

    // ✅ Load current user data
    fetch("http://localhost:5000/user-info", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            usernameSpan.textContent = data.username;
            emailSpan.textContent = data.email;
            maskedPasswordSpan.textContent = "********"; // we never show real password
        })
        .catch(err => {
            console.error("Failed to load profile:", err);
            alert("Failed to load user profile.");
        });

    // ✅ Button Handlers
    document.getElementById("change-username")?.addEventListener("click", async () => {
        const newUsername = prompt("Enter your new username:");
        if (!newUsername) return;
        await updateUserField("username", newUsername);
    });

    document.getElementById("change-email")?.addEventListener("click", async () => {
        const newEmail = prompt("Enter your new email:");
        if (!newEmail) return;
        await updateUserField("email", newEmail);
    });

    document.getElementById("change-password")?.addEventListener("click", async () => {
        const newPassword = prompt("Enter your new password:");
        if (!newPassword) return;

        if (!isStrongPassword(newPassword)) {
            alert("Sua senha deve conter:\n- No mínimo 8 caracteres\n- 1 letra maiúscula\n- 1 letra minúscula\n- 1 número\n- 1 símbolo.");
            return;
        }

        await updateUserField("password", newPassword);
    });

    async function updateUserField(field, value) {
        try {
            const response = await fetch("http://localhost:5000/update-user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ field, value })
            });

            const data = await response.json();

            if (response.ok) {
                alert("✅ Account updated successfully!");
                location.reload();
            } else {
                alert("❌ Failed to update: " + data.error);
            }
        } catch (error) {
            console.error("Update failed:", error);
            alert("❌ Error updating account.");
        }
    }

    document.getElementById("back-to-decks")?.addEventListener("click", () => {
        window.location.href = "decklists.html";
    });

    // ✅ Função de validação de senha forte
    function isStrongPassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasDigit && hasSymbol;
    }
});
