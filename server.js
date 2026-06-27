const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('./db');

//config
let config = {
  port: 3000,
  jwtSecret: "inventory-system-super-secret-key-12345",
  sessionExpiry: "24h"
};
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
} catch (err) {
  console.error("Error reading config.json, using defaults:", err.message);
}

//loaddatabase
db.initializeDB();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT auth
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

//admin-only auth
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Administrator permission required" });
  }
}

//auth endpoint

//login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const user = db.getUserByUsername(username);
  if (!user || !db.verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  //JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.sessionExpiry }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

//register
app.post('/api/auth/register', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  //account status
  const assignedRole = (role === 'admin' && req.user.role === 'admin') ? 'admin' : 'user';
  try {
    const newUser = db.addUser(cleanUsername, password, assignedRole);
    res.status(201).json({ message: "Account created successfully", user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//logged in user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

//user list
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  res.json(db.getUsers());
});

//delete user
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.deleteUser(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//inv endpoint

//all inv item
app.get('/api/inventory', authenticateToken, (req, res) => {
  res.json(db.getInventory());
});

//inv item
app.get('/api/inventory/:id', authenticateToken, (req, res) => {
  const item = db.getItemById(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(item);
});

//add item
app.post('/api/inventory', authenticateToken, (req, res) => {
  const { name, sku, category, quantity, unit, safetyStock } = req.body;
  if (!name || !sku) {
    return res.status(400).json({ error: "Name and SKU are required fields" });
  }
  try {
    const item = db.addInventoryItem({ name, sku, category, quantity, unit, safetyStock });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//update item
app.put('/api/inventory/:id', authenticateToken, (req, res) => {
  try {
    const updated = db.updateInventoryItem(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//delete item
app.delete('/api/inventory/:id', authenticateToken, (req, res) => {
  try {
    db.deleteInventoryItem(req.params.id);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//transac

//transac log
app.get('/api/transactions', authenticateToken, (req, res) => {
  res.json(db.getTransactions());
});

// log use/restock
app.post('/api/transactions', authenticateToken, (req, res) => {
  const { itemId, type, quantity, notes } = req.body;
  const userId = req.user.id;

  if (!itemId || !type || quantity === undefined) {
    return res.status(400).json({ error: "itemId, type ('usage' or 'restock'), and quantity are required" });
  }
  try {
    const result = db.recordTransaction(itemId, userId, type, quantity, notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//analytics

//dash stats
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  const items = db.getInventory();
  const transactions = db.getTransactions();
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.quantity <= item.safetyStock);
  const outOfStockItems = items.filter(item => item.quantity === 0);

  //item group stats
  const categoryCounts = {};
  items.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  //calc activity 7d
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTransactions = transactions.filter(tx => new Date(tx.timestamp) >= sevenDaysAgo);

  res.json({
    totalItems,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    categoryCounts,
    recentActivityCount: recentTransactions.length,
    lowStockItems: lowStockItems.map(i => ({ id: i.id, name: i.name, sku: i.sku, quantity: i.quantity, safetyStock: i.safetyStock, unit: i.unit }))
  });
});

//depl analytics
app.get('/api/analytics/depletion', authenticateToken, (req, res) => {
  const windowDays = parseInt(req.query.days) || 30;
  const items = db.getInventory();
  const transactions = db.getTransactions();
  const now = new Date();
  const windowStartDate = new Date();
  windowStartDate.setDate(now.getDate() - windowDays);
  
  //filter for transac use
  const usageTxInWindow = transactions.filter(tx => 
    tx.type === 'usage' && 
    new Date(tx.timestamp) >= windowStartDate
  );

  //transac id group
  const usageByItem = {};
  usageTxInWindow.forEach(tx => {
    usageByItem[tx.itemId] = (usageByItem[tx.itemId] || 0) + tx.quantity;
  });

  const projections = items.map(item => {
    const totalUsage = usageByItem[item.id] || 0;
    const avgDailyUsage = totalUsage / windowDays;
    let daysRemaining = Infinity;
    let depletionDate = null;
    let status = 'Stable';

    if (item.quantity === 0) {
      daysRemaining = 0;
      depletionDate = now.toISOString();
      status = 'Depleted';
    } else if (avgDailyUsage > 0) {
      daysRemaining = item.quantity / avgDailyUsage;
      
      const depDate = new Date();
      const daysToAdd = Math.min(daysRemaining, 36500);
      depDate.setDate(now.getDate() + Math.round(daysToAdd));
      depletionDate = depDate.toISOString();

      if (daysRemaining <= 3) {
        status = 'Critical';
      } else if (daysRemaining <= 7) {
        status = 'Warning';
      } else if (item.quantity <= item.safetyStock) {
        status = 'Low Stock';
      }
    } else {
      status = item.quantity <= item.safetyStock ? 'Low Stock' : 'Stable';
    }

    return {
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      safetyStock: item.safetyStock,
      totalUsageInWindow: totalUsage,
      avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
      daysRemaining: daysRemaining === Infinity ? -1 : Math.round(daysRemaining * 10) / 10,
      depletionDate,
      status
    };
  });

  //sort estimates
  const statusPriority = { 'Depleted': 0, 'Critical': 1, 'Warning': 2, 'Low Stock': 3, 'Stable': 4 };
  projections.sort((a, b) => {
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    if (a.daysRemaining !== -1 && b.daysRemaining !== -1) {
      return a.daysRemaining - b.daysRemaining;
    }
    if (a.daysRemaining === -1) return 1;
    if (b.daysRemaining === -1) return -1;
    return 0;
  });

  res.json({
    windowDays,
    projections
  });
});

//server start
const PORT = process.env.PORT || config.port;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`ShelfLife server running on ${url}`);
  
  //browser auto open
  try {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec(`start ${url}`);
    } else if (process.platform === 'darwin') {
      exec(`open ${url}`);
    } else {
      exec(`xdg-open ${url}`);
    }
  } catch (err) {
    console.error("Failed to automatically open browser:", err.message);
  }
});
