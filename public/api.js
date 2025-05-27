import { displayCards, showLoading, hideLoading } from "./ui.js";

const API_KEY = '905ecd24-0044-48cf-a8a8-8c709f550065';

const standardSets = [
    "Scarlet & Violet",
    "Brilliant Stars",
    "Astral Radiance",
    "Pokemon Go",
    "Lost Origin",
    "Silver Tempest",
    "Crown Zenith",
    "Paldea Evolved",
    "Obsidian Flames",
    "151",
    "Paradox Rift",
    "Paldean Fates",
    "Temporal Forces"
];

// ✅ Fetch a batch of sets
const fetchSetBatch = async (batchSets) => {
    let allFetchedCards = [];
    let currentPage = 1;
    let totalPages = 1;

    const batchQuery = batchSets.map(set => `set.name:"${set.replace(/&/g, 'and').replace(/"/g, '\\"')}"`).join(" OR ");
    const batchURL = `https://api.pokemontcg.io/v2/cards?q=(${encodeURIComponent(batchQuery)})`;

    try {
        while (currentPage <= totalPages) {
            console.log(`Fetching batch: ${batchSets.join(", ")} (Page ${currentPage})`);
            const response = await fetch(`${batchURL}&page=${currentPage}&pageSize=250`, {
                headers: { "X-Api-Key": API_KEY }
            });

            if (!response.ok) throw new Error(`Error fetching batch: ${response.statusText}`);

            const data = await response.json();
            if (currentPage === 1) totalPages = Math.ceil(data.totalCount / 250);

            allFetchedCards = allFetchedCards.concat(data.data);
            currentPage++;

            console.log(`✅ Fetched ${data.data.length} cards from ${batchSets.join(", ")}`);
            console.log(data.data.slice(0, 5)); // ✅ Debug first 5 cards

            displayCards(data.data); // ✅ Display the batch immediately
        }

        return allFetchedCards;
    } catch (error) {
        console.error("Failed to fetch batch:", error);
        return [];
    }
};

// ✅ Fetch all sets in batches & display
export const fetchAllSetsInBatches = async () => {
    showLoading();
    const batchSize = 3;
    let allFetchedCards = [];

    for (let i = 0; i < standardSets.length; i += batchSize) {
        const batchSets = standardSets.slice(i, i + batchSize);
        const batchCards = await fetchSetBatch(batchSets);
        allFetchedCards = allFetchedCards.concat(batchCards);
    }

    localStorage.setItem("cachedCards", JSON.stringify(allFetchedCards));
    console.log("✅ All cards cached for faster future loads.");

    displayCards(allFetchedCards); // ✅ Show all cards after fetching
    hideLoading();
};
