import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

const EVENTS_FILE = path.join(__dirname, "data", "events.json");
const USERS_FILE = path.join(__dirname, "data", "users.json");
const USERS_JS_FILE = path.join(__dirname, "users-data.js");
const EVENTS_JS_FILE = path.join(__dirname, "events-data.js");
const PROFESSIONALS_FILE = path.join(__dirname, "data", "professionals.json");
const PURCHASES_FILE = path.join(__dirname, "data", "purchases.json");
const PURCHASES_JS_FILE = path.join(__dirname, "purchases-data.js");
const ADMIN_USER = {
  id: "admin-1",
  email: "admin@beloeventos.com",
  password: "admin",
  name: "Admin Belo",
  role: "admin",
};

// Helper to read/write JSON files
const readData = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    const content = fs.readFileSync(file, "utf8");
    const data = JSON.parse(content);
    if (!Array.isArray(data) && typeof data === "object") {
      return Object.values(data);
    }
    return data;
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
};

const writeData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
};

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const ensureAdminUser = (users) => {
  const list = Array.isArray(users) ? users : [];
  const hasAdmin = list.some(
    (u) => normalizeEmail(u?.email) === normalizeEmail(ADMIN_USER.email),
  );
  if (hasAdmin) return list;
  return [ADMIN_USER, ...list];
};

const writeUsersData = (users) => {
  const list = ensureAdminUser(users);
  writeData(USERS_FILE, list);
  const usersJsContent = `window.usersData = ${JSON.stringify(list, null, 2)};\n`;
  fs.writeFileSync(USERS_JS_FILE, usersJsContent, "utf8");
};

const writeEventsData = (events) => {
  writeData(EVENTS_FILE, events);
  const eventsJsContent = `window.eventsData = ${JSON.stringify(events, null, 2)};\n`;
  fs.writeFileSync(EVENTS_JS_FILE, eventsJsContent, "utf8");
};

const writePurchasesData = (purchases) => {
  writeData(PURCHASES_FILE, purchases);
  const purchasesJsContent = `window.purchasesData = ${JSON.stringify(purchases, null, 2)};\n`;
  fs.writeFileSync(PURCHASES_JS_FILE, purchasesJsContent, "utf8");
};

const toMoney = (value) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
};

const toQuantity = (value) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 1) return 1;
  return numeric;
};

const normalizePurchasePayload = (payload, events) => {
  const purchase = payload && typeof payload === "object" ? payload : {};
  const event = (Array.isArray(events) ? events : []).find(
    (ev) => ev.id === purchase.eventId,
  );

  const quantity = toQuantity(purchase.quantity);
  const eventUnitPrice = toMoney(event?.price);
  const informedUnitPrice = toMoney(purchase.unitPrice);
  const serviceFee = toMoney(purchase.serviceFee);
  const interestAmount = toMoney(purchase.interestAmount ?? purchase.interest);
  const informedAmount = toMoney(purchase.amount);

  const unitPrice =
    eventUnitPrice || informedUnitPrice || informedAmount / quantity;
  const calculatedAmount = unitPrice * quantity + serviceFee + interestAmount;
  const amount = calculatedAmount > 0 ? calculatedAmount : informedAmount;

  return {
    ...purchase,
    quantity,
    unitPrice,
    serviceFee,
    interestAmount,
    amount: Number(amount.toFixed(2)),
  };
};

const getRevenueStats = (purchases) => {
  const list = Array.isArray(purchases) ? purchases : [];
  let totalRevenue = 0;
  let soldTickets = 0;
  let latestPurchaseAt = null;

  list.forEach((purchase) => {
    const quantity = toQuantity(purchase?.quantity);
    const unitPrice = toMoney(purchase?.unitPrice);
    const serviceFee = toMoney(purchase?.serviceFee);
    const interestAmount = toMoney(
      purchase?.interestAmount ?? purchase?.interest,
    );
    const informedAmount = toMoney(purchase?.amount);

    const calculated =
      unitPrice > 0
        ? unitPrice * quantity + serviceFee + interestAmount
        : informedAmount;

    totalRevenue += calculated;
    soldTickets += quantity;

    const purchaseDate = purchase?.date ? new Date(purchase.date) : null;
    if (purchaseDate && !Number.isNaN(purchaseDate.getTime())) {
      if (!latestPurchaseAt || purchaseDate > latestPurchaseAt) {
        latestPurchaseAt = purchaseDate;
      }
    }
  });

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    purchasesCount: list.length,
    soldTickets,
    latestPurchaseAt: latestPurchaseAt ? latestPurchaseAt.toISOString() : null,
  };
};

// Keep JSON and JS sources synced when server boots.
writeUsersData(readData(USERS_FILE));
writeEventsData(readData(EVENTS_FILE));
writePurchasesData(readData(PURCHASES_FILE));

// --- EVENTS ENDPOINTS ---
app.get("/api/events", (req, res) => {
  const events = readData(EVENTS_FILE);
  res.json(events);
});

app.get("/api/events/search", (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : "";
  const events = readData(EVENTS_FILE);
  const filtered = events.filter(
    (ev) => ev.title && ev.title.toLowerCase().includes(query),
  );
  res.json(filtered);
});

app.post("/api/events", (req, res) => {
  const newEvent = req.body;
  let events = readData(EVENTS_FILE);
  if (!newEvent.id) {
    newEvent.id =
      newEvent.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "") +
      "-" +
      Date.now();
  }
  events.push(newEvent);
  writeEventsData(events);
  res.status(201).json({ success: true, event: newEvent });
});

app.put("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const updatedEvent = req.body;
  let events = readData(EVENTS_FILE);
  const index = events.findIndex((ev) => ev.id === id);
  if (index === -1)
    return res
      .status(404)
      .json({ success: false, message: "Evento não encontrado" });
  events[index] = { ...events[index], ...updatedEvent };
  writeEventsData(events);
  res.json({ success: true, event: events[index] });
});

app.delete("/api/events/:id", (req, res) => {
  const { id } = req.params;
  let events = readData(EVENTS_FILE);
  const initialLength = events.length;
  events = events.filter((ev) => ev.id !== id);
  if (events.length === initialLength)
    return res
      .status(404)
      .json({ success: false, message: "Evento não encontrado" });
  writeEventsData(events);
  res.json({ success: true });
});

// --- PURCHASES ENDPOINTS ---
app.get("/api/purchases", (req, res) => {
  const purchases = readData(PURCHASES_FILE);
  res.json(purchases);
});

app.get("/api/purchases/user/:userId", (req, res) => {
  const { userId } = req.params;
  const purchases = readData(PURCHASES_FILE);
  const events = readData(EVENTS_FILE);

  const userPurchases = purchases
    .filter((p) => p.userId === userId)
    .map((p) => {
      const event = events.find((e) => e.id === p.eventId);
      return { ...p, event };
    });

  res.json(userPurchases);
});

app.post("/api/purchases", (req, res) => {
  const incomingPurchase = req.body;
  console.log("Nova compra recebida:", incomingPurchase);
  const events = readData(EVENTS_FILE);
  const purchase = normalizePurchasePayload(incomingPurchase, events);

  if (!purchase.userId || !purchase.eventId) {
    return res
      .status(400)
      .json({ success: false, message: "Dados da compra incompletos." });
  }

  let purchases = readData(PURCHASES_FILE);
  purchase.id = `buy-${Date.now()}`;
  purchase.date = new Date().toISOString();
  purchases.push(purchase);
  writePurchasesData(purchases);
  console.log("Compra salva com sucesso. Total de compras:", purchases.length);
  res.status(201).json({ success: true, purchase });
});

app.get("/api/stats/revenue", (req, res) => {
  const purchases = readData(PURCHASES_FILE);
  res.json(getRevenueStats(purchases));
});

// --- PROFESSIONALS ENDPOINTS ---
app.get("/api/professionals", (req, res) => {
  const professionals = readData(PROFESSIONALS_FILE);
  res.json(professionals);
});

app.post("/api/professionals", (req, res) => {
  const newProf = req.body;
  let professionals = readData(PROFESSIONALS_FILE);

  if (!newProf.id) {
    newProf.id = `prof-${Date.now()}`;
  }

  // Set some defaults if not provided
  newProf.avaliacao = newProf.avaliacao || 5.0;
  newProf.totalAvaliacoes = newProf.totalAvaliacoes || 0;
  newProf.badge = newProf.badge || "VERIFICADO";

  professionals.push(newProf);
  writeData(PROFESSIONALS_FILE, professionals);
  res.status(201).json({ success: true, professional: newProf });
});

// --- AUTH ENDPOINTS ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const loginAliases = [normalizedEmail];
  if (normalizedEmail === "admin@beloeventos") {
    loginAliases.push("admin@beloeventos.com");
  }

  const users = ensureAdminUser(readData(USERS_FILE));
  const user = users.find(
    (u) =>
      loginAliases.includes(normalizeEmail(u.email)) && u.password === password,
  );
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(401).json({ success: false, message: "Credenciais inválidas" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, birthDate } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const users = ensureAdminUser(readData(USERS_FILE));
  if (users.find((u) => normalizeEmail(u.email) === normalizedEmail)) {
    return res
      .status(400)
      .json({ success: false, message: "Email já cadastrado" });
  }
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    password,
    birthDate,
    role: "user",
    profileImage: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}`,
  };
  users.push(newUser);
  writeUsersData(users);
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ success: true, user: userWithoutPassword });
});

app.put("/api/auth/profile", (req, res) => {
  const { id, name, email, birthDate } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "ID do usuário é obrigatório" });
  }
  let users = ensureAdminUser(readData(USERS_FILE));
  const index = users.findIndex((u) => u.id === id);
  if (index === -1)
    return res
      .status(404)
      .json({ success: false, message: "Usuário não encontrado" });
  if (
    normalizedEmail &&
    users.some(
      (u) => normalizeEmail(u.email) === normalizedEmail && u.id !== id,
    )
  ) {
    return res
      .status(409)
      .json({
        success: false,
        message: "Email já cadastrado para outra conta",
      });
  }
  users[index].name = name || users[index].name;
  users[index].email = normalizedEmail || users[index].email;
  users[index].birthDate = birthDate || users[index].birthDate;
  writeUsersData(users);
  const { password: _, ...userWithoutPassword } = users[index];
  res.json({ success: true, user: userWithoutPassword });
});

app.delete("/api/auth/profile/:id", (req, res) => {
  const { id } = req.params;
  let users = ensureAdminUser(readData(USERS_FILE));
  const isAdminId = users.some(
    (u) =>
      u.id === id &&
      normalizeEmail(u.email) === normalizeEmail(ADMIN_USER.email),
  );
  if (isAdminId) {
    return res
      .status(403)
      .json({
        success: false,
        message: "A conta de administrador não pode ser removida",
      });
  }
  const initialLength = users.length;
  users = users.filter((u) => u.id !== id);

  if (users.length === initialLength) {
    return res
      .status(404)
      .json({ success: false, message: "Usuário não encontrado" });
  }

  writeUsersData(users);
  res.json({ success: true, message: "Usuário removido com sucesso" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
