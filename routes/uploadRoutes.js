const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
// const { upload } = require("../config.js/multer");
const { upload } = require('../middleware/cloudinaryUpload');

router.post("/upload-image", isAdmin, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("❌ Upload middleware error:", err);
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // const relativeUrl = `/uploadimage/${req.file.filename}`;

    const imageUrl = req.file.path;

    res.json({
      success: true,
      url: relativeUrl,
      fullUrl: relativeUrl,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: err.message || "Upload failed" });
  }
});

module.exports = router;
