const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
const { upload } = require("../config.js/multer");

router.post("/upload-image", isAdmin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      success: true,
      url: req.file.path,
      fullUrl: req.file.path,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: err.message || "Upload failed" });
  }
});

module.exports = router;
