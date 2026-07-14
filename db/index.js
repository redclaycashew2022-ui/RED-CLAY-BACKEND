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

const initDB = async () => {
  usersTable = await detectUsersTable();
  if (!usersTable) console.error("❌ Could not find a usable users table.");

  productsTable = await detectProductsTable();
  if (!productsTable) console.error("❌ Could not find a usable products table.");

  productPacksTable = await detectProductPacksTable();
  if (!productPacksTable)
    console.warn("⚠️  Could not find a usable product_packs table — pack features disabled.");

  try {
    await ensurePaymentColumns();
  } catch (err) {
    console.error("❌ Error ensuring payment columns on orders table:", err.message);
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