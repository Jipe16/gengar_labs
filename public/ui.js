import { applyFilters } from "./filters.js";
import { enableCardClick } from "./deckManager.js";
import { deckCount } from "./deckManager.js"; 

// ✅ Show & Hide Loading Indicator
export const showLoading = () => document.getElementById("loading-indicator").style.display = "block";
export const hideLoading = () => document.getElementById("loading-indicator").style.display = "none";

export const updateDeckCounter = () => {
    document.getElementById("deck-counter").textContent = `${deckCount}/60`;
};

// ✅ Display cards in the card gallery
export const displayCards = (cards) => {
    const cardList = document.querySelector("#all-cards");
    cardList.innerHTML = ""; // ✅ Clear previous cards before displaying new ones

    cards.forEach((card) => {
        const uniqueKey = `${card.name} - ${card.set.name}`;
        
        const cardElement = document.createElement("div");
        cardElement.classList.add("card-placeholder");
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardName = card.name;
        cardElement.dataset.setName = card.set.name.toLowerCase();
        cardElement.dataset.setSymbol = card.set.images?.symbol || "";
        cardElement.dataset.rarity = card.rarity || "";
        cardElement.dataset.type = (card.supertype || "").toLowerCase();
        cardElement.dataset.subtype = card.subtypes ? card.subtypes.map(sub => sub.toLowerCase()).join(",") : "";
        cardElement.dataset.element = (card.types ? card.types[0].toLowerCase() : "");
        cardElement.dataset.productId = card.tcgplayer?.productId || "";
        cardElement.dataset.cardNumber = card.number || "";
        cardElement.dataset.setCode = card.set.ptcgoCode || "";

        cardElement.innerHTML = `
            <img src="${card.images.small}" alt="${card.name}" class="card-image">
            <div class="card-info">
                <p class="card-name">${card.name}</p>
                <div class="set-info">
                    ${card.set.images?.symbol 
                        ? `<img src="${card.set.images.symbol}" class="set-symbol" alt="${card.set.name}">` 
                        : ""}
                    <span class="set-name">${card.set.name}</span>
                </div>
            </div>
        `;

        cardList.appendChild(cardElement);
    });

    applyFilters(); 
    enableCardClick(); 
};

// ✅ Hover Preview Feature (corrigido)
const hoverPreview = document.getElementById("hover-preview");

// ✅ Show preview when hovering over a card
document.querySelector("#all-cards").addEventListener("mouseover", (event) => {
    const card = event.target.closest(".card-placeholder img");
    if (!card) return;

    hoverPreview.innerHTML = `<img src="${card.src}" alt="Card Preview">`;
    hoverPreview.style.display = "block";
});

// ✅ Move preview dentro do container corretamente
document.querySelector("#all-cards").addEventListener("mousemove", (event) => {
    const offsetX = event.pageX;
    const offsetY = event.pageY;

    hoverPreview.style.left = `${offsetX + 20}px`;
    hoverPreview.style.top = `${offsetY + 20}px`;
});


// ✅ Hide preview when mouse leaves
document.querySelector("#all-cards").addEventListener("mouseleave", () => {
    hoverPreview.style.display = "none";
});
