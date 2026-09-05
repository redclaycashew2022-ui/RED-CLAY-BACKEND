// const express = require("express");
// const router = express.Router();

// const isAdmin = require("../middleware/isAdmin");
// const { sendCustomerWhatsApp } = require("../services/twilioService");
// const { buildCustomerStatusMessage } = require("../utils/notificationTemplates");

// const {
//   createOrder,
//   getAllOrders,
//   getOrdersByPhone,
//   getOrderById,
//   deleteOrder,
//   updateOrderStatus
// } = require("../db/order.db");

// router.post("/orders", async (req, res) => {
//   try {
//     const order = await createOrder(req.body);
//     res.json({ success: true, data: order });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Order failed" });
//   }
// });

// router.get("/orders", isAdmin, async (req, res) => {
//   try {
//     const data = await getAllOrders();
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ message: "Error" });
//   }
// });

// router.get("/orders/user/:phone", async (req, res) => {
//   try {
//     const data = await getOrdersByPhone(req.params.phone);
//     res.json(data);
//   } catch (err) {
//     console.error("Get user orders error:", err);
//     res.status(500).json({ message: "Error fetching orders" });
//   }
// });

// router.put("/orders/:id/status", isAdmin, async (req, res) => {
//   try {
//     const order = await updateOrderStatus(req.params.id, req.body.status);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // Notify the customer over WhatsApp. Failure to notify must not fail the
//     // status update itself — the order status is already persisted — but we
//     // report it back so the admin panel can surface the exact reason.
//     let notified = false;
//     let notifyError = null;
//     try {
//       const fullOrder = await getOrderById(order.id);
//       const message = buildCustomerStatusMessage(order.order_status, fullOrder);
//       if (fullOrder && message) {
//         await sendCustomerWhatsApp(fullOrder.phone, message);
//         notified = true;
//       }
//     } catch (err) {
//       notifyError = err.message || "Unknown Twilio error";
//       console.error(`WhatsApp status notification failed for order #${order.id}: ${notifyError}`);
//     }

//     res.json({ success: true, data: order, whatsapp: { notified, error: notifyError } });
//   } catch (err) {
//     console.error("Update order status error:", err);
//     res.status(400).json({ message: err.message || "Failed to update status" });
//   }
// });

// router.delete("/orders/:id", isAdmin, async (req, res) => {
//   try {
//     await deleteOrder(req.params.id);
//     res.json({ message: "Order deleted" });
//   } catch (err) {
//     res.status(500).json({ message: "Error" });
//   }
// });


// module.exports = router;


const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
const { sendCustomerWhatsApp, sendAdminWhatsApp } = require("../services/twilioService");
const {
  buildCustomerStatusMessage,
  buildNewOrderAdminMessage,
  buildNewOrderCustomerMessage,
} = require("../utils/notificationTemplates");

const {
  createOrder,
  getAllOrders,
  getOrdersByPhone,
  getOrderById,
  deleteOrder,
  updateOrderStatus
} = require("../db/order.db");

router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);

    // Notify admin + customer over WhatsApp. This must never fail the order
    // creation itself — the order is already persisted — so we report the
    // notification outcome separately instead of throwing.
    let adminNotified = false;
    let customerNotified = false;
    let notifyError = null;
    try {
      const fullOrder = await getOrderById(order.id);
      const adminMessage = buildNewOrderAdminMessage(fullOrder);
      const customerMessage = buildNewOrderCustomerMessage(fullOrder);

      const [adminResult, customerResult] = await Promise.allSettled([
        sendAdminWhatsApp(adminMessage),
        sendCustomerWhatsApp(fullOrder.phone, customerMessage),
      ]);

      adminNotified = adminResult.status === "fulfilled";
      customerNotified = customerResult.status === "fulfilled";

      if (!adminNotified) console.error(`Admin WhatsApp notify failed for order #${order.id}:`, adminResult.reason?.message);
      if (!customerNotified) console.error(`Customer WhatsApp notify failed for order #${order.id}:`, customerResult.reason?.message);
    } catch (err) {
      notifyError = err.message || "Unknown Twilio error";
      console.error(`WhatsApp new-order notification failed for order #${order.id}: ${notifyError}`);
    }

    res.json({
      success: true,
      data: order,
      whatsapp: { adminNotified, customerNotified, error: notifyError },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order failed" });
  }
});

router.get("/orders", isAdmin, async (req, res) => {
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

    // Notify the customer over WhatsApp. Failure to notify must not fail the
    // status update itself — the order status is already persisted — but we
    // report it back so the admin panel can surface the exact reason.
    let notified = false;
    let notifyError = null;
    try {
      const fullOrder = await getOrderById(order.id);
      const message = buildCustomerStatusMessage(order.order_status, fullOrder);
      if (fullOrder && message) {
        await sendCustomerWhatsApp(fullOrder.phone, message);
        notified = true;
      }
    } catch (err) {
      notifyError = err.message || "Unknown Twilio error";
      console.error(`WhatsApp status notification failed for order #${order.id}: ${notifyError}`);
    }

    res.json({ success: true, data: order, whatsapp: { notified, error: notifyError } });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(400).json({ message: err.message || "Failed to update status" });
  }
});

router.delete("/orders/:id", isAdmin, async (req, res) => {
  try {
    await deleteOrder(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


module.exports = router;