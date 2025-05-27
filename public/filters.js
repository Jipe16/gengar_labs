import { getCardPrice } from "./deckManager.js";

const debounce = (func, delay = 250) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

export const applyFilters = () => {
  const container = document.getElementById("all-cards");
  const allCards = [...container.querySelectorAll(".card-placeholder")];

  const selectedTypes = [...document.querySelectorAll(".filter-type:checked")].map(cb => cb.value.toLowerCase());
  const selectedElements = [...document.querySelectorAll(".filter-element:checked")].map(cb => cb.value.toLowerCase());
  const selectedSubtypes = [...document.querySelectorAll(".filter-subtype:checked")].map(cb => cb.value.toLowerCase());
  const setSearch = document.getElementById("filter-set").value.toLowerCase();
  const pokemonSearch = document.getElementById("all-cards-search-bar").value.toLowerCase();
  const minPrice = parseFloat(document.getElementById("min-price")?.value) || 0;
  const maxPrice = parseFloat(document.getElementById("max-price")?.value) || Infinity;

  // Aplica filtros
  allCards.forEach(card => {
    const cardType = (card.dataset.type || "").toLowerCase();
    const cardSubtypes = (card.dataset.subtype || "").toLowerCase().split(",");
    const cardElement = (card.dataset.element || "").toLowerCase();
    const cardSet = (card.dataset.setName || "").toLowerCase();
    const cardName = (card.dataset.cardName || "").toLowerCase();
    const price = getCardPrice(card.dataset.cardId);

    const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(cardType);
    const elementMatch = selectedElements.length === 0 || selectedElements.includes(cardElement);
    const setMatch = setSearch === "" || cardSet.includes(setSearch);
    const nameMatch = pokemonSearch === "" || cardName.includes(pokemonSearch);
    const priceMatch = price >= minPrice && price <= maxPrice;

    let subtypeMatch = selectedSubtypes.length === 0;
    if (selectedSubtypes.length > 0) {
      if (selectedSubtypes.includes("item")) {
        subtypeMatch = cardSubtypes.includes("item") && !cardSubtypes.includes("pokémon tool");
      } else {
        subtypeMatch = selectedSubtypes.some(sub => cardSubtypes.includes(sub));
      }
    }

    const match = typeMatch && elementMatch && subtypeMatch && setMatch && nameMatch && priceMatch;
    card.style.display = match ? "flex" : "none";
  });

  // Ordenação
  const sortBy = document.getElementById("sort-by")?.value;
  const visibleCards = allCards.filter(c => c.style.display !== "none");

  if (sortBy && sortBy !== "") {
    visibleCards.sort((a, b) => {
      const aName = (a.dataset.cardName || "").toLowerCase();
      const bName = (b.dataset.cardName || "").toLowerCase();
      const aSet = (a.dataset.setName || "").toLowerCase();
      const bSet = (b.dataset.setName || "").toLowerCase();
      const aType = (a.dataset.element || "").toLowerCase();
      const bType = (b.dataset.element || "").toLowerCase();
      const priceA = getCardPrice(a.dataset.cardId);
      const priceB = getCardPrice(b.dataset.cardId);

      switch (sortBy) {
        case "price-asc": return priceA - priceB;
        case "price-desc": return priceB - priceA;
        case "name": return aName.localeCompare(bName);
        case "set": return aSet.localeCompare(bSet);
        case "type": return aType.localeCompare(bType);
        default: return 0;
      }
    });

    // Reanexa apenas os visíveis na ordem correta
    visibleCards.forEach(card => container.appendChild(card));
  } else {
    // Ordem original baseada no localStorage
    const originalCards = JSON.parse(localStorage.getItem("cachedCards") || "[]");
    const map = new Map(allCards.map(card => [card.dataset.cardId, card]));

    originalCards.forEach(c => {
      const el = map.get(c.id);
      if (el) container.appendChild(el); // Reanexa na ordem original
    });
  }
};

// Event Listeners com debounce
document.querySelectorAll(".filter-type, .filter-element, .filter-subtype")
  .forEach(f => f.addEventListener("change", debounce(applyFilters)));

document.getElementById("filter-set")?.addEventListener("input", debounce(applyFilters));
document.getElementById("all-cards-search-bar")?.addEventListener("input", debounce(applyFilters));
document.getElementById("min-price")?.addEventListener("input", debounce(applyFilters));
document.getElementById("max-price")?.addEventListener("input", debounce(applyFilters));
document.getElementById("sort-by")?.addEventListener("change", applyFilters);
