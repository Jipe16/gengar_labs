require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const isStrongPassword = (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&^()\-_=+])[A-Za-z\d@$!%*?#&^()\-_=+]{8,}$/;
    return strongPasswordRegex.test(password);
};


const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const calculateDeckPrice = (cards) => {
    try {
      let total = 0;
      for (const card of cards) {
        const count = card.count || 1;
        const prices = card.tcgplayer?.prices || {};
        const price =
          prices.holofoil?.market ||
          prices.normal?.market ||
          prices.reverseHolofoil?.market ||
          prices.holofoil?.mid ||
          prices.normal?.mid ||
          0;
        total += price * count;
      }
      return parseFloat(total.toFixed(2));
    } catch {
      return 0;
    }
  };

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Middleware to Authenticate Token
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid or expired token." });
    }
};

// ✅ Register with email verification
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        await pool.query(
            "INSERT INTO users (username, email, password, verification_token, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [username, email, hashedPassword, verificationToken]
        );

        const verifyLink = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Verify your email - Pokémon TCG DeckBuilder",
          html: `
            <p>Olá, ${username}!</p>
            <p>Bem-vindo ao Gengar Labs DeckBuilder!</p>
            <p>Por favor, clique no link abaixo para verificar o seu email e ativar sua conta:</p>
            <a href="${verifyLink}">${verifyLink}</a>
            <p>Se você não criou essa conta, pode ignorar este email.</p>
          `
      });


        res.status(201).json({ message: "Registration successful! Check your email to verify." });
    } catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ error: "Failed to register user." });
    }
});


// ✅ Verify Email Route
app.get("/verify-email", async (req, res) => {
    const token = req.query.token;

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);
        if (userResult.rows.length === 0) return res.status(400).send("Invalid or expired token.");

        await pool.query("UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1", [token]);
        res.send("✅ Email verified! You may now log in.");
    } catch (error) {
        console.error("❌ Verification error:", error);
        res.status(500).send("Server error verifying email.");
    }
});

// ✅ Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        const userQuery = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $1", [username]);
        if (userQuery.rows.length === 0) return res.status(401).json({ error: "Invalid username or password." });

        const user = userQuery.rows[0];
        if (!user.is_verified) return res.status(401).json({ error: "Please verify your email before logging in." });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password." });

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, username: user.username, userId: user.id });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// ✅ Get Current User Info
app.get("/user-info", authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT username, email FROM users WHERE id = $1",
            [req.user.userId]
        );

        if (rows.length === 0) return res.status(404).json({ error: "User not found." });

        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Error fetching user info:", error);
        res.status(500).json({ error: "Failed to fetch user info." });
    }
});

// ✅ Update User Info
app.put("/update-user", authenticateToken, async (req, res) => {
    const { field, value } = req.body;

    if (!field || !value) {
        return res.status(400).json({ error: "Missing field or value." });
    }

    const validFields = ["username", "email", "password"];
    if (!validFields.includes(field)) {
        return res.status(400).json({ error: "Invalid field for update." });
    }

    try {
        let updateQuery = "";
        let updateValue = value;

        if (field === "password") {
            updateValue = await bcrypt.hash(value, 10);
        }

        updateQuery = `UPDATE users SET ${field} = $1 WHERE id = $2 RETURNING username, email`;

        const result = await pool.query(updateQuery, [updateValue, req.user.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: `${field} updated successfully!`, user: result.rows[0] });
    } catch (error) {
        console.error("❌ Error updating user info:", error);
        res.status(500).json({ error: "Failed to update user info." });
    }
});



// ✅ Create New Deck (Auto-names duplicates)
app.post("/save-deck", authenticateToken, async (req, res) => {
    const { deckName, cards, isPublic = false } = req.body;
    const userId = req.user.userId;

    if (!deckName || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: "Deck name and valid cards are required." });
    }

    try {
        let finalDeckName = deckName;
        let suffix = 1;

        const { rows: existingDecks } = await pool.query(
            "SELECT deck_name FROM decks WHERE user_id = $1 AND deck_name ILIKE $2 || '%'",
            [userId, deckName]
        );

        const existingNames = existingDecks.map(d => d.deck_name.toLowerCase());
        while (existingNames.includes(finalDeckName.toLowerCase())) {
            finalDeckName = `${deckName} (${suffix++})`;
        }

        const result = await pool.query(
            "INSERT INTO decks (user_id, deck_name, cards, is_public, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
            [userId, finalDeckName, JSON.stringify(cards), isPublic]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("❌ Error saving deck:", error);
        res.status(500).json({ error: "Failed to save deck." });
    }
});


// ✅ Update Existing Deck
app.put("/save-deck/:deckId", authenticateToken, async (req, res) => {
    const { deckId } = req.params;
    const { userId, deckName, cards, isPublic = false, main_card, key_cards, description, video_links } = req.body;
  
    if (!deckId || !userId || !deckName || !Array.isArray(cards)) {
      return res.status(400).json({ error: "Missing required deck information." });
    }
  
    // 🧮 Calcular preço total (simples - apenas quantidade * 0.1 como exemplo)
    let total_price = 0;
        cards.forEach(c => {
        const count = c.count || 1;
        const prices = c.tcgplayer?.prices || {};
        const price =
            prices.holofoil?.market ||
            prices.normal?.market ||
            prices.reverseHolofoil?.market ||
            prices.holofoil?.mid ||
            prices.normal?.mid ||
            0;
        total_price += count * price;
    });

  
    try {
      const result = await pool.query(
        `UPDATE decks 
         SET deck_name = $1, 
             cards = $2, 
             is_public = $3, 
             main_card = $4,
             key_cards = $5,
             description = $6,
             video_links = $7,
             cards_price = $8
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [
          deckName,
          JSON.stringify(cards),
          isPublic,
          main_card ? JSON.stringify(main_card) : null,
          key_cards ? JSON.stringify(key_cards) : null,
          description || null,
          Array.isArray(video_links)
            ? video_links
            : typeof video_links === "string"
              ? [video_links]
              : null,
          total_price,
          deckId,
          userId
        ]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Deck not found or unauthorized." });
      }
  
      res.json({ message: "Deck updated successfully!", deck: result.rows[0] });
    } catch (error) {
      console.error("❌ Error updating deck:", error);
      res.status(500).json({ error: "Failed to update deck." });
    }
  });
  



// ✅ Get All Decks for User
app.get("/load-decks", authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const decks = await pool.query(
            "SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.status(200).json({ decks: decks.rows });
    } catch (error) {
        console.error("❌ Error loading decks:", error);
        res.status(500).json({ error: "Failed to load decks." });
    }
});



// ✅ Get Single Deck by ID
app.get("/load-deck/:deckId", authenticateToken, async (req, res) => {
    const { deckId } = req.params;

    try {
        const deck = await pool.query(
            "SELECT * FROM decks WHERE id = $1",
            [deckId]
        );

        if (deck.rows.length === 0) {
            return res.status(404).json({ error: "Deck not found." });
        }

        const deckData = deck.rows[0];

        // ✅ Verifique se o deck pertence ao usuário autenticado
        if (deckData.user_id !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized access to deck." });
        }

        res.json(deckData);
    } catch (error) {
        console.error("❌ Error loading deck:", error);
        res.status(500).json({ error: "Failed to load deck." });
    }
});


// ✅ Get All Public Decks
app.get("/public-decks", authenticateToken, async (req, res) => {
    const sort = req.query.sort || "recent";
    let orderClause = "ORDER BY d.created_at DESC"; // padrão: mais recentes
  
    if (sort === "votes") {
      orderClause = "ORDER BY (d.upvotes - d.downvotes) DESC";
    } else if (sort === "price") {
      orderClause = "ORDER BY d.cards_price ASC NULLS LAST";
    } else if (sort === "expensive") {
      orderClause = "ORDER BY d.cards_price DESC NULLS LAST";
    } else if (sort === "oldest") {
      orderClause = "ORDER BY d.created_at ASC";
    } else if (sort === "least_votes") {
      orderClause = "ORDER BY (d.upvotes - d.downvotes) ASC";
    }
  
    try {
      const result = await pool.query(`
        SELECT 
          d.id, d.deck_name, d.main_card, d.key_cards,
          d.description, d.video_links, d.upvotes, d.downvotes,
          d.cards, d.cards_price, d.created_at, u.username
        FROM decks d
        JOIN users u ON d.user_id = u.id
        WHERE d.is_public = true
        ${orderClause}
      `);
  
      res.status(200).json({ decks: result.rows });
    } catch (error) {
      console.error("❌ Error loading public decks:", error);
      res.status(500).json({ error: "Failed to load public decks." });
    }
  });
  
  
  
  app.post("/vote-deck/:deckId", authenticateToken, async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.userId;
    const { upvote } = req.body;
    const newVoteType = upvote ? "upvote" : "downvote";
  
    try {
      const existingVote = await pool.query(
        "SELECT vote_type FROM deck_votes WHERE user_id = $1 AND deck_id = $2",
        [userId, deckId]
      );
  
      if (existingVote.rows.length > 0) {
        const oldVoteType = existingVote.rows[0].vote_type;
  
        if (oldVoteType === newVoteType) {
          return res.status(400).json({ error: "Você já votou dessa forma neste deck." });
        }
  
        // 🧽 Reverter voto anterior
        const revertColumn = oldVoteType === "upvote" ? "upvotes" : "downvotes";
        await pool.query(
          `UPDATE decks SET ${revertColumn} = ${revertColumn} - 1 WHERE id = $1`,
          [deckId]
        );
  
        // 🔁 Atualiza o tipo do voto
        await pool.query(
          "UPDATE deck_votes SET vote_type = $1, created_at = NOW() WHERE user_id = $2 AND deck_id = $3",
          [newVoteType, userId, deckId]
        );
      } else {
        // 🆕 Voto novo
        await pool.query(
          "INSERT INTO deck_votes (user_id, deck_id, vote_type) VALUES ($1, $2, $3)",
          [userId, deckId, newVoteType]
        );
      }
  
      // ✅ Incrementa o novo tipo de voto
      const newColumn = newVoteType === "upvote" ? "upvotes" : "downvotes";
      const result = await pool.query(
        `UPDATE decks SET ${newColumn} = ${newColumn} + 1 WHERE id = $1 RETURNING upvotes, downvotes`,
        [deckId]
      );
  
      res.json({ message: "Voto atualizado com sucesso!", votes: result.rows[0] });
    } catch (error) {
      console.error("❌ Erro ao votar:", error);
      res.status(500).json({ error: "Erro interno ao atualizar voto." });
    }
  });
  
  
  

// ✅ Start Server
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));