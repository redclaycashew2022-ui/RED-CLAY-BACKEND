const express = require("express");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

module.exports = router;


const {
  addAddress,
  getUserAddresses,
  deleteAddress
} = require("../db/address.db");

router.post("/address", async (req, res) => {
  try {
    console.log("Incoming Address:", req.body); 

    const address = await addAddress(req.body);

    res.json({ success: true, data: address });
  } catch (err) {
    console.error("ADDRESS ERROR:", err); 
    res.status(500).json({ message: err.message || "Failed to add address" });
  }
});


router.get("/address/:phone", async (req, res) => {
  try {
    const { pool } = require("../db");
    const data = await pool.query(
      `SELECT * FROM address WHERE phone = $1 ORDER BY created_at DESC`,
      [req.params.phone]
    );
    res.json(data.rows);
  } catch (err) {
    console.error("Get address error:", err);
    res.status(500).json({ message: "Error fetching addresses" });
  }
});

router.put("/address/:id", async (req, res) => {
  try {
    const { pool } = require("../db");
    const { first_name, last_name, phone, address, apartment, city, state, pincode, country } = req.body;
    const result = await pool.query(
      `UPDATE address
       SET first_name=$1, last_name=$2, phone=$3, address=$4,
           apartment=$5, city=$6, state=$7, pincode=$8, country=$9
       WHERE id=$10 RETURNING *`,
      [first_name, last_name, phone, address, apartment, city, state, pincode, country, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Address not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Update address error:", err);
    res.status(500).json({ message: "Failed to update address" });
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


module.exports = router;
