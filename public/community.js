const token = localStorage.getItem("token");
if (!token) {
  alert("Você precisa estar logado para ver os decks da comunidade.");
  window.location.href = "login.html";
}

let allDecks = [];
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

const container = document.getElementById("community-container");
const searchInput = document.getElementById("search-decks");
const dropdown = document.getElementById("sort-dropdown");

// 🔃 Formatar a lista de cartas para exibição
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

// 🔃 Formatar para copiar para clipboard
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

// 🔃 Renderizar os decks (sem paginação local agora)
const renderDecks = (decks) => {
  container.innerHTML = "";

  if (!decks.length) {
    container.innerHTML = "<p>Nenhum deck corresponde ao filtro.</p>";
    return;
  }

  decks.forEach(deck => {
    const {
      id, deck_name, cards, main_card, key_cards, description, video_links,
      username, upvotes, downvotes, published_at, cards_price
    } = deck;

    const videoLinksArray = Array.isArray(video_links)
      ? video_links
      : typeof video_links === "string"
        ? video_links.split(",").map(link => link.trim())
        : [];

    const publishedDate = published_at
      ? new Date(published_at).toLocaleDateString("pt-BR")
      : "Data desconhecida";

    const div = document.createElement("div");
    div.classList.add("deck-card");

    div.innerHTML = `
      <div class="deck-header">
        <h2>${deck_name}</h2>
        <span class="deck-price">👤 ${username} | 💰 $${(cards_price || 0).toFixed(2)}</span>
        <span class="deck-date">📅 Publicado em: ${publishedDate}</span>
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

// 🔃 Carregar decks do servidor (agora passando paginação pro backend)
const loadPublicDecks = async () => {
  try {
    const url = `http://localhost:5000/public-decks?sort=${dropdown.value}&page=${currentPage}&perPage=${pageSize}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    allDecks = data.decks || [];
    totalPages = Math.ceil((data.totalCount || 0) / pageSize);
    renderDecks(allDecks);
    renderPagination();
  } catch (err) {
    console.error("Erro ao carregar decks públicos:", err);
    container.innerHTML = "<p>Erro ao carregar decks públicos.</p>";
  }
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
          loadPublicDecks();
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

const renderPagination = () => {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) {
      btn.classList.add("active-page");
    }
    btn.addEventListener("click", () => {
      currentPage = i;
      loadPublicDecks();
    });
    paginationContainer.appendChild(btn);
  }
};


// 🔃 Eventos
dropdown?.addEventListener("change", () => {
  currentPage = 1;
  loadPublicDecks();
});

document.getElementById("prev-page")?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadPublicDecks();
  }
});

document.getElementById("next-page")?.addEventListener("click", () => {
  currentPage++;
  loadPublicDecks();
});

// ✅ Inicialização
loadPublicDecks();
