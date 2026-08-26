

const {
  pool,
  getUsersTable,
  normalizePhone,
} = require("../db");



const addAddress = async (data) => {
  const table = getUsersTable();
  const phone = normalizePhone(data.phone);

  const userRes = await pool.query(
    `SELECT id FROM users WHERE phone_number = $1`,
    [phone]
  );

  const user_id = userRes.rows[0]?.id || null;

  // 2. Insert address with user_id
  const res = await pool.query(
    `INSERT INTO address
    (user_id, first_name, last_name, phone, address, apartment, city, state, pincode, country)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      user_id,
      data.first_name,
      data.last_name,
      phone,
      data.address,
      data.apartment,
      data.city,
      data.state,
      data.pincode,
      data.country,
    ]
  );

  return res.rows[0];
};


const getUserAddresses = async (user_id) => {
  const res = await pool.query(
    `SELECT * FROM address WHERE user_id = $1 ORDER BY created_at DESC`,
    [user_id]
  );
  return res.rows;
};


// DELETE ADDRESS
const deleteAddress = async (id) => {
  await pool.query(`DELETE FROM address WHERE id = $1`, [id]);
};


module.exports = {
  addAddress,
  getUserAddresses,
  deleteAddress,
};