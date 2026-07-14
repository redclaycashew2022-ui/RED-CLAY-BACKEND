const { pool } = require("../db");


// Premium Cashews table functions
const createPremiumCashewsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS premium_cashews (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      size VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    console.log("✅ premium_cashews table ready");
  } catch (err) {
    console.error("Error creating premium_cashews table:", err);
  }
};

// Call this when your server starts
createPremiumCashewsTable();


const getAllPremiumCashews = async () => {
  const query = `
    SELECT * FROM premium_cashews
    ORDER BY display_order ASC, created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};


const getPremiumCashewById = async (id) => {
  const query = 'SELECT * FROM premium_cashews WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Add new premium cashew
const addPremiumCashew = async (product) => {
  try {
    const { name, size, price } = product;

    // Convert price to number and validate
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new Error("Invalid price value");
    }

    console.log("Adding premium cashew:", { name, size, price: priceNum });

    const query = `
      INSERT INTO premium_cashews (name, size, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [name, size, priceNum]);

    console.log("Premium cashew added successfully:", result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error("Error in addPremiumCashew:", err);
    throw err;
  }
};


// Update a premium cashew's fields
const updatePremiumCashew = async (id, product) => {
  const { name, size, price, display_order, is_active } = product;
  let query = `UPDATE premium_cashews SET updated_at = CURRENT_TIMESTAMP`;
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    query += `, name = $${paramCount}`;
    values.push(name);
    paramCount++;
  }
  if (size !== undefined) {
    query += `, size = $${paramCount}`;
    values.push(size);
    paramCount++;
  }
  if (price !== undefined) {
    query += `, price = $${paramCount}`;
    values.push(price);
    paramCount++;
  }
  if (display_order !== undefined) {
    query += `, display_order = $${paramCount}`;
    values.push(display_order);
    paramCount++;
  }
  if (is_active !== undefined) {
    query += `, is_active = $${paramCount}`;
    values.push(is_active);
    paramCount++;
  }

  query += ` WHERE id = $${paramCount} RETURNING *`;
  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0];
};


// Update display order (for drag and drop reordering)
const updatePremiumCashewOrder = async (items) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        'UPDATE premium_cashews SET display_order = $1 WHERE id = $2',
        [item.display_order, item.id]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Delete premium cashew (hard delete)
const deletePremiumCashew = async (id) => {
  const query = 'DELETE FROM premium_cashews WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};


module.exports = {
  getAllPremiumCashews,
  addPremiumCashew,
  getPremiumCashewById,
  updatePremiumCashew,
  updatePremiumCashewOrder,
  deletePremiumCashew
};
