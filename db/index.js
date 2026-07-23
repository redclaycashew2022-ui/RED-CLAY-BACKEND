const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : false,
});

const normalizePhone = (phone) => {
  if (!phone) return phone;
  const digits = phone.toString().replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const ADMIN_PHONES = (  
  process.env.ADMIN_PHONES
    ? process.env.ADMIN_PHONES.split(",")
    : ["8754201900"]
).map((p) => p.replace(/\D/g, "").slice(-10));

let usersTable = null;
let productsTable = null;
let productPacksTable = null;

const detectTable = async (candidates) => {
  for (const name of candidates) {
    try {
      const res = await pool.query(`SELECT to_regclass($1) AS reg`, [name]);
      if (res.rows[0] && res.rows[0].reg) return name;
    } catch (err) {
      console.error(`Error checking table "${name}":`, err.message);
    }
  }
  return null;
};

const detectUsersTable = () => detectTable(["users"]);
const detectProductsTable = () => detectTable(["products"]);
const detectProductPacksTable = () => detectTable(["product_packs"]);

const ensurePaymentColumns = async () => {
  await pool.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS payment_status character varying(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS razorpay_order_id character varying(100),
      ADD COLUMN IF NOT EXISTS razorpay_payment_id character varying(100),
      ADD COLUMN IF NOT EXISTS razorpay_signature character varying(255)
  `);
};

const ensureHomepageCollectionColumn = async () => {
  const table = getProductsTable();
  if (!table) return;
  await pool.query(`
    ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS homepage_collection VARCHAR(100)
  `);
};

const ensureOrderItemsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      product_name VARCHAR(255),
      size VARCHAR(50),
      price NUMERIC(10,2),
      quantity INTEGER,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS product_image TEXT
  `);
};

const ensureContactMessagesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.contact_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      whatsapp_number VARCHAR(20) NOT NULL,
      email VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const initDB = async () => {
  usersTable = await detectUsersTable();
  if (!usersTable) console.error("❌ Could not find a usable users table.");

  productsTable = await detectProductsTable();
  if (!productsTable) console.error("❌ Could not find a usable products table.");

  productPacksTable = await detectProductPacksTable();
  if (!productPacksTable)
    console.warn("⚠️  Could not find a usable product_packs table — pack features disabled.");

  try {
    await ensureHomepageCollectionColumn();
  } catch (err) {
    console.error("❌ Error ensuring products.homepage_collection column:", err.message);
  }

  try {
    await ensurePaymentColumns();
    await ensureOrderItemsTable();
  } catch (err) {
    console.error("❌ Error ensuring orders/order_items schema:", err.message);
  }

  try {
    await ensureContactMessagesTable();
  } catch (err) {
    console.error("❌ Error ensuring contact_messages table:", err.message);
  }
};

const getUsersTable = () => usersTable;
const getProductsTable = () => productsTable;
const getProductPacksTable = () => productPacksTable;

module.exports = {
  pool,
  normalizePhone,
  ADMIN_PHONES,
  initDB,
  getUsersTable,
  getProductsTable,
  getProductPacksTable,
};