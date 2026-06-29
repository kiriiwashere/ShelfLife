const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// load config
let config = { dbPath: "./data/db.json" };
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.error("Error reading config in db.js, using defaults:", err.message);
}

const DB_FILE = path.resolve(__dirname, config.dbPath);

//check
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: [], inventory: [], transactions: [] };
    writeDB(initialData);
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading DB file, returning empty state:", err.message);
    return { users: [], inventory: [], transactions: [] };
  }
}

function writeDB(data) {
  const tempFile = DB_FILE + '.tmp';
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE); // Atomic write replacement
    return true;
  } catch (err) {
    console.error("Error writing DB file:", err.message);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
    throw err;
  }
}

function initializeDB() {
  const db = readDB();
  if (db.users.length === 0) {
    const adminCreds = hashPassword('admin123');
    db.users.push({
      id: crypto.randomUUID(),
      username: 'admin',
      passwordHash: adminCreds.hash,
      salt: adminCreds.salt,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    writeDB(db);
    console.log("Database initialized with default admin credentials (admin/admin123)");
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  initializeDB,
  
  getUsers: () => {
    const db = readDB();
    return db.users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt }));
  },
  
  getUserByUsername: (username) => {
    const db = readDB();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },
  
  addUser: (username, password, role = 'user') => {
    const db = readDB();
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already exists");
    }
    const creds = hashPassword(password);
    const newUser = {
      id: crypto.randomUUID(),
      username,
      passwordHash: creds.hash,
      salt: creds.salt,
      role,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDB(db);
    return { id: newUser.id, username: newUser.username, role: newUser.role, createdAt: newUser.createdAt };
  },

  deleteUser: (id) => {
    const db = readDB();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    if (db.users[index].username === 'admin') throw new Error("Cannot delete primary admin account");
    db.users.splice(index, 1);
    writeDB(db);
    return true;
  },

  getInventory: () => {
    const db = readDB();
    return db.inventory;
  },
  getItemById: (id) => {
    const db = readDB();
    return db.inventory.find(item => item.id === id);
  },

  addInventoryItem: (itemData) => {
    const db = readDB();
    if (db.inventory.some(item => item.sku.toLowerCase() === itemData.sku.toLowerCase())) {
      throw new Error("SKU already exists");
    }
    const newItem = {
      id: crypto.randomUUID(),
      name: itemData.name,
      sku: itemData.sku,
      category: itemData.category || "General",
      quantity: parseFloat(itemData.quantity) || 0,
      unit: itemData.unit || "pcs",
      safetyStock: parseFloat(itemData.safetyStock) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.inventory.push(newItem);
    writeDB(db);
    return newItem;
  },

  updateInventoryItem: (id, updateData) => {
    const db = readDB();
    const index = db.inventory.findIndex(item => item.id === id);
    if (index === -1) throw new Error("Item not found");
    
    // Check SKU collision if SKU is changing
    if (updateData.sku && updateData.sku.toLowerCase() !== db.inventory[index].sku.toLowerCase()) {
      if (db.inventory.some(item => item.sku.toLowerCase() === updateData.sku.toLowerCase())) {
        throw new Error("SKU already exists");
      }
    }

    const currentItem = db.inventory[index];
    const updatedItem = {
      ...currentItem,
      name: updateData.name !== undefined ? updateData.name : currentItem.name,
      sku: updateData.sku !== undefined ? updateData.sku : currentItem.sku,
      category: updateData.category !== undefined ? updateData.category : currentItem.category,
      quantity: updateData.quantity !== undefined ? parseFloat(updateData.quantity) : currentItem.quantity,
      unit: updateData.unit !== undefined ? updateData.unit : currentItem.unit,
      safetyStock: updateData.safetyStock !== undefined ? parseFloat(updateData.safetyStock) : currentItem.safetyStock,
      updatedAt: new Date().toISOString()
    };
    db.inventory[index] = updatedItem;
    writeDB(db);
    return updatedItem;
  },

  deleteInventoryItem: (id) => {
    const db = readDB();
    const index = db.inventory.findIndex(item => item.id === id);
    if (index === -1) throw new Error("Item not found");
    db.inventory.splice(index, 1);
    db.transactions = db.transactions.filter(tx => tx.itemId !== id);
    writeDB(db);
    return true;
  },

  getTransactions: () => {
    const db = readDB();
    return db.transactions;
  },

  recordTransaction: (itemId, userId, type, quantity, notes = "") => {
    const db = readDB();
    const itemIndex = db.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) throw new Error("Item not found");
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Quantity must be a positive number");
    const item = db.inventory[itemIndex];
    let newQuantity = item.quantity;
    if (type === 'usage') {
      if (newQuantity < qty) {
        throw new Error(`Insufficient stock. Current stock is ${newQuantity} ${item.unit}`);
      }
      newQuantity -= qty;
    } else if (type === 'restock') {
      newQuantity += qty;
    } else {
      throw new Error("Invalid transaction type. Must be 'usage' or 'restock'");
    }
    item.quantity = newQuantity;
    item.updatedAt = new Date().toISOString();
    const transaction = {
      id: crypto.randomUUID(),
      itemId,
      itemName: item.name,
      itemSku: item.sku,
      unit: item.unit,
      userId,
      username: db.users.find(u => u.id === userId)?.username || "Unknown",
      type,
      quantity: qty,
      notes,
      timestamp: new Date().toISOString()
    };
    db.transactions.push(transaction);
    writeDB(db);
    return { item, transaction };
  }
};
