const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const isAdmin = require("../middleware/isAdmin");

const {
  upsertUserOTP,
  getUserByPhone,
  clearOTP
} = require("../db/auth.db");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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


module.exports = router;
