const { pool } = require("../db");

const addContactMessage = async (data) => {
  const res = await pool.query(
    `INSERT INTO contact_messages (name, whatsapp_number, email, message)
    VALUES ($1,$2,$3,$4)
    RETURNING *`,
    [data.name, data.whatsapp_number, data.email, data.message]
  );
  return res.rows[0];
};

const getAllContactMessages = async () => {
  const res = await pool.query(
    `SELECT * FROM contact_messages ORDER BY created_at DESC`
  );
  return res.rows;
};

const deleteContactMessage = async (id) => {
  await pool.query(`DELETE FROM contact_messages WHERE id = $1`, [id]);
};

module.exports = {
  addContactMessage,
  getAllContactMessages,
  deleteContactMessage,
};
