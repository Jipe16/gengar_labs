// ✅ Get user data from localStorage
const userId = localStorage.getItem("userId");
const username = localStorage.getItem("username");

// ✅ Redirect to login if not logged in
if (!userId) {
    window.location.href = "login.html";
}

// ✅ Display Username
document.getElementById("username-display").textContent = username;

// ✅ Load User Decks from the Backend
const loadUserDecks = async () => {
    try {
        const response = await fetch("http://localhost:5000/load-decks", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (!response.ok) {
            throw new Error("Failed to load decks.");
        }

        const { decks } = await response.json();
        const deckList = document.getElementById("deck-list");
        deckList.innerHTML = "";

        if (decks.length === 0) {
            deckList.innerHTML = "<p>No saved decks yet. Click 'Create New Deck' to start.</p>";
            return;
        }

        // ✅ Loop through and display each deck
        decks.forEach(deck => {
            const totalCardCount = deck.cards.reduce((sum, card) => sum + (card.count || 1), 0);

            const deckItem = document.createElement("li");
            deckItem.innerHTML = `
                <span>${deck.deck_name} (${totalCardCount} cards)</span>
                <div class="deck-actions">
                    <button class="load-deck" data-id="${deck.id}">Editar</button>
                    <button class="publish-deck" data-id="${deck.id}">📢 Publicar</button>
                    <button class="delete-deck" data-id="${deck.id}">🗑️ Deletar</button>
                </div>
            `;


            deckList.appendChild(deckItem);

            // ✅ Botão "Load"
            deckItem.querySelector(".load-deck").addEventListener("click", () => {
                localStorage.setItem("selectedDeck", deck.id);
                window.location.href = "index.html";
            });

            // ✅ Botão "Publicar"
            deckItem.querySelector(".publish-deck").addEventListener("click", () => {
                localStorage.setItem("selectedDeck", deck.id); // CORRETO AGORA
                window.location.href = "submit-community.html";
            });

            deckItem.querySelector(".delete-deck").addEventListener("click", async () => {
                const confirmDelete = confirm("Tem certeza que deseja deletar este deck? Caso ele tenha sido publicado na comunidade, será removido de lá também.");
                if (!confirmDelete) return;

                try {
                    const response = await fetch(`http://localhost:5000/delete-deck/${deck.id}`, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("token")}`
                        }
                    });

                    if (response.ok) {
                        alert("Deck deleted successfully!");
                        loadUserDecks(); // Recarrega lista de decks
                    } else {
                        const data = await response.json();
                        alert(`Failed to delete deck: ${data.error}`);
                    }
                } catch (err) {
                    console.error("Error deleting deck:", err);
                    alert("An error occurred while deleting the deck.");
                }
            });

        });

    } catch (error) {
        console.error("❌ Error loading decks:", error);
    }
};

// ✅ Run on Page Load
document.addEventListener("DOMContentLoaded", loadUserDecks);

// ✅ Logout
document.getElementById("logout-button").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedDeck");

    window.location.href = "login.html";
});

// ✅ Create New Deck
document.getElementById("create-new-deck").addEventListener("click", () => {
    localStorage.removeItem("selectedDeck");
    window.location.href = "index.html";
});
