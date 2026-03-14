const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const pool = require("./database");
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
    origin: ["http://localhost:3000", "http://localhost:5173"], // Add your frontend URL
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
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
