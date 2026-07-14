const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;

const {
  createOrder,
  getAllOrders,
  deleteOrder
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

router.delete("/orders/:id", async (req, res) => {
  try {
    await deleteOrder(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


module.exports = router;
