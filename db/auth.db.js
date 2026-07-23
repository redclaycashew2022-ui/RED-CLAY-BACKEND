const { pool, normalizePhone, ADMIN_PHONES, getUsersTable } = require("../db");

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

const getUserCount = async () => {
  const table = getUsersTable();
  const res = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return parseInt(res.rows[0].count, 10);
};


module.exports = {
  upsertUserOTP,
  getUserByPhone,
  clearOTP,
  getUserCount,
};
