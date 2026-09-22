const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
const { sendCustomerWhatsApp, sendAdminWhatsApp } = require("../services/twilioService");
const {
  buildCustomerStatusTemplate,
  buildNewOrderAdminTemplateVars,
  buildNewOrderCustomerTemplateVars,
} = require("../utils/notificationTemplates");

const {
  createOrder,
  getAllOrders,
  getOrdersByPhone,
  getOrderById,
  deleteOrder,
  updateOrderStatus
} = require("../db/order.db");

// Approved WhatsApp Content Template SIDs for the initial order-confirmation message
const ADMIN_ORDER_TEMPLATE_SID = "HX03974c2a91d6f3e023a7da10945e4471"; // order_confirmation_admin_v3
const CUSTOMER_ORDER_TEMPLATE_SID = "HX0b007913ed03ec67bb95fa548877cb25"; // order_confirmation_customer_v2

router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);

    let adminNotified = false;
    let customerNotified = false;
    let notifyError = null;
    try {
      const fullOrder = await getOrderById(order.id);

      const [adminResult, customerResult] = await Promise.allSettled([
        sendAdminWhatsApp({
          contentSid: ADMIN_ORDER_TEMPLATE_SID,
          contentVariables: JSON.stringify(buildNewOrderAdminTemplateVars(fullOrder)),
        }),
        sendCustomerWhatsApp(fullOrder.phone, {
          contentSid: CUSTOMER_ORDER_TEMPLATE_SID,
          contentVariables: JSON.stringify(buildNewOrderCustomerTemplateVars(fullOrder)),
        }),
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

    let notified = false;
    let notifyError = null;
    try {
      const fullOrder = await getOrderById(order.id);
      const template = buildCustomerStatusTemplate(order.order_status, fullOrder);
      if (fullOrder && template) {
        await sendCustomerWhatsApp(fullOrder.phone, template);
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