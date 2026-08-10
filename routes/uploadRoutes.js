const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");
// const { upload } = require("../config.js/multer");
const { upload } = require('../middleware/cloudinaryUpload');

router.post('/upload-image', isAdmin, (req, res, next) => {
  console.log('Route hit');
  console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API key:', process.env.CLOUDINARY_API_KEY);

  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('UPLOAD ERROR =>', err);
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, (req, res) => {
  try {
    console.log('FILE =>', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = req.file.path;

    res.json({
      success: true,
      url: imageUrl,
      fullUrl: imageUrl,
      filename: req.file.filename || null,
    });
  } catch (err) {
    console.error('FINAL ERROR =>', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

module.exports = router;
