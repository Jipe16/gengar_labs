const token = localStorage.getItem("token");
if (!token) {
  alert("Você precisa estar logado para ver os decks da comunidade.");
  window.location.href = "login.html";
}

let allDecks = []; // manter todos os decks carregados

const container = document.getElementById("community-container");
const searchInput = document.getElementById("search-decks");
const dropdown = document.getElementById("sort-dropdown");

// 🔃 Função para formatar as cartas no estilo TCG Live
const formatDeckForClipboard = (cards) => {
  const groups = { "Pokémon": [], "Trainer": [], "Energy": [] };
  cards.forEach(card => {
    const line = `${card.count} ${card.name} ${card.setCode || "???"} ${card.cardNumber || "???"}`;
    const type = (card.supertype || "").toLowerCase();
    if (type === "pokémon") groups["Pokémon"].push(line);
    else if (type === "trainer") groups["Trainer"].push(line);
    else if (type === "energy") groups["Energy"].push(line);
  });

  let result = "";
  for (const category of ["Pokémon", "Trainer", "Energy"]) {
    const lines = groups[category];
    if (lines.length > 0) {
      const total = lines.reduce((sum, line) => sum + parseInt(line), 0);
      result += `${category}: ${total}\n` + lines.join("\n") + "\n\n";
    }
  }
  return result.trim();
};

// 🔃 Formatar lista de cartas para exibição na direita
function formatDeckList(cards) {
  const groups = { "Pokémon": [], "Trainer": [], "Energy": [] };
  cards.forEach(card => {
    const line = `${card.count} ${card.name} ${card.setCode || "??"} ${card.cardNumber || "???"}`;
    const type = card.supertype?.toLowerCase() || "trainer";
    if (type === "pokémon") groups["Pokémon"].push(line);
    else if (type === "energy") groups["Energy"].push(line);
    else groups["Trainer"].push(line);
  });

  let result = "";
  for (const category of ["Pokémon", "Trainer", "Energy"]) {
    const lines = groups[category];
    if (lines.length > 0) {
      const total = lines.reduce((sum, line) => sum + parseInt(line), 0);
      result += `${category}: ${total}\n${lines.join("\n")}\n\n`;
    }
  }
  return result.trim();
}

// 🔃 Função para renderizar os decks
const renderDecks = (decks) => {
  container.innerHTML = "";

  if (!decks.length) {
    container.innerHTML = "<p>Nenhum deck corresponde ao filtro.</p>";
    return;
  }

  decks.forEach(deck => {
    const {
      id, deck_name, cards, main_card, key_cards, description, video_links,
      username, upvotes, downvotes
    } = deck;

    const votes = upvotes - downvotes;
    const videoLinksArray = Array.isArray(video_links)
      ? video_links
      : typeof video_links === "string"
        ? video_links.split(",").map(link => link.trim())
        : [];

    const div = document.createElement("div");
    div.classList.add("deck-card");

    div.innerHTML = `
      <div class="deck-header">
        <h2>${deck_name}</h2>
        <span class="deck-price">👤 ${username} | 💰 $${(deck.cards_price || 0).toFixed(2)}</span>
      </div>

      <div class="deck-body">
        <div class="deck-left">
          <img src="${main_card?.image || "assets/placeholder.png"}" alt="Main Card" class="main-card">
          <p class="description">${description || "Sem descrição."}</p>

          <div class="key-cards">
            <strong>Cartas Chave:</strong>
            <ul>
              ${key_cards?.map(card => 
                `<li>${card.name} ${card.setCode || "??"} ${card.cardNumber || "???"}</li>`).join("") || "<li>Nenhuma</li>"}
            </ul>
          </div>

          <div class="deck-links">
            ${videoLinksArray.map(link => `<a href="${link}" target="_blank">📺 Vídeo</a>`).join("")}
          </div>
        </div>

        <div class="deck-right">
          <pre class="card-list">
${formatDeckList(cards)}
          </pre>
          <div class="vote-section">
            <button class="vote upvote" data-id="${id}">⬆️ ${upvotes}</button>
            <button class="vote downvote" data-id="${id}">⬇️ ${downvotes}</button>
          </div>
          <div class="deck-buttons">
            <button class="copy-deck" data-id="${id}">📋 Copiar Deck</button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(div);
  });

  setupVoteHandlers();
  setupCopyHandlers(decks);
};

// 🔃 Função para carregar os decks do servidor
const loadPublicDecks = async (sortBy = "recent") => {
  try {
    const res = await fetch("http://localhost:5000/public-decks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    allDecks = data.decks || [];

    applySortAndFilter(sortBy, searchInput.value);
  } catch (err) {
    console.error("Erro ao carregar decks públicos:", err);
    container.innerHTML = "<p>Erro ao carregar decks públicos.</p>";
  }
};

// 🔃 Aplicar filtro e ordenação combinados
const applySortAndFilter = (sortBy, searchTerm = "") => {
  let decks = [...allDecks];

  // ✅ Filtro por escrita
  if (searchTerm.trim()) {
    const lower = searchTerm.toLowerCase();
    decks = decks.filter(deck =>
      deck.deck_name.toLowerCase().includes(lower) ||
      (deck.description || "").toLowerCase().includes(lower) ||
      deck.username.toLowerCase().includes(lower)
    );
  }

  // ✅ Ordenar
  decks.sort((a, b) => {
    if (sortBy === "votes") return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
    if (sortBy === "price") return (a.cards_price || 0) - (b.cards_price || 0);
    if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "expensive") return (b.cards_price || 0) - (a.cards_price || 0);
    if (sortBy === "least_votes") return (a.upvotes - a.downvotes) - (b.upvotes - a.downvotes);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  renderDecks(decks);
};

// 🔃 Votar
const setupVoteHandlers = () => {
  document.querySelectorAll(".vote").forEach(button => {
    button.addEventListener("click", async () => {
      const deckId = button.dataset.id;
      const isUpvote = button.classList.contains("upvote");

      try {
        const res = await fetch(`http://localhost:5000/vote-deck/${deckId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ upvote: isUpvote })
        });

        const result = await res.json();
        if (res.ok) {
          loadPublicDecks(dropdown.value); // recarrega com ordenação atual
        } else {
          alert("Erro ao votar: " + result.error);
        }
      } catch (err) {
        console.error("Erro ao votar:", err);
      }
    });
  });
};

// 🔃 Copiar Deck
const setupCopyHandlers = (decks) => {
  document.querySelectorAll(".copy-deck").forEach(button => {
    button.addEventListener("click", async () => {
      const deckId = button.dataset.id;
      const deck = decks.find(d => d.id == deckId);
      if (!deck) return;

      const newDeck = {
        deckName: `${deck.deck_name} (Cópia)`,
        userId: localStorage.getItem("userId"),
        cards: deck.cards,
        isPublic: false
      };

      try {
        const res = await fetch("http://localhost:5000/save-deck", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newDeck)
        });

        if (res.ok) {
          const formatted = formatDeckForClipboard(deck.cards);
          await navigator.clipboard.writeText(formatted);
          alert("✅ Deck copiado com sucesso!");
        } else {
          const data = await res.json();
          alert("Erro ao copiar deck: " + data.error);
        }
      } catch (err) {
        console.error("Erro ao copiar:", err);
      }
    });
  });
};

// 🔃 Eventos
dropdown?.addEventListener("change", () => {
  applySortAndFilter(dropdown.value, searchInput.value);
});

searchInput?.addEventListener("input", () => {
  applySortAndFilter(dropdown.value, searchInput.value);
});

// ✅ Inicialização
loadPublicDecks();
