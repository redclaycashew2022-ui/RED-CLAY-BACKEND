const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;


const {
  getAllExportPremiumCashews,
  getExportPremiumCashewById,
  addExportPremiumCashew,
  updateExportPremiumCashew,
  deleteExportPremiumCashew
} = require("../db/exportPremiumCashew.db");

router.get("/export-premium-cashews", async (req, res) => {
  try {
    const rows = await getAllExportPremiumCashews();
    // Group by name
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.name]) {
        grouped[row.name] = {
          name: row.name,
          sizes: [],
          ids: [],
        };
      }
      grouped[row.name].sizes.push({ size: row.size, price: row.price, id: row.id });
      grouped[row.name].ids.push(row.id);
    }
    const products = Object.values(grouped);
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


router.get("/export-premium-cashews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing product id"
      });
    }
    // Find the row by id
    const row = await getExportPremiumCashewById(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    // Find all rows with same name
    const allRows = await getAllExportPremiumCashews();
    const sizes = allRows
      .filter(r => r.name === row.name)
      .map(r => ({ size: r.size, price: r.price, id: r.id }));
    res.json({
      success: true,
      data: {
        name: row.name,
        sizes,
        ids: sizes.map(s => s.id),
      }
    });
  } catch (err) {
    console.error("Get premium cashew error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch premium cashew"
    });
  }
});


  router.post("/export-premium-cashews", isAdmin, async (req, res) => {
  console.log("Premium cashew route hit");
  try {
    const { name, sizes } = req.body;
    console.log("Received request to add export premium cashew:", { name, sizes });

    // Validation
    if (!name || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name and at least one size/price are required"
      });
    }

    // Validate each size/price
    for (const s of sizes) {
      if (!s.size || !s.price) {
        return res.status(400).json({
          success: false,
          message: "Each size and price are required"
        });
      }
      const priceNum = parseFloat(s.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a positive number"
        });
      }
    }

    // Insert all sizes
    const addedProducts = [];
    for (const s of sizes) {
      const product = await addExportPremiumCashew({
        name: name.trim(),
        size: s.size.trim(),
        price: parseFloat(s.price)
      });
      addedProducts.push(product);
    }

    console.log("Export products added successfully:", addedProducts);

    res.status(201).json({
      success: true,
      message: "Export premium cashew(s) added successfully",
      data: addedProducts
    });
  } catch (err) {
    console.error("Add export premium cashew error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add export premium cashew: " + err.message
    });
  }
});

  router.put("/export-premium-cashews/:id", isAdmin, async (req, res) => {
  try {
    const { name, sizes } = req.body;
    // Check if product exists
    const existing = await getExportPremiumCashewById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Validate sizes array
    if (!name || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name and at least one size/price are required"
      });
    }
    for (const s of sizes) {
      if (!s.size || !s.price) {
        return res.status(400).json({
          success: false,
          message: "Each size and price are required"
        });
      }
      const priceNum = parseFloat(s.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a positive number"
        });
      }
    }

    // Update the current row to the first size
    const firstSize = sizes[0];
    const updated = await updateExportPremiumCashew(req.params.id, {
      name,
      size: firstSize.size,
      price: firstSize.price,
      is_active: existing.is_active,
      display_order: existing.display_order
    });

    // Delete other sizes for this product name except current id
    const allRows = await getAllExportPremiumCashews();
    const otherIds = allRows
      .filter(r => r.name === name && r.id !== Number(req.params.id))
      .map(r => r.id);
    for (const oid of otherIds) {
      await deleteExportPremiumCashew(oid);
    }

    // Insert new sizes (except the first, which is already updated)
    for (let i = 1; i < sizes.length; i++) {
      await addExportPremiumCashew({
        name,
        size: sizes[i].size,
        price: sizes[i].price
      });
    }

    res.json({
      success: true,
      message: "Premium cashew updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("Update premium cashew error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update premium cashew"
    });
  }
});


router.delete("/export-premium-cashews/:id", isAdmin, async (req, res) => {
  try {
    // Check if product exists
    const existing = await getExportPremiumCashewById(req.params.id);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    await deleteExportPremiumCashew(req.params.id);

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


module.exports = router;
