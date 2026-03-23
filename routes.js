const express = require("express");
const router = express.Router();
const twilio = require("twilio");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const keywordMapping = {
  "dry fruits": "dry fruits",
  "dryfruit online": "dry fruits",
  "dry fruits shop": "dry fruits",
  "mixed dry fruits": "dry fruits",
  "premium dry fruits": "dry fruits",
  "healthy dry fruits": "dry fruits",
  "cashews": "cashew",
  "cashew nuts": "cashew",
  "kaju": "cashew",
  "cashew dry fruit": "cashew",
  "raw cashews": "raw cashew",
  "roasted cashews": "roasted cashew",
  "salted cashews": "salted cashew",
  "plain cashews": "plain cashew",
  "organic cashews": "organic cashew",
  "redclay cashews": "cashew",
  "redclay dry fruits": "dry fruits",
  "red clay cashew nuts": "cashew",
  "redclay kaju": "cashew",
  "redclay cashews online": "cashew",
  "buy cashews online": "cashew",
  "cashews price": "cashew",
  "cashew nuts 1kg price": "cashew",
  "best cashews online": "cashew",
  "premium cashews": "cashew",
  "fresh cashews": "cashew",
  "cashews home delivery": "cashew",
  "healthy snacks": "dry fruits",
  "protein dry fruits": "dry fruits",
  "dry fruits for weight gain": "dry fruits",
  "dry fruits for kids": "dry fruits",
  "dry fruits for gifting": "dry fruits",
  "kaju online": "cashew",
  "kaju price today": "cashew",
  "best kaju brand": "cashew",
  "cashew shop near me": "cashew"
}

const categoryData = {
  mainCategories: [
    { label: "Seeds", value: "Seeds" },
    { label: "Nuts", value: "Nuts" },
    { label: "Fruits", value: "Fruits" },
  ],

  subCategories: {
    Nuts: [
      { label: "Cashew Nuts (Mundhiri)", value: "Cashew Nuts (Mundhiri)" },
      { label: "Almonds (Badam)", value: "Almonds (Badam)" },
      { label: "Pistachios (Pista)", value: "Pistachios (Pista)" },
    ],
    Seeds: [
      { label: "Pumpkin Seeds", value: "Pumpkin Seeds" },
      { label: "Sunflower Seeds", value: "Sunflower Seeds" },
      { label: "Chia Seeds", value: "Chia Seeds" },
      { label: "Watermelon Seeds", value: "Watermelon Seeds" },
      { label: "Basil Seeds (Sabja)", value: "Basil Seeds (Sabja)" },
      { label: "Cucumber Seeds", value: "Cucumber Seeds" },
    ],
    Fruits: [
      { label: "Dates", value: "Dates" },
      {
        label: "Athipazham (Fig / Anjeer)",
        value: "Athipazham (Fig / Anjeer)",
      },
      { label: "Black Raisins", value: "Black Raisins" },
      {
        label: "Golden Raisins (Seedless Raisins)",
        value: "Golden Raisins (Seedless Raisins)",
      },
    ],
  },
};

const {
  upsertUserOTP,
  getUserByPhone,
  clearOTP,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  setProductPacks,
  getProductPacksByProductId,
  getProductsBySearch,
  addPremiumCashew,
  getAllPremiumCashews,
  getPremiumCashewById,
  updatePremiumCashew,
  deletePremiumCashew,
  updatePremiumCashewOrder,
  getAllExportPremiumCashews,
  getExportPremiumCashewById,
  addExportPremiumCashew,
  updateExportPremiumCashew,
  deleteExportPremiumCashew,
  addAddress,
  getUserAddresses,
  deleteAddress,
  createOrder,
  getAllOrders,
  deleteOrder




} = require("./db");

const uploadDir = path.join(__dirname, "uploadimage");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created uploadimage directory:", uploadDir);
}

router.use("/uploadimage", express.static(uploadDir));

const isAdmin = async (req, res, next) => {
  try {
    const phone =
      req.headers["x-phone-number"] ||
      req.body.phone_number ||
      req.body.phoneNumber ||
      req.body.phone;
    if (!phone)
      return res.status(401).json({ message: "Admin phone required" });

    const user = await getUserByPhone(phone);
    if (!user || user.user_type !== "admin") {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    next();
  } catch (err) {
    console.error("isAdmin middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.\-\_]/gi, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

router.post("/request-otp", async (req, res) => {
  const phone_number = req.body.phone_number || req.body.phoneNumber;
  if (!phone_number)
    return res.status(400).json({ message: "Phone number required" });

  const otp = generateOTP();
  const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

  try {
    const user = await upsertUserOTP(phone_number, otp, otp_expiry);

    try {
      await client.messages.create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone_number,
      });
    } catch (twErr) {
      console.error("Twilio send error:", twErr);
      return res
        .status(500)
        .json({ message: `Twilio error: ${twErr.message || twErr}` });
    }

    res.json({ message: "OTP sent", user_type: user.user_type });
  } catch (err) {
    console.error("Request OTP error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const phone_number =
    req.body.phone_number || req.body.phoneNumber || req.body.phone;
  const sentOtp = req.body.otp || req.body.OTP || req.body.code;

  if (!phone_number || !sentOtp)
    return res.status(400).json({ message: "Phone and OTP required" });

  try {
    const user = await getUserByPhone(phone_number);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== sentOtp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (user.otp_expiry && new Date() > user.otp_expiry)
      return res.status(400).json({ message: "OTP expired" });

    await clearOTP(phone_number);

    res.json({
      success: true,
      message: "OTP verified",
      user: {
        phone_number: user.phone_number,
        user_type: user.user_type,
        id: user.id,
      },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

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

router.post("/upload-image", isAdmin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("✅ File uploaded:", {
      filename: req.file.filename,
      size: (req.file.size / 1024).toFixed(2) + " KB",
      mimetype: req.file.mimetype,
      path: req.file.path,
    });

    if (!fs.existsSync(req.file.path)) {
      console.error("❌ File not found after upload:", req.file.path);
      return res
        .status(500)
        .json({ message: "File upload failed - file not saved" });
    }

    const protocol = req.protocol;
    const host = req.get("host");
    const relativeUrl = `/uploadimage/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.json({
      success: true,
      url: relativeUrl,
      fullUrl: fullUrl,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: err.message || "Upload failed" });
  }
});

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

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    uploadDir: uploadDir,
    uploadDirExists: fs.existsSync(uploadDir),
  });
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

// GET single premium cashew by ID
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

// POST create new premium cashew (admin only)
  router.post("/premium-cashews", isAdmin, async (req, res) => {
      console.log("Premium cashew route hit");
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

// PUT update premium cashew (admin only)
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

// DELETE premium cashew (admin only) - Hard delete
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


// POST update display order (bulk update for drag and drop)
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

// GET active premium cashews only (for home page)
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

// POST create new premium cashew (admin only)
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


router.post("/address", async (req, res) => {
  try {
    const address = await addAddress(req.body);
    res.json({ success: true, data: address });
  } catch (err) {
    console.error(err); // ✅ correct
    res.status(500).json({ message: "Failed to add address" });
  }
});

router.get("/address/:user_id", async (req, res) => {
  try {
    const data = await getUserAddresses(req.params.user_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

router.delete("/address/:id", async (req, res) => {
  try {
    await deleteAddress(req.params.id);
    res.json({ message: "Address deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


router.post("/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order failed" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const data = await getAllOrders();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    await deleteOrder(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


module.exports = router;

