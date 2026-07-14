const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;


router.get("/api/categories/main", (req, res) => {
  res.json({
    success: true,
    mainCategories: categoryData.mainCategories,
  });
});


router.get("/api/categories/sub", (req, res) => {
  const { maincategory } = req.query;

  if (!maincategory) {
    return res.status(400).json({
      success: false,
      message: "Main category is required",
    });
  }

  const subs = categoryData.subCategories[maincategory] || [];

  res.json({
    success: true,
    subCategories: subs,
  });
});


module.exports = router;
