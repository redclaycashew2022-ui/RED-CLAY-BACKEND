const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const razorpay = require("../config.js/razorpay");
const { createOrder, getOrderById } = require("../db/order.db");
const { sendAdminWhatsApp, sendCustomerWhatsApp } = require("../services/twilioService");
const { buildNewOrderAdminMessage, buildNewOrderCustomerMessage } = require("../utils/notificationTemplates");

// Create a Razorpay order for the given cart total
router.post("/payments/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
});

// Verify the payment signature, then persist the order
router.post("/payments/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order: orderData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderData) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const order = await createOrder({
      ...orderData,
      payment_method: "online",
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    // Notify admin + customer over WhatsApp now that payment is verified and
    // the order is saved. Notification failure must not fail the payment
    // response — the customer's order already succeeded — but we report it
    // back so the failure isn't silent.
    let adminNotified = false;
    let notifyError = null;
    let customerNotified = false;
    let customerNotifyError = null;

    const fullOrder = await getOrderById(order.id);
    if (fullOrder) {
      try {
        await sendAdminWhatsApp(buildNewOrderAdminMessage(fullOrder));
        adminNotified = true;
      } catch (err) {
        notifyError = err.message || "Unknown Twilio error";
        console.error(`Admin WhatsApp notification failed for order #${order.id}: ${notifyError}`);
      }

      try {
        await sendCustomerWhatsApp(fullOrder.phone, buildNewOrderCustomerMessage(fullOrder));
        customerNotified = true;
      } catch (err) {
        customerNotifyError = err.message || "Unknown Twilio error";
        console.error(`Customer WhatsApp notification failed for order #${order.id}: ${customerNotifyError}`);
      }
    }

    res.json({
      success: true,
      data: order,
      whatsapp: {
        adminNotified,
        error: notifyError,
        customerNotified,
        customerError: customerNotifyError,
      },
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

module.exports = router;
