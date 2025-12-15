import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs/promises';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration State
let currentTiktokUsername = process.env.TIKTOK_USERNAME || "seecccjeje";
const PORT = process.env.PORT || 3002;
const WINNERS_FILE = join(__dirname, 'winners.json');
const PRIZE_CONFIG_FILE = join(__dirname, 'prize-config.json');

// --- Multer Storage Config ---
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // Save to backend local "uploads" directory for production compatibility
    const uploadDir = join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // ignore if exists
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- Helper Functions ---

async function loadWinners() {
  try {
    const data = await fs.readFile(WINNERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveWinner(username, item) {
  try {
    const winners = await loadWinners();
    const newWinner = {
      id: Date.now().toString(),
      username,
      item,
      timestamp: new Date().toISOString()
    };
    winners.push(newWinner);
    await fs.writeFile(WINNERS_FILE, JSON.stringify(winners, null, 2));
    console.log(`[WINNER SAVED] ${username} won ${item}`);
    return newWinner;
  } catch (error) {
    console.error('[SAVE WINNER ERROR]', error);
    throw error;
  }
}

async function loadPrizeConfig() {
  try {
    const data = await fs.readFile(PRIZE_CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);

    // Inject default images if missing
    config.items = config.items.map(item => {
      if (!item.image) {
        if (item.label === 'mitos') item.image = '/assets/mitos-new.png';
        if (item.label === 'scare') item.image = '/assets/scare.png';
        if (item.label === 'gladiator') item.image = '/assets/gladiator.png';
        if (item.label === 'fb') item.image = '/assets/fb.png';
      }
      return item;
    });

    return config;
  } catch (error) {
    return {
      items: [
        { label: "gladiator", prob: 0.1, value: 0, image: "/assets/gladiator.png" },
        { label: "fb", prob: 3, value: 50, image: "/assets/fb.png" },
        { label: "scare", prob: 17, value: 10, image: "/assets/scare.png" },
        { label: "mitos", prob: 79.9, value: 0, image: "/assets/mitos-new.png" }
      ]
    };
  }
}

async function savePrizeConfig(config) {
  await fs.writeFile(PRIZE_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function calculatePrizeResult(items) {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.prob;
    if (random <= cumulative) {
      return item;
    }
  }
  return items[items.length - 1];
}

function calculateSpins(coinAmount) {
  return Math.floor(coinAmount / 10);
}

// --- State Management ---
const spinQueue = [];
let isProcessingQueue = false;
const clients = new Set();
let tiktokConnectionStatus = "Disconnected";

// --- WebSocket Broadcast ---
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

// --- Queue Processor ---
async function processQueue() {
  if (isProcessingQueue || spinQueue.length === 0) return;

  isProcessingQueue = true;
  broadcastQueueStatus();

  while (spinQueue.length > 0) {
    const queueItem = spinQueue.shift();
    const { user, spins, giftName, coin } = queueItem;

    console.log(`[PROCESSING] ${user} - ${spins} spin(s) from ${giftName} (${coin} coins)`);
    broadcastQueueStatus();

    const prizeConfig = await loadPrizeConfig();

    // Calculate results
    const spinResults = [];
    for (let i = 0; i < spins; i++) {
      // Ensure probabilities sum to 100 (optional normalization could happen here, but we assume config is correct)
      // Re-read config for safety if needed, but here we use loaded one
      const result = calculatePrizeResult(prizeConfig.items);
      spinResults.push(result);
      console.log(`[SPIN ${i + 1}] ${user} won: ${result.label} (${result.value})`);
    }

    // Broadcast spin request
    broadcast({
      type: "spin_request",
      user,
      spins,
      giftName,
      coin,
      prizeResults: spinResults
    });

    // Wait for animation
    const delay = (spins * 5000) + 2000; // 5s per spin + buffer
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  isProcessingQueue = false;
  broadcastQueueStatus();
}

function broadcastQueueStatus() {
  broadcast({
    type: "queue_status",
    queueLength: spinQueue.length,
    isProcessing: isProcessingQueue
  });
}


// --- TikTok Connection Handling ---
let tiktokConn = new WebcastPushConnection(currentTiktokUsername);

function setupTiktokListeners(connection) {
  connection.removeAllListeners();

  connection.on('connected', (state) => {
    console.log(`[TIKTOK] Connected to @${currentTiktokUsername}`);
    tiktokConnectionStatus = "Connected";
    broadcast({ type: "system", message: `Connected to TikTok Live (@${currentTiktokUsername})` });
  });

  connection.on('disconnected', () => {
    console.log('[TIKTOK] Disconnected');
    tiktokConnectionStatus = "Disconnected";
    broadcast({ type: "system", message: "Disconnected from TikTok Live" });
  });

  connection.on('error', (err) => {
    console.error('[TIKTOK ERROR]', err);
    tiktokConnectionStatus = "Error";
    broadcast({ type: "system", message: `TikTok Error: ${err.message}` });
  });

  connection.on('gift', (data) => {
    handleGift(data);
  });
}

function handleGift(data) {
  try {
    const username = data.uniqueId || data.user?.uniqueId || 'Unknown';
    const giftName = data.giftName || 'Unknown Gift';
    const diamondCount = data.diamondCount || 0;
    const repeatCount = data.repeatCount || 1;
    const totalCoins = diamondCount * repeatCount;

    const spinCount = calculateSpins(totalCoins);

    console.log(`[GIFT] ${username} sent ${giftName} = ${totalCoins} coin → ${spinCount} spin(s)`);

    if (spinCount >= 1) {
      spinQueue.push({
        user: username,
        spins: spinCount,
        giftName,
        coin: totalCoins
      });
      processQueue();
    }
  } catch (error) {
    console.error('[GIFT ERROR]', error);
  }
}

// Initial Setup
setupTiktokListeners(tiktokConn);

// --- WebSocket Server ---
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WEBSOCKET] Client connected. Total: ${clients.size}`);

  ws.send(JSON.stringify({ type: "system", message: "Connected to Backend High Command" }));

  // Send initial statuses
  ws.send(JSON.stringify({
    type: "queue_status",
    queueLength: spinQueue.length,
    isProcessing: isProcessingQueue
  }));

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

// --- Express App ---
app.use(express.static(join(__dirname, 'public')));
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

// --- Endpoints ---

// 1. Get Full Config & Status
app.get('/api/status', async (req, res) => {
  const prizeConfig = await loadPrizeConfig();
  res.json({
    tiktokUsername: currentTiktokUsername,
    tiktokStatus: tiktokConnectionStatus, // Connected, Disconnected, Error
    queueLength: spinQueue.length,
    isProcessing: isProcessingQueue,
    prizes: prizeConfig.items
  });
});

// 2. Update TikTok Username & Connect
app.post('/api/config/tiktok', async (req, res) => {
  const { username, action } = req.body;

  if (action === 'disconnect') {
    if (tiktokConn.getState() === 'CONNECTED') tiktokConn.disconnect();
    return res.json({ success: true, message: 'Disconnected' });
  }

  if (username) {
    if (tiktokConn.getState() === 'CONNECTED') {
      tiktokConn.disconnect();
      await new Promise(r => setTimeout(r, 1000)); // Wait a bit
    }

    currentTiktokUsername = username;
    tiktokConn = new WebcastPushConnection(username);
    setupTiktokListeners(tiktokConn);

    tiktokConn.connect()
      .then(() => {
        res.json({ success: true, message: `Connected to @${username}` });
      })
      .catch(err => {
        res.status(500).json({ success: false, error: err.message });
      });
  } else {
    res.status(400).json({ error: 'Username required' });
  }
});

// 3. Update Prize Config
app.post('/api/config/prizes', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });

    // Validate total probability ?? Optional

    await savePrizeConfig({ items });
    await savePrizeConfig({ items });
    res.json({ success: true, message: 'Prize config updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// 3.5. Upload Image
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return path relative to public
  // Check if we are running in a way that public is served at root.
  // Next.js serves public/* at root /.
  // So path is just /uploads/filename
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: filePath });
});

// 4. Test Spin / Manual Trigger
app.post('/api/test-spin', (req, res) => {
  const { username = 'test_admin', coins = 10 } = req.body;
  const spins = calculateSpins(coins);

  if (spins < 1) return res.status(400).json({ error: 'Not enough coins for a spin (min 10)' });

  spinQueue.push({
    user: username,
    spins,
    giftName: 'Manual Test',
    coin: coins
  });

  processQueue();

  res.json({ success: true, message: `Added ${spins} spins for ${username}` });
});

// 5. Clear Queue
app.post('/api/control/clear-queue', (req, res) => {
  spinQueue.length = 0;
  broadcastQueueStatus();
  res.json({ success: true, message: 'Queue cleared' });
});

// Winners API (existing)
app.get('/api/winners', async (req, res) => {
  const winners = await loadWinners();
  res.json(winners);
});

app.post('/api/winners', async (req, res) => {
  const { username, item } = req.body;
  const newWinner = await saveWinner(username, item);
  broadcast({ type: "new_winner", winner: newWinner });
  res.json(newWinner);
});

// Start Server
server.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  console.log(`[TIKTOK] Initial target: @${currentTiktokUsername}`);

  // Auto-connect on start
  tiktokConn.connect().catch(e => console.error("[TIKTOK AUTO-CONNECT FAIL]", e.message));
});
