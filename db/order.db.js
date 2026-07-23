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
        (order_id, product_id, product_name, size, price, quantity, product_image)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          item.product_id,
          item.name,
          item.size,
          item.price,
          item.quantity,
          item.image || null,
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

// GET ORDERS FOR A SPECIFIC USER (by phone, via their addresses)
const getOrdersByPhone = async (phone) => {
  const res = await pool.query(
    `
    SELECT
      o.id, o.total_amount, o.payment_method, o.payment_status,
      o.order_status, o.razorpay_payment_id, o.created_at,
      a.first_name, a.last_name, a.phone, a.address, a.city, a.state, a.pincode,
      COALESCE(
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'name', oi.product_name,
            'size', oi.size,
            'price', oi.price,
            'quantity', oi.quantity,
            'image', oi.product_image
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    JOIN address a ON o.address_id = a.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE a.phone = $1
    GROUP BY o.id, a.id
    ORDER BY o.created_at DESC
    `,
    [phone]
  );

  return res.rows;
};

// DELETE ORDER
const deleteOrder = async (id) => {
  await pool.query(`DELETE FROM orders WHERE id = $1`, [id]);
};

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "on_the_way", "delivered"];

// UPDATE ORDER STATUS
const updateOrderStatus = async (id, status) => {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid order status: ${status}`);
  }
  const res = await pool.query(
    `UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return res.rows[0] || null;
};

// GET ORDER COUNT + REVENUE (from paid orders)
const getOrderStats = async () => {
  const res = await pool.query(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
    FROM orders
  `);
  const row = res.rows[0];
  return {
    totalOrders: parseInt(row.total_orders, 10),
    revenue: parseFloat(row.revenue),
  };
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrdersByPhone,
  deleteOrder,
  updateOrderStatus,
  getOrderStats,
  ORDER_STATUSES,
};