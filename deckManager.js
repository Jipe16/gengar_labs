import { updateDeckCounter } from "./ui.js";

// ✅ Deck Rules
const MAX_DECK_SIZE = 60;
const MAX_COPIES_PER_CARD = 4;

// ✅ Track deck constraints
let cachedCardMap = null;
const preloadCachedCards = () => {
    const cached = JSON.parse(localStorage.getItem("cachedCards") || "[]");
    cachedCardMap = Object.fromEntries(cached.map(card => [card.id, card]));
};
preloadCachedCards();

let currentDeckId = localStorage.getItem("selectedDeck") || null;
let deckCount = 0;
let hasAceSpec = false;
let hasRadiantPokemon = false;

// ✅ Get Card Price from Cached Cards
const getCardPrice = (cardId, isBasicEnergy = false) => {
    if (isBasicEnergy) return 0;
    const card = cachedCardMap?.[cardId];
    if (!card || !card.tcgplayer || !card.tcgplayer.prices) return 0;
    
    const prices = card.tcgplayer.prices;
    return prices.holofoil?.market ?? prices.normal?.market ?? prices.reverseHolofoil?.market ?? 
           prices.holofoil?.mid ?? prices.normal?.mid ?? 0;
};



// ✅ Update Deck Price Display
const updateDeckPrice = () => {
    const deckCards = document.querySelectorAll("#your-deck .card-placeholder");
    let total = 0;

    deckCards.forEach(card => {
        const count = parseInt(card.querySelector(".card-counter").textContent) || 1;
        const subtypes = (card.dataset.subtype || "").toLowerCase().split(",");
        const isBasicEnergy = card.dataset.type === "energy" && subtypes.includes("basic");
        const price = getCardPrice(card.dataset.cardId, isBasicEnergy);
        total += count * price;
    });

    const deckPriceDisplay = document.querySelector("#deck-price");
    if (deckPriceDisplay) {
        deckPriceDisplay.textContent = `💰 Total Price: $${total.toFixed(2)}`;
    }
};


// ✅ Handle Clicking on a Card to Add
const handleCardClick = (event) => {
    const card = event.currentTarget;
    addToDeck(card);
};

// ✅ Handle Clicking on a Card to Remove
const handleDeckCardClick = (event) => {
    const card = event.currentTarget;
    removeFromDeck(card);
};

// ✅ Enable Clicking to Add or Remove Cards
export const enableCardClick = () => {
    document.querySelectorAll('#all-cards .card-placeholder').forEach(card => {
        card.removeEventListener('click', handleCardClick);
        card.addEventListener('click', handleCardClick);
    });

    document.querySelectorAll('#your-deck .card-placeholder').forEach(card => {
        card.removeEventListener('click', handleDeckCardClick);
        card.addEventListener('click', handleDeckCardClick);
    });
};

// ✅ Add Card to Deck
const addToDeck = (card) => {
    const yourDeck = document.querySelector("#your-deck");
    const cardName = card.dataset.cardName;
    const cardSet = card.dataset.setName;
    const uniqueKey = `${cardName} - ${cardSet}`;
    const cardRarity = card.dataset.rarity || "";

    const existingCard = yourDeck.querySelector(`[data-card-key="${uniqueKey}"]`);

    if (deckCount >= MAX_DECK_SIZE) {
        alert("Your deck must have exactly 60 cards!");
        return;
    }

    if (cardRarity.includes("ACE SPEC") && hasAceSpec) {
        alert("You can only have 1 Ace Spec card in your deck!");
        return;
    }

    if (cardRarity.includes("Radiant") && hasRadiantPokemon) {
        alert("You can only have 1 Radiant Pokémon in your deck!");
        return;
    }

    const subtypes = (card.dataset.subtype || "").toLowerCase().split(",");
    const isBasicEnergy = card.dataset.type === "energy" && subtypes.includes("basic");

    let totalCopies = [...yourDeck.querySelectorAll(`[data-card-name="${cardName}"]`)]
        .reduce((sum, c) => sum + parseInt(c.querySelector(".card-counter").textContent), 0);

    if (!isBasicEnergy && totalCopies >= MAX_COPIES_PER_CARD) {
        alert(`You cannot have more than ${MAX_COPIES_PER_CARD} copies of ${cardName} across all sets!`);
        return;
    }

    if (existingCard) {
        const counter = existingCard.querySelector(".card-counter");
        counter.textContent = parseInt(counter.textContent) + 1;
    } else {
        const clonedCard = document.createElement("div");
        clonedCard.classList.add("card-placeholder");
        clonedCard.dataset.cardId = card.dataset.cardId;
        clonedCard.dataset.cardName = cardName;
        clonedCard.dataset.setName = cardSet;
        clonedCard.dataset.cardKey = uniqueKey;
        clonedCard.dataset.rarity = cardRarity;
        clonedCard.dataset.setSymbol = card.dataset.setSymbol || "";
        clonedCard.dataset.type = card.dataset.type || "";
        clonedCard.dataset.subtype = card.dataset.subtype || "";
        clonedCard.dataset.productId = card.dataset.productId || "";
        clonedCard.dataset.tcgUrl = card.dataset.tcgUrl || "";
        clonedCard.dataset.setCode = card.dataset.setCode || "";
        clonedCard.dataset.cardNumber = card.dataset.cardNumber || "";


        clonedCard.innerHTML = `
            <img src="${card.querySelector("img").src}" alt="${cardName}" class="card-image">
            <div class="card-info">
                <p class="card-name">${cardName}</p>
                <div class="set-info">
                    ${card.dataset.setSymbol 
                        ? `<img src="${card.dataset.setSymbol}" class="set-symbol" alt="${cardSet}">` 
                        : ""}
                    <span class="set-name">${cardSet}</span>
                </div>
            </div>
            <span class="card-counter">1</span>
        `;

        clonedCard.addEventListener("click", () => removeFromDeck(clonedCard));
        yourDeck.appendChild(clonedCard);
    }

    if (cardRarity.includes("ACE SPEC")) hasAceSpec = true;
    if (cardRarity.includes("Radiant")) hasRadiantPokemon = true;

    deckCount++;
    updateDeckCounter();
    updateDeckPrice();
};

// ✅ Remove Card from Deck
const removeFromDeck = (card) => {
    const counter = card.querySelector(".card-counter");
    let count = parseInt(counter?.textContent || 1);

    if (count > 1) {
        counter.textContent = count - 1;
    } else {
        const rarity = card.dataset.rarity || "";
        if (rarity.includes("ACE SPEC")) hasAceSpec = false;
        if (rarity.includes("Radiant")) hasRadiantPokemon = false;
        card.remove();
    }

    deckCount--;
    updateDeckCounter();
    updateDeckPrice();
};

const saveDeckToDB = async () => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
        alert("You must be logged in to save a deck!");
        window.location.href = "login.html";
        return;
    }

    const deckName = document.querySelector("#deck-name").value.trim() || "Unnamed Deck";
    const isPublic = document.getElementById("public-deck")?.checked || false;

    if (deckCount < MAX_DECK_SIZE) {
        const confirmSave = confirm("⚠ Your deck has less than 60 cards. Are you sure you want to save it?");
        if (!confirmSave) return;
    }

    const cards = [...document.querySelectorAll("#your-deck .card-placeholder")].map(card => ({
        id: card.dataset.cardId,
        name: card.dataset.cardName,
        set: card.dataset.setName,
        count: parseInt(card.querySelector(".card-counter").textContent) || 1
    }));

    try {
        const endpoint = currentDeckId
            ? `http://localhost:5000/save-deck/${currentDeckId}`
            : "http://localhost:5000/save-deck";

        const method = currentDeckId ? "PUT" : "POST";

        const response = await fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ userId, deckName, cards, isPublic })
        });

        const data = await response.json();
        if (response.ok) {
            alert("✅ Deck saved successfully!");
            window.location.href = "decklists.html";
        } else {
            console.error("❌ Error saving deck:", data.error);
        }
    } catch (error) {
        console.error("❌ Failed to save deck:", error);
    }
};


// ✅ Load Deck from Database and Display
const loadDeck = async () => {
    const deckId = localStorage.getItem("selectedDeck");
    if (!deckId) {
        console.warn("⚠️ No deck selected.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/load-deck/${deckId}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (!response.ok) throw new Error("Failed to load deck.");

        const deckData = await response.json();
        document.getElementById("deck-name").value = deckData.deck_name;
        const yourDeck = document.getElementById("your-deck");
        yourDeck.innerHTML = "";

        const waitForCards = async () => {
            return new Promise((resolve) => {
                const checkCards = () => {
                    if (localStorage.getItem("cachedCards")) resolve();
                    else setTimeout(checkCards, 300);
                };
                checkCards();
            });
        };

        await waitForCards();
        const cachedCards = JSON.parse(localStorage.getItem("cachedCards"));

        deckCount = 0;
        hasAceSpec = false;
        hasRadiantPokemon = false;

        deckData.cards.forEach(savedCard => {
            const fullCard = cachedCards.find(c => c.id === savedCard.id);
            if (!fullCard) return;

            for (let i = 0; i < savedCard.count; i++) {
                const mockCardElement = document.createElement("div");
                mockCardElement.dataset.cardId = fullCard.id;
                mockCardElement.dataset.cardName = fullCard.name;
                mockCardElement.dataset.setName = fullCard.set.name.toLowerCase();
                mockCardElement.dataset.cardKey = `${fullCard.name} - ${fullCard.set.name}`;
                mockCardElement.dataset.rarity = fullCard.rarity || "";
                mockCardElement.dataset.setSymbol = fullCard.set.images?.symbol || "";
                mockCardElement.dataset.type = (fullCard.supertype || "").toLowerCase();
                mockCardElement.dataset.subtype = fullCard.subtypes ? fullCard.subtypes.map(s => s.toLowerCase()).join(",") : "";
                mockCardElement.dataset.productId = fullCard?.tcgplayer?.productId || "";
                mockCardElement.dataset.tcgUrl = fullCard?.tcgplayer?.url || "";
                mockCardElement.dataset.setCode = fullCard.set.ptcgoCode || fullCard.set.id || "";
                mockCardElement.dataset.cardNumber = fullCard.number || "";
                



                const img = document.createElement("img");
                img.src = fullCard.images.small;
                mockCardElement.appendChild(img);

                addToDeck(mockCardElement);
            }
        });

        updateDeckPrice();
        console.log("✅ Deck loaded successfully:", deckData);

    } catch (error) {
        console.error("❌ Error loading deck:", error);
    }
};

// 🔍 Show Price Breakdown Modal
// 🔍 Show Price Breakdown Modal (CORRIGIDO)
const setupPriceModal = () => {
    const priceElement = document.getElementById("deck-price");
    const modal = document.getElementById("deck-price-modal");
    const closeModal = modal.querySelector(".close-modal");
    const detailsList = document.getElementById("deck-price-details");

    if (!priceElement || !modal || !detailsList) return;

    priceElement.style.cursor = "pointer";

    priceElement.addEventListener("click", () => {
        detailsList.innerHTML = ""; // limpa o modal

        const cards = [...document.querySelectorAll("#your-deck .card-placeholder")];

        cards.forEach(card => {
            const name = card.dataset.cardName;
            const tcgUrl = card.dataset.tcgUrl;
            const count = parseInt(card.querySelector(".card-counter")?.textContent || "1", 10);
            const subtypes = (card.dataset.subtype || "").toLowerCase().split(",");
            const isBasicEnergy = card.dataset.type === "energy" && subtypes.includes("basic");
            const price = getCardPrice(card.dataset.cardId, isBasicEnergy);

            console.log({
                name,
                tcgUrl,
                count,
                isBasicEnergy,
                price
              });

            const li = document.createElement("li");

            // Nome clicável se houver URL e preço
            const nameSpan = document.createElement("span");
            if (tcgUrl && price > 0) {
                const nameLink = document.createElement("a");
                nameLink.href = tcgUrl;
                nameLink.target = "_blank";
                nameLink.textContent = `${count}x ${name}`;
                nameLink.style.color = "#4ea4ff";
                nameLink.style.textDecoration = "underline";
                nameSpan.appendChild(nameLink);
            } else {
                nameSpan.textContent = `${count}x ${name}`;
            }

            // Preço
            const priceSpan = document.createElement("span");
            priceSpan.textContent = ` $${(price * count).toFixed(2)}`;

            li.appendChild(nameSpan);
            li.appendChild(priceSpan);
            detailsList.appendChild(li);
        });

        modal.style.display = "flex";
    });

    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
};

setupPriceModal();

const formatDeckForClipboard = () => {
    const cards = [...document.querySelectorAll("#your-deck .card-placeholder")];

    const groups = {
        "Pokémon": [],
        "Trainer": [],
        "Energy": []
    };

    cards.forEach(card => {
        const count = parseInt(card.querySelector(".card-counter")?.textContent || "1", 10);
        const name = card.dataset.cardName;
        const setCode = card.dataset.setCode || "???";
        const cardNumber = card.dataset.cardNumber || "???";
        const type = (card.dataset.type || "").toLowerCase();

        const line = `${count} ${name} ${setCode} ${cardNumber}`;

        if (type === "pokémon") groups["Pokémon"].push(line);
        else if (type === "trainer") groups["Trainer"].push(line);
        else if (type === "energy") groups["Energy"].push(line);
    });

    let result = "";
    for (const category of ["Pokémon", "Trainer", "Energy"]) {
        const lines = groups[category];
        if (lines.length > 0) {
            const total = lines.reduce((sum, line) => sum + parseInt(line), 0);
            result += `${category}: ${total}\n`;
            result += lines.join("\n") + "\n\n";
        }
    }

    return result.trim();
};

const copyDeckToClipboard = () => {
    const formatted = formatDeckForClipboard();
    navigator.clipboard.writeText(formatted).then(() => {
        alert("✅ Deck copied to clipboard!");
    }).catch(err => {
        console.error("❌ Copy failed:", err);
        alert("⚠ Failed to copy deck.");
    });
};

document.getElementById("copy-deck")?.addEventListener("click", copyDeckToClipboard);
document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("save-deck");
    if (saveButton) {
        saveButton.addEventListener("click", saveDeckToDB);
    }
});

// ✅ Export functions
export { addToDeck, removeFromDeck, updateDeckCounter, deckCount, saveDeckToDB, loadDeck, getCardPrice };
