const { pool } = require("../db");

const getAllExportPremiumCashews = async () => {
  const query = `
    SELECT * FROM export_premiumcashew 
    WHERE is_active = true 
    ORDER BY display_order ASC, created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};


const getExportPremiumCashewById = async (id) => {
  const query = 'SELECT * FROM export_premiumcashew WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};


const addExportPremiumCashew = async (product) => {
  try {
    const { name, size, price } = product;
    
    // Convert price to number and validate
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new Error("Invalid price value");
    }

    console.log("Adding premium cashew:", { name, size, price: priceNum });

    const query = `
      INSERT INTO export_premiumcashew (name, size, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, size, priceNum]);
    
    console.log("Premium cashew added successfully:", result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error("Error in addExportPremiumCashew:", err);
    throw err;
  }
};


const updateExportPremiumCashew = async (id, product) => {
  const { name, size, price, is_active } = product;
  let query = `
    UPDATE export_premiumcashew 
    SET updated_at = CURRENT_TIMESTAMP
  `;
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
  

const deleteExportPremiumCashew = async (id) => {
  const query = 'DELETE FROM export_premiumcashew WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};


module.exports = {
  getAllExportPremiumCashews,
  getExportPremiumCashewById,
  addExportPremiumCashew,
  updateExportPremiumCashew,
  deleteExportPremiumCashew
};