const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;

const {
  createOrder,
  getAllOrders,
  getOrdersByPhone,
  deleteOrder,
  updateOrderStatus
} = require("../db/order.db");

router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order failed" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const data = await getAllOrders();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

router.get("/orders/user/:phone", async (req, res) => {
  try {
    const data = await getOrdersByPhone(req.params.phone);
    res.json(data);
  } catch (err) {
    console.error("Get user orders error:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

router.put("/orders/:id/status", isAdmin, async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(400).json({ message: err.message || "Failed to update status" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    await deleteOrder(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


module.exports = router;
