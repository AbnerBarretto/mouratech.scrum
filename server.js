import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// O Render fornece a porta automaticamente nesta variável
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// LOG DE REQUISIÇÕES (Ajuda a ver no Render se as chamadas estão chegando)
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PURCHASES_FILE = path.join(DATA_DIR, "purchases.json");
const PROFESSIONALS_FILE = path.join(DATA_DIR, "professionals.json");

// Garante que a pasta data existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_JS_FILE = path.join(__dirname, "users-data.js");
const EVENTS_JS_FILE = path.join(__dirname, "events-data.js");
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
    return Array.isArray(data)
      ? data
      : typeof data === "object"
        ? Object.values(data)
        : [];
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
  return hasAdmin ? list : [ADMIN_USER, ...list];
};

const writeUsersData = (users) => {
  const list = ensureAdminUser(users);
  writeData(USERS_FILE, list);
  fs.writeFileSync(
    USERS_JS_FILE,
    `window.usersData = ${JSON.stringify(list, null, 2)};\n`,
    "utf8",
  );
};

const writeEventsData = (events) => {
  writeData(EVENTS_FILE, events);
  fs.writeFileSync(
    EVENTS_JS_FILE,
    `window.eventsData = ${JSON.stringify(events, null, 2)};\n`,
    "utf8",
  );
};

const writePurchasesData = (purchases) => {
  writeData(PURCHASES_FILE, purchases);
  fs.writeFileSync(
    PURCHASES_JS_FILE,
    `window.purchasesData = ${JSON.stringify(purchases, null, 2)};\n`,
    "utf8",
  );
};

try {
  const existingUsers = readData(USERS_FILE);
  writeUsersData(existingUsers);
  const existingEvents = readData(EVENTS_FILE);
  writeEventsData(existingEvents);
  const existingPurchases = readData(PURCHASES_FILE);
  writePurchasesData(existingPurchases);
  console.log(
    "Sincronizados users-data.js, events-data.js, purchases-data.js a partir de data/*.json",
  );
} catch (err) {
  console.error("Erro ao sincronizar arquivos data -> *-data.js:", err);
}

const toMoney = (v) => {
  const n = parseFloat(v);
  return !isNaN(n) && n >= 0 ? n : 0;
};
const toQty = (v) => {
  const n = parseInt(v, 10);
  return !isNaN(n) && n >= 1 ? n : 1;
};

// --- API ROUTES (Vêm antes dos arquivos estáticos para não dar conflito) ---

app.get("/api/events", (req, res) => res.json(readData(EVENTS_FILE)));

app.post("/api/events", (req, res) => {
  const newEvent = req.body;
  let events = readData(EVENTS_FILE);
  if (!newEvent.id) newEvent.id = `event-${Date.now()}`;
  events.push(newEvent);
  writeEventsData(events);
  res.status(201).json({ success: true, event: newEvent });
});

app.get("/api/purchases", (req, res) => res.json(readData(PURCHASES_FILE)));

app.post("/api/purchases", (req, res) => {
  const p = req.body;
  let purchases = readData(PURCHASES_FILE);
  p.id = `buy-${Date.now()}`;
  p.date = new Date().toISOString();
  purchases.push(p);
  writePurchasesData(purchases);
  res.status(201).json({ success: true, purchase: p });
});

app.get("/api/purchases/user/:userId", (req, res) => {
  const { userId } = req.params;
  const purchases = readData(PURCHASES_FILE);
  const events = readData(EVENTS_FILE);
  const userPurchases = purchases
    .filter((p) => p.userId === userId)
    .map((p) => ({ ...p, event: events.find((e) => e.id === p.eventId) }));
  res.json(userPurchases);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const users = ensureAdminUser(readData(USERS_FILE));
  const user = users.find(
    (u) =>
      normalizeEmail(u.email) === normalizeEmail(email) &&
      u.password === password,
  );
  if (user) {
    const { password: _, ...cleanUser } = user;
    res.json({ success: true, user: cleanUser });
  } else {
    res.status(401).json({ success: false, message: "Credenciais inválidas" });
  }
});

app.get("/api/professionals", (req, res) =>
  res.json(readData(PROFESSIONALS_FILE)),
);

// --- SERVING STATIC FILES ---

const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  console.log("Serving from production folder: /dist");
  app.use(express.static(distPath));

  app.use(express.static(__dirname));

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.url.startsWith("/api")) return next();

    if (path.extname(req.path)) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.log("Serving from root folder (Development Mode)");
  app.use(express.static(__dirname));
}

// Inicia o servidor escutando em todos os IPs (obrigatório para nuvem)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Belo Eventos rodando na porta ${PORT}`);
});
