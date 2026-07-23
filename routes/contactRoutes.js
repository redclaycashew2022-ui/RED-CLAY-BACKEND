const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

const {
  addContactMessage,
  getAllContactMessages,
  deleteContactMessage,
} = require("../db/contact.db");

router.post("/contact", async (req, res) => {
  try {
    const { name, whatsapp_number, email, message } = req.body;
    if (!name || !whatsapp_number || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const saved = await addContactMessage({ name, whatsapp_number, email, message });
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Contact submit error:", err);
    res.status(500).json({ message: "Failed to submit message" });
  }
});

router.get("/contact", isAdmin, async (req, res) => {
  try {
    const data = await getAllContactMessages();
    res.json(data);
  } catch (err) {
    console.error("Get contact messages error:", err);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

router.delete("/contact/:id", isAdmin, async (req, res) => {
  try {
    await deleteContactMessage(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

module.exports = router;
