const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
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
  for (const candidate of candidates) {
    try {
      const res = await pool.query("SELECT to_regclass($1) AS tbl", [candidate]);
      if (res.rows[0]?.tbl) {
        try {
          await pool.query(`SELECT 1 FROM ${candidate} LIMIT 1`);
          console.log(`✅ Detected table: ${candidate}`);
          return candidate;
        } catch (err) {
          if (err.code === "42501") {
            console.warn(
              `⚠️  Found ${candidate} but current DB user lacks SELECT permission.`
            );
          }
        }
      }
    } catch {
    }
  }
  return null;
};

const detectUsersTable = () =>
  detectTable(
    [
      process.env.DB_SCHEMA && `${process.env.DB_SCHEMA}.users`,
      "redclaycashews.users",
      "public.users",
    ].filter(Boolean)
  );

const detectProductsTable = () =>
  detectTable(
    [
      process.env.DB_SCHEMA && `${process.env.DB_SCHEMA}.products`,
      "redclaycashews.products",
      "public.products",
    ].filter(Boolean)
  );

const detectProductPacksTable = () =>
  detectTable(
    [
      process.env.DB_SCHEMA && `${process.env.DB_SCHEMA}.product_packs`,
      "redclaycashews.product_packs",
      "public.product_packs",
    ].filter(Boolean)
  );


const getUsersTable = () => {
  if (!usersTable) throw new Error("Users table not initialized yet");
  return usersTable;
};

const getProductsTable = () => {
  if (!productsTable) throw new Error("Products table not initialized yet");
  return productsTable;
};

const getProductPacksTable = () => {
  if (!productPacksTable) throw new Error("Product packs table not initialized yet");
  return productPacksTable;
};


const initDB = async () => {
  usersTable = await detectUsersTable();
  if (!usersTable) console.error("❌ Could not find a usable users table.");

  productsTable = await detectProductsTable();
  if (!productsTable) console.error("❌ Could not find a usable products table.");

  productPacksTable = await detectProductPacksTable();
  if (!productPacksTable)
    console.warn("⚠️  Could not find a usable product_packs table — pack features disabled.");
};


const upsertUserOTP = async (phone_number, otp, otp_expiry) => {
  const table = getUsersTable();
  const normalized = normalizePhone(phone_number);
  const userTypeToSet = ADMIN_PHONES.includes(normalized) ? "admin" : "user";

  const res = await pool.query(
    `INSERT INTO ${table} (phone_number, otp, otp_expiry, user_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone_number) DO UPDATE
       SET otp        = EXCLUDED.otp,
           otp_expiry = EXCLUDED.otp_expiry,
           user_type  = CASE
                          WHEN EXCLUDED.user_type = 'admin' THEN 'admin'
                          ELSE ${table}.user_type
                        END
     RETURNING id, user_type, phone_number`,
    [normalized, otp, otp_expiry, userTypeToSet]
  );
  return res.rows[0];
};

const getUserByPhone = async (phone_number) => {
  const table = getUsersTable();
  const normalized = normalizePhone(phone_number);
  const res = await pool.query(
    `SELECT * FROM ${table} WHERE phone_number = $1`,
    [normalized]
  );
  return res.rows[0] || null;
};

const clearOTP = async (phone_number) => {
  const table = getUsersTable();
  const normalized = normalizePhone(phone_number);
  await pool.query(
    `UPDATE ${table} SET otp = NULL, otp_expiry = NULL WHERE phone_number = $1`,
    [normalized]
  );
};


const addProduct = async (data) => {
  const {
    name,
    description,
    price,
    mrp_price,
    sale_price,
    stock,
    category,
    maincategory,
    subcategory,
    image_url,
    image_url1,
    image_url2,
    image_url3,
    image_url4,
    image_url5,
    is_active,
    g,
    pack_of,
  } = data;
  const table = getProductsTable();

  const priceToStore =
    sale_price != null ? sale_price : price != null ? price : 0;

  const legacyImage = image_url1 || image_url || null;

  const res = await pool.query(
    `INSERT INTO ${table}
       (name, description, price, mrp_price, sale_price, stock, category,
        maincategory, subcategory, image_url, image_url1, image_url2, image_url3,
        image_url4, image_url5, is_active, g, pack_of)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      name,
      description,
      priceToStore,
      mrp_price || null,
      sale_price || null,
      stock || 0,
      category || null,
      maincategory || null,
      subcategory || null,
      legacyImage,
      image_url1 || null,
      image_url2 || null,
      image_url3 || null,
      image_url4 || null,
      image_url5 || null,
      is_active === undefined ? true : is_active,
      g || null,
      pack_of || null,
    ]
  );
  return res.rows[0];
};

const updateProduct = async (id, data) => {
  const {
    name,
    description,
    price,
    mrp_price,
    sale_price,
    stock,
    category,
    maincategory,
    subcategory,
    image_url,
    image_url1,
    image_url2,
    image_url3,
    image_url4,
    image_url5,
    is_active,
    g,
    pack_of,
  } = data;
  const table = getProductsTable();

  const priceToStore =
    sale_price != null ? sale_price : price != null ? price : null;

  const legacyImage = image_url1 || image_url || null;

  const res = await pool.query(
    `UPDATE ${table}
     SET name=$1, description=$2, price=$3, mrp_price=$4, sale_price=$5,
         stock=$6, category=$7, maincategory=$8, subcategory=$9,
         image_url=$10, image_url1=$11, image_url2=$12, image_url3=$13,
         image_url4=$14, image_url5=$15, is_active=$16, g=$17, pack_of=$18,
         updated_at = NOW()
     WHERE id = $19
     RETURNING *`,
    [
      name,
      description,
      priceToStore,
      mrp_price || null,
      sale_price || null,
      stock || 0,
      category || null,
      maincategory || null,
      subcategory || null,
      legacyImage,
      image_url1 || null,
      image_url2 || null,
      image_url3 || null,
      image_url4 || null,
      image_url5 || null,
      is_active === undefined ? true : is_active,
      g || null,
      pack_of || null,
      id,
    ]
  );
  return res.rows[0] || null;
};

const deleteProduct = async (id) => {
  const table = getProductsTable();
  await pool.query(`UPDATE ${table} SET is_active = false WHERE id = $1`, [id]);
};

const getAllProducts = async () => {
  const table = getProductsTable();
  const res = await pool.query(
    `SELECT * FROM ${table} WHERE is_active = true ORDER BY created_at DESC`
  );
  return res.rows;
};

const getProductsBySearch = async (keyword) => {
  const table = getProductsTable();
  const q = `%${keyword.toLowerCase()}%`;
  const res = await pool.query(
    `SELECT * FROM ${table}
     WHERE is_active = true AND (
       LOWER(name)         LIKE $1 OR
       LOWER(maincategory) LIKE $1 OR
       LOWER(subcategory)  LIKE $1
     )
     ORDER BY created_at DESC`,
    [q]
  );
  return res.rows;
};


const addProductPack = async (product_id, pack_size, price, mrp_price) => {
  const table = getProductPacksTable();
  const res = await pool.query(
    `INSERT INTO ${table} (product_id, pack_size, price, mrp_price)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [product_id, pack_size, price, mrp_price || null]
  );
  return res.rows[0];
};

const getProductPacksByProductId = async (product_id) => {
  if (!productPacksTable) return [];
  
  const table = getProductPacksTable();
  const res = await pool.query(
    `SELECT * FROM ${table} WHERE product_id = $1 ORDER BY price ASC`,
    [product_id]
  );
  return res.rows;
};

const setProductPacks = async (product_id, sizesArr) => {
  if (!productPacksTable) return;
  
  const table = getProductPacksTable();
  await pool.query(`DELETE FROM ${table} WHERE product_id = $1`, [product_id]);
  for (const s of sizesArr) {
    await addProductPack(product_id, s.pack_size, s.price, s.mrp_price);
  }
};


module.exports = {
  pool,
  initDB,
  upsertUserOTP,
  getUserByPhone,
  clearOTP,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsBySearch,
  addProductPack,
  getProductPacksByProductId,
  setProductPacks,
};
