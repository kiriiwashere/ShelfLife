const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const isProd = process.argv.includes('--prod') || process.argv.includes('--production');
let config = { dbPath: "./data/db.json" };
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.log("Using default DB path for seeding");
}

const DB_FILE = path.resolve(__dirname, config.dbPath);
const dbDir = path.dirname(DB_FILE);
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

const now = new Date();
function dateDaysAgo(days, hoursOffset = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

console.log(`Initializing database in [${isProd ? 'PRODUCTION' : 'DEMO'}] mode...`);
const adminCreds = hashPassword('admin123');
const adminId = crypto.randomUUID();
const users = [
  {
    id: adminId,
    username: 'admin',
    passwordHash: adminCreds.hash,
    salt: adminCreds.salt,
    role: 'admin',
    createdAt: dateDaysAgo(30)
  }
];

const items = [];
const transactions = [];
if (!isProd) {
  const staffCreds = hashPassword('staff123');
  const staffId = crypto.randomUUID();
  users.push({
    id: staffId,
    username: 'staff',
    passwordHash: staffCreds.hash,
    salt: staffCreds.salt,
    role: 'user',
    createdAt: dateDaysAgo(25)
  });

  const demoItems = [
    {
      id: crypto.randomUUID(),
      name: 'Premium Multipurpose A4 Paper',
      sku: 'PAP-A4-500',
      category: 'Stationery',
      quantity: 14,
      unit: 'reams',
      safetyStock: 10,
      createdAt: dateDaysAgo(30),
      updatedAt: dateDaysAgo(1)
    },
    {
      id: crypto.randomUUID(),
      name: 'N95 Protective Masks (Box of 50)',
      sku: 'SAF-N95-50',
      category: 'Safety Gear',
      quantity: 3,
      unit: 'boxes',
      safetyStock: 5,
      createdAt: dateDaysAgo(25),
      updatedAt: dateDaysAgo(2)
    },
    {
      id: crypto.randomUUID(),
      name: 'Dell 24" USB-C Monitor',
      sku: 'ELC-DEL24-MON',
      category: 'Electronics',
      quantity: 45,
      unit: 'units',
      safetyStock: 5,
      createdAt: dateDaysAgo(30),
      updatedAt: dateDaysAgo(10)
    },
    {
      id: crypto.randomUUID(),
      name: 'Ground Espresso Coffee 1kg',
      sku: 'PAN-ESP-1KG',
      category: 'Pantry',
      quantity: 0,
      unit: 'bags',
      safetyStock: 3,
      createdAt: dateDaysAgo(20),
      updatedAt: dateDaysAgo(2)
    },
    {
      id: crypto.randomUUID(),
      name: 'Nitrile Gloves (Box of 100)',
      sku: 'SAF-GLV-100',
      category: 'Safety Gear',
      quantity: 12,
      unit: 'boxes',
      safetyStock: 15,
      createdAt: dateDaysAgo(15),
      updatedAt: dateDaysAgo(1)
    }
  ];

  demoItems.forEach(i => items.push(i));
  transactions.push({
    id: crypto.randomUUID(),
    itemId: items[0].id,
    itemName: items[0].name,
    itemSku: items[0].sku,
    unit: items[0].unit,
    userId: adminId,
    username: 'admin',
    type: 'restock',
    quantity: 30,
    notes: 'Initial office supply delivery',
    timestamp: dateDaysAgo(28, 2)
  });
  const paperUsage = [
    { days: 25, qty: 2, note: 'Marketing monthly print run' },
    { days: 20, qty: 3, note: 'HR onboarding packets' },
    { days: 15, qty: 2, note: 'Accounting ledger archives' },
    { days: 10, qty: 4, note: 'Annual report pamphlets' },
    { days: 5, qty: 3, note: 'Sales brochures' },
    { days: 2, qty: 2, note: 'General office printing' }
  ];
  paperUsage.forEach(tx => {
    transactions.push({
      id: crypto.randomUUID(),
      itemId: items[0].id,
      itemName: items[0].name,
      itemSku: items[0].sku,
      unit: items[0].unit,
      userId: staffId,
      username: 'staff',
      type: 'usage',
      quantity: tx.qty,
      notes: tx.note,
      timestamp: dateDaysAgo(tx.days, 4)
    });
  });

  transactions.push({
    id: crypto.randomUUID(),
    itemId: items[1].id,
    itemName: items[1].name,
    itemSku: items[1].sku,
    unit: items[1].unit,
    userId: adminId,
    username: 'admin',
    type: 'restock',
    quantity: 20,
    notes: 'Quarterly safety budget acquisition',
    timestamp: dateDaysAgo(25, 1)
  });

  const maskUsage = [
    { days: 22, qty: 3, note: 'Lab technicians inspection work' },
    { days: 18, qty: 4, note: 'Maintenance dust cleanup project' },
    { days: 14, qty: 3, note: 'Visitor safety kits' },
    { days: 9, qty: 4, note: 'HVAC repair crew dispatch' },
    { days: 4, qty: 3, note: 'Deep cleaning staff supply' }
  ];

  maskUsage.forEach(tx => {
    transactions.push({
      id: crypto.randomUUID(),
      itemId: items[1].id,
      itemName: items[1].name,
      itemSku: items[1].sku,
      unit: items[1].unit,
      userId: staffId,
      username: 'staff',
      type: 'usage',
      quantity: tx.qty,
      notes: tx.note,
      timestamp: dateDaysAgo(tx.days, 2)
    });
  });

  transactions.push({
    id: crypto.randomUUID(),
    itemId: items[2].id,
    itemName: items[2].name,
    itemSku: items[2].sku,
    unit: items[2].unit,
    userId: adminId,
    username: 'admin',
    type: 'restock',
    quantity: 50,
    notes: 'Office workstation hardware upgrade',
    timestamp: dateDaysAgo(30, 8)
  });

  const monitorUsage = [
    { days: 20, qty: 2, note: 'Dev team desks' },
    { days: 10, qty: 3, note: 'New hire setup - engineering' }
  ];

  monitorUsage.forEach(tx => {
    transactions.push({
      id: crypto.randomUUID(),
      itemId: items[2].id,
      itemName: items[2].name,
      itemSku: items[2].sku,
      unit: items[2].unit,
      userId: adminId,
      username: 'admin',
      type: 'usage',
      quantity: tx.qty,
      notes: tx.note,
      timestamp: dateDaysAgo(tx.days, 1)
    });
  });

  transactions.push({
    id: crypto.randomUUID(),
    itemId: items[3].id,
    itemName: items[3].name,
    itemSku: items[3].sku,
    unit: items[3].unit,
    userId: staffId,
    username: 'staff',
    type: 'restock',
    quantity: 10,
    notes: 'Kitchen pantry replenish',
    timestamp: dateDaysAgo(20, 2)
  });

  const coffeeUsage = [
    { days: 18, qty: 2, note: 'Morning conference hospitality' },
    { days: 12, qty: 3, note: 'General staff kitchen refill' },
    { days: 6, qty: 3, note: 'Boardroom seminars catering' },
    { days: 2, qty: 2, note: 'Kitchen stock depletion' }
  ];

  coffeeUsage.forEach(tx => {
    transactions.push({
      id: crypto.randomUUID(),
      itemId: items[3].id,
      itemName: items[3].name,
      itemSku: items[3].sku,
      unit: items[3].unit,
      userId: staffId,
      username: 'staff',
      type: 'usage',
      quantity: tx.qty,
      notes: tx.note,
      timestamp: dateDaysAgo(tx.days, 5)
    });
  });

  transactions.push({
    id: crypto.randomUUID(),
    itemId: items[4].id,
    itemName: items[4].name,
    itemSku: items[4].sku,
    unit: items[4].unit,
    userId: adminId,
    username: 'admin',
    type: 'restock',
    quantity: 30,
    notes: 'Warehouse medical cabinet restocking',
    timestamp: dateDaysAgo(15, 6)
  });

  const gloveUsage = [
    { days: 12, qty: 5, note: 'Chemistry lab safety session' },
    { days: 8, qty: 6, note: 'Server room dust cleaning' },
    { days: 4, qty: 4, note: 'Building sanitation supplies' },
    { days: 1, qty: 3, note: 'Facilities maintenance run' }
  ];

  gloveUsage.forEach(tx => {
    transactions.push({
      id: crypto.randomUUID(),
      itemId: items[4].id,
      itemName: items[4].name,
      itemSku: items[4].sku,
      unit: items[4].unit,
      userId: staffId,
      username: 'staff',
      type: 'usage',
      quantity: tx.qty,
      notes: tx.note,
      timestamp: dateDaysAgo(tx.days, 1)
    });
  });
}

const dbContent = {
  users,
  inventory: items,
  transactions
};

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

fs.writeFileSync(DB_FILE, JSON.stringify(dbContent, null, 2), 'utf8');

console.log("Database initialized successfully!");
console.log(`Saved to: ${DB_FILE}`);
console.log("Contains:");
console.log(` - ${users.length} Users`);
if (isProd) {
  console.log("   (Clean environment initialized with admin user only)");
} else {
  console.log(` - ${items.length} Inventory items`);
  console.log(` - ${transactions.length} Historical transaction logs`);
}
