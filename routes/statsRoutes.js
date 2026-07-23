const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

const { getOrderStats } = require("../db/order.db");
const { getUserCount } = require("../db/auth.db");

router.get("/admin/stats", isAdmin, async (req, res) => {
  try {
    const [{ totalOrders, revenue }, totalUsers] = await Promise.all([
      getOrderStats(),
      getUserCount(),
    ]);

    res.json({
      totalOrders,
      revenue,
      totalUsers,
    });
  } catch (err) {
    console.error("Get admin stats error:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

module.exports = router;
