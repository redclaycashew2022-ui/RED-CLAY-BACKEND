const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { initDB } = require("./db");
const apiRoutes = require("./routes");

const app = express();
const fs = require("fs");
const path = require("path");

const uploadImageDir = path.join(__dirname, "uploadimage");
if (!fs.existsSync(uploadImageDir))
  fs.mkdirSync(uploadImageDir, { recursive: true });
app.use("/uploadimage", express.static(uploadImageDir));

app.use(
  cors({
    origin: ["http://localhost:3000", 
             "http://localhost:5173",
             "https://red-clay-backend.onrender.com",
             "https://dapper-granita-57cda0.netlify.app",
             "https://redclaycashews.netlify.app",
             "https://redclaycashews.com"], 
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-phone-number"],
  })
);
app.use(bodyParser.json());

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDB();
    console.log("✅ Database tables initialized");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  }
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
};

startServer();