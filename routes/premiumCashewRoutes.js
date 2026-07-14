const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;

const {

  getAllPremiumCashews,
  getPremiumCashewById,
  addPremiumCashew,
  updatePremiumCashew,
  deletePremiumCashew,
  updatePremiumCashewOrder
} = require("../db/premiumCashew.db");

// GET all premium cashews (public - no admin required)
router.get("/premium-cashews", async (req, res) => {
  try {
    const products = await getAllPremiumCashews();
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error("Get premium cashews error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch premium cashews" 
    });
  }
});


router.get("/premium-cashews/:id", async (req, res) => {
  try {
    const product = await getPremiumCashewById(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    console.error("Get premium cashew error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch premium cashew" 
    });
  }
});


  router.post("/premium-cashews", isAdmin, async (req, res) => {
      console.log("Premium cashew route hit");
      console.log("Request body:", req.body);
    try {
      const { name, size, price } = req.body;
      
      console.log("Received request to add premium cashew:", { name, size, price });

      // Validation
      if (!name || !size || !price) {
        return res.status(400).json({ 
          success: false, 
          message: "Name, size, and price are required" 
        });
      }

      // Validate price
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Price must be a positive number" 
        });
      }

      const product = await addPremiumCashew({
        name: name.trim(),
        size: size.trim(),
        price: priceNum
      });

      console.log("Product added successfully:", product);

      res.status(201).json({
        success: true,
        message: "Premium cashew added successfully",
        data: product
      });
    } catch (err) {
      console.error("Add premium cashew error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to add premium cashew: " + err.message 
      });
    }
  });

  router.put("/premium-cashews/:id", isAdmin, async (req, res) => {
  try {
    const { name, size, price, display_order, is_active } = req.body;
    
    // Check if product exists
    const existing = await getPremiumCashewById(req.params.id);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    // Validate price if provided
    if (price !== undefined && (isNaN(price) || price <= 0)) {
      return res.status(400).json({ 
        success: false, 
        message: "Price must be a positive number" 
      });
    }

    const product = await updatePremiumCashew(req.params.id, {
      name,
      size,
      price,
      display_order,
      is_active
    });

    res.json({
      success: true,
      message: "Premium cashew updated successfully",
      data: product
    });
  } catch (err) {
    console.error("Update premium cashew error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update premium cashew" 
    });
  }
});


router.delete("/premium-cashews/:id", isAdmin, async (req, res) => {
  try {
    // Check if product exists
    const existing = await getPremiumCashewById(req.params.id);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    await deletePremiumCashew(req.params.id);

    res.json({
      success: true,
      message: "Premium cashew deleted successfully"
    });
  } catch (err) {
    console.error("Delete premium cashew error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete premium cashew" 
    });
  }
});


router.post("/premium-cashews/reorder", isAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Items array is required" 
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.id || item.display_order === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: "Each item must have id and display_order" 
        });
      }
    }

    await updatePremiumCashewOrder(items);

    res.json({
      success: true,
      message: "Display order updated successfully"
    });
  } catch (err) {
    console.error("Reorder premium cashews error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update display order" 
    });
  }
});


router.get("/premium-cashews/active", async (req, res) => {
  try {
    const allProducts = await getAllPremiumCashews();
    const activeProducts = allProducts.filter(p => p.is_active);
    res.json({
      success: true,
      data: activeProducts
    });
  } catch (err) {
    console.error("Get active premium cashews error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch active premium cashews" 
    });
  }
});


module.exports = router;
