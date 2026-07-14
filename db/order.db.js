const { pool } = require("../db");

const createOrder = async (data) => {
  const {
    user_id, address_id, total_amount, payment_method, items,
    payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature,
  } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `INSERT INTO orders
        (user_id, address_id, total_amount, payment_method,
         payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        user_id, address_id, total_amount, payment_method,
        payment_status || "pending", razorpay_order_id || null,
        razorpay_payment_id || null, razorpay_signature || null,
      ]
    );

    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items 
        (order_id, product_id, product_name, size, price, quantity)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          order.id,
          item.product_id,
          item.name,
          item.size,
          item.price,
          item.quantity,
        ]
      );
    }

    await client.query("COMMIT");

    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};


// GET ALL ORDERS
const getAllOrders = async () => {
  const res = await pool.query(`
    SELECT o.*, a.first_name, a.address, a.city, a.state, a.pincode
    FROM orders o
    LEFT JOIN address a ON o.address_id = a.id
    ORDER BY o.created_at DESC
  `);

  return res.rows;
};

// DELETE ORDER
const deleteOrder = async (id) => {
  await pool.query(`DELETE FROM orders WHERE id = $1`, [id]);
};


module.exports = {
  createOrder,
  getAllOrders,
  deleteOrder,
};