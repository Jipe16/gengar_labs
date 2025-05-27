document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const cachedCardMap = Object.fromEntries(
    (JSON.parse(localStorage.getItem("cachedCards") || "[]")).map(card => [card.id, card])
  );
  const selectedDeckId = localStorage.getItem("selectedDeck");

  if (!token || !selectedDeckId) {
    alert("Você precisa estar logado e com um deck selecionado.");
    window.location.href = "decklists.html";
    return;
  }

  const mainCardSelect = document.getElementById("main-card");
  const keyCardsContainer = document.getElementById("key-cards");
  const form = document.getElementById("submit-community-form");

  try {
    const res = await fetch(`http://localhost:5000/load-deck/${selectedDeckId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const deck = await res.json();
    const cards = deck.cards;

    // Popular select da carta principal
    cards.forEach(card => {
      const option = document.createElement("option");
      option.value = card.id;
      option.textContent = `${card.name} (${card.setCode || card.set})`;
      mainCardSelect.appendChild(option);
    });

    // Popular checkboxes das cartas chave
    cards.forEach(card => {
      const label = document.createElement("label");
      label.style.display = "block";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "key-cards";
      checkbox.value = card.id;
      label.appendChild(checkbox);
      label.append(` ${card.name} (${card.set})`);
      keyCardsContainer.appendChild(label);
    });

    // Envio do formulário
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const mainCardId = mainCardSelect.value;
      const keyCardIds = [...document.querySelectorAll("input[name='key-cards']:checked")].map(cb => cb.value);
      const description = document.getElementById("description").value.trim();
      const videoLinksRaw = document.getElementById("video-links").value.trim();

      let videoLinks = [];
      if (videoLinksRaw) {
        videoLinks = videoLinksRaw
          .split(/[\n,]/)
          .map(link => link.trim())
          .filter(link => link !== "");
      }

      if (!mainCardId) {
        alert("Selecione uma carta principal.");
        return;
      }

      if (keyCardIds.length > 5) {
        alert("Você só pode selecionar até 5 cartas chave.");
        return;
      }

      const fullMainCard = cachedCardMap[mainCardId];


      console.log(fullMainCard)


      const main_card = {
        id: fullMainCard.id,
        name: fullMainCard.name,
        image: fullMainCard.images?.small || fullMainCard.image || "",
        setCode: fullMainCard.setCode || fullMainCard.set || "",
        cardNumber: fullMainCard.cardNumber || fullMainCard.number || "???"
      };

      const key_cards = keyCardIds.map(id => {
        const card = cachedCardMap[id];
        return {
          id: card.id,
          name: card.name,
          setCode: card.set.ptcgoCode || card.set.id || "",
          cardNumber: card.number || "???"
        };
      });
      

      const cardsWithDetails = cards.map(c => {
        const full = cachedCardMap[c.id];
        return {
          id: full.id,
          name: full.name,
          setCode: full.set?.ptcgoCode || full.set?.id || "",
          cardNumber: full.number || "???",
          count: c.count,
          tcgplayer: full.tcgplayer || null,
          supertype: full.supertype || ""
        };
      });
      

      const payload = {
        userId: parseInt(localStorage.getItem("userId")),
        deckName: deck.deck_name,
        cards: cardsWithDetails,
        isPublic: true,
        main_card,
        key_cards,
        description,
        video_links: videoLinks
      };

      try {
        const response = await fetch(`http://localhost:5000/save-deck/${selectedDeckId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          alert("✅ Deck publicado com sucesso!");
          window.location.href = "community.html";
        } else {
          const err = await response.json();
          console.error("Erro ao publicar:", err);
          alert("❌ Falha ao publicar o deck.");
        }
      } catch (err) {
        console.error("Erro:", err);
        alert("❌ Erro na comunicação com o servidor.");
      }
    });
  } catch (err) {
    console.error("Erro ao carregar o deck:", err);
    alert("❌ Não foi possível carregar o deck.");
    window.location.href = "decklists.html";
  }
});
