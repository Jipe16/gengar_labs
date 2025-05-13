import { displayCards, showLoading, hideLoading } from "./ui.js";
import { loadDeck } from "./deckManager.js";

const init = async () => {
    console.log("Initializing...");

    // ✅ Show loading animation
    showLoading();

    // ✅ Load cards from cache
    const cachedCards = localStorage.getItem("cachedCards");

    if (cachedCards) {
        console.log("✅ Using cached cards.");
        const parsedCards = JSON.parse(cachedCards);
        displayCards(parsedCards);
        hideLoading();
    } else {
        console.warn("⚠️ No cached cards found. Ensure login fetches them first.");
    }

    // ✅ Load deck after cards are available
    loadDeck();
};

document.addEventListener("DOMContentLoaded", init);
