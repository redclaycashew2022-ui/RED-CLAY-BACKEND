const { pool, getProductsTable, getProductPacksTable } = require("../db");

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
  const table = getProductPacksTable();
  if (!table) return [];

  const res = await pool.query(
    `SELECT * FROM ${table} WHERE product_id = $1 ORDER BY price ASC`,
    [product_id]
  );
  return res.rows;
};



const setProductPacks = async (product_id, sizesArr) => {
  const table = getProductPacksTable();
  if (!table) return;

  await pool.query(`DELETE FROM ${table} WHERE product_id = $1`, [product_id]);
  for (const s of sizesArr) {
    await addProductPack(product_id, s.pack_size, s.price, s.mrp_price);
  }
};



const getAllPremiumCashews = async () => {
  const query = `
    SELECT * FROM premium_cashews
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};


module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsBySearch,
  addProductPack,
  getProductPacksByProductId,
  setProductPacks,
  getAllPremiumCashews
};