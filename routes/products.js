const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const isAdmin = require("../middleware/isAdmin");
const keywordMapping = require("../constants/keywordMapping");

const{
  addProduct,
  getAllProducts,
  getProductsBySearch,
  getProductsByHomepageCollection,
  updateProduct,
  deleteProduct,
  getProductPacksByProductId,
  setProductPacks
} = require("../db/product.db");

router.get("/products", async (req, res) => {
  try {
    const products = await getAllProducts();
    const productsWithSizes = await Promise.all(
      products.map(async (p) => {
        const sizes = await getProductPacksByProductId(p.id);
        return { ...p, sizes };
      })
    );
    res.json(productsWithSizes);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});


router.post("/products", async (req, res, next) => {
  if (req.body && req.body.type === "allproducts") {
    try {
      const products = await getAllProducts();
      const productsWithSizes = await Promise.all(
        products.map(async (p) => {
          const sizes = await getProductPacksByProductId(p.id);
          return { ...p, sizes };
        })
      );
      return res.json(productsWithSizes);
    } catch (err) {
      console.error("Get all products (POST) error:", err);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  }
  next();
});


router.post("/products", isAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const { sizes = [], ...rest } = productData;
    const product = await addProduct(rest);
    if (product && product.id && Array.isArray(sizes)) {
      await setProductPacks(product.id, sizes);
      product.sizes = await getProductPacksByProductId(product.id);
    }
    res.json({ message: "Product added", product });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ message: err.message || "Failed to add product" });
  }
});


router.put("/products/:id", isAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const { sizes = [], ...rest } = productData;
    const product = await updateProduct(req.params.id, rest);
    if (product && product.id && Array.isArray(sizes)) {
      await setProductPacks(product.id, sizes);
      product.sizes = await getProductPacksByProductId(product.id);
    }
    res.json({ message: "Product updated", product });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: err.message || "Failed to update product" });
  }
});


router.delete("/products/:id", isAdmin, async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});


router.post("/products/search", async (req, res) => {
  try {
    const { keyword } = req.body;
    if (
      !keyword ||
      typeof keyword !== "string" ||
      keyword.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Missing or invalid search keyword" });
    }

    const normalized = keyword.trim().toLowerCase();
    let mapped = null;
    if (keywordMapping[normalized]) {
      mapped = keywordMapping[normalized];
    } else {
      mapped = Object.keys(keywordMapping).find(k => normalized.includes(k));
      if (mapped) mapped = keywordMapping[mapped];
    }

    try {
      fs.appendFileSync(
        path.join(__dirname, "search_keywords.log"),
        `${new Date().toISOString()} | ${keyword}\n`
      );
    } catch (logErr) {
      console.error("Failed to log search keyword:", logErr);
    }

    let products;
    if (mapped) {
      products = await getProductsBySearch(mapped);
    } else {
      products = await getProductsBySearch(keyword);
    }

    const withSizes = await Promise.all(
      products.map(async (p) => {
        const sizes = await getProductPacksByProductId(p.id);
        return { ...p, sizes };
      })
    );
    res.json(withSizes);
  } catch (err) {
    console.error("Unified product search error:", err);
    res.status(500).json({ message: "Failed to search products" });
  }
});


router.post("/products/by-subcategory", async (req, res) => {
  try {
    const { value, data } = req.body;
    if (value !== "subcategory" || !data) {
      return res.status(400).json({
        message: "Invalid payload. Use { value: 'subcategory', data: '...' }",
      });
    }

    const products = await getAllProducts();
    const filtered = products.filter(
      (p) =>
        typeof p.subcategory === "string" &&
        p.subcategory.toLowerCase().includes(data.toLowerCase())
    );
    const withSizes = await Promise.all(
      filtered.map(async (p) => {
        const sizes = await getProductPacksByProductId(p.id);
        return { ...p, sizes };
      })
    );
    res.json(withSizes);
  } catch (err) {
    console.error("Get products by subcategory error:", err);
    res.status(500).json({ message: "Failed to fetch products by subcategory" });
  }
});


router.post("/products/by-homepage-collection", async (req, res) => {
  try {
    const { value, data } = req.body;
    if (value !== "homepage_collection" || !data) {
      return res.status(400).json({
        message:
          "Invalid payload. Use { value: 'homepage_collection', data: '...' }",
      });
    }

    const filtered = await getProductsByHomepageCollection(data);
    const withSizes = await Promise.all(
      filtered.map(async (p) => {
        const sizes = await getProductPacksByProductId(p.id);
        return { ...p, sizes };
      })
    );
    res.json(withSizes);
  } catch (err) {
    console.error("Get products by homepage collection error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch products by homepage collection" });
  }
});


module.exports = router;
