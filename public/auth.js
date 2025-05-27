document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loadingSpinner = document.getElementById("login-loading");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            if (!username || !password) {
                alert("Please enter both username/email and password.");
                return;
            }

            // ✅ Show spinner
            loadingSpinner.style.display = "block";

            try {
                const response = await fetch("http://localhost:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("username", data.username);
                    localStorage.setItem("userId", data.userId);

                    // ✅ Preload cards before navigating
                    const cardsResponse = await preloadCards();
                    if (cardsResponse) {
                        window.location.href = "decklists.html";
                    }
                } else {
                    alert(data.error || "Login failed.");
                    loadingSpinner.style.display = "none";
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("Failed to connect to the server.");
                loadingSpinner.style.display = "none";
            }
        });
    }
});


// ✅ Function to Fetch All Cards and Store in Cache
const preloadCards = async () => {
    const API_KEY = "905ecd24-0044-48cf-a8a8-8c709f550065";
    const standardSets = [
        "Scarlet & Violet", "Brilliant Stars", "Astral Radiance",
        "Pokemon Go", "Lost Origin", "Silver Tempest", "Crown Zenith",
        "Paldea Evolved", "Obsidian Flames", "151", "Paradox Rift",
        "Paldean Fates", "Temporal Forces"
    ];

    let allFetchedCards = [];
    const batchSize = 3;

    for (let i = 0; i < standardSets.length; i += batchSize) {
        const batchSets = standardSets.slice(i, i + batchSize);
        const batchQuery = batchSets.map(set => `set.name:"${set}"`).join(" OR ");
        const batchURL = `https://api.pokemontcg.io/v2/cards?q=(${encodeURIComponent(batchQuery)})&pageSize=250&select=id,name,number,set,images,tcgplayer,tcgplayer.productId,supertype,subtypes,rarity,types`;




        try {
            const response = await fetch(`${batchURL}&pageSize=250`, {
                headers: { "X-Api-Key": API_KEY }
            });

            if (!response.ok) throw new Error(`Error fetching batch: ${response.statusText}`);

            const data = await response.json();
            allFetchedCards = allFetchedCards.concat(data.data);
            console.log(`✅ Fetched ${data.data.length} cards from ${batchSets.join(", ")}`);

        } catch (error) {
            console.error("Failed to fetch batch:", error);
        }
    }

    localStorage.setItem("cachedCards", JSON.stringify(allFetchedCards));
    console.log("✅ All cards cached for faster loads.");
    return true; // ✅ ADD THIS LINE
};

console.log("🔎 Sample card:", allFetchedCards.find(c => c.tcgplayer?.productId));

async function fetchAllSetsAndCache() {
    try {
        const cached = localStorage.getItem("cachedCards");
        if (cached) return true;

        const response = await fetch("https://api.pokemontcg.io/v2/cards?q=legalities.standard:legal");
        const data = await response.json();

        if (Array.isArray(data.data)) {
            localStorage.setItem("cachedCards", JSON.stringify(data.data));
            return true;
        }
    } catch (err) {
        console.error("❌ Failed to fetch cards:", err);
    }

    return false;
}
