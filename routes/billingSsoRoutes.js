const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const isAdmin = require("../middleware/isAdmin");

// GET /api/admin/billing-sso — mints a short-lived SSO token for the logged-in
// admin and hands back the billing app's URL to redirect the browser to.
router.get("/admin/billing-sso", isAdmin, (req, res) => {
  const { SHARED_SSO_SECRET, BILLING_FRONTEND_URL } = process.env;

  if (!SHARED_SSO_SECRET || !BILLING_FRONTEND_URL) {
    console.error("Billing SSO is missing required env vars (SHARED_SSO_SECRET, BILLING_FRONTEND_URL)");
    return res.status(500).json({ message: "Billing SSO is not configured" });
  }

  const token = jwt.sign({ phone: req.adminUser.phone_number }, SHARED_SSO_SECRET, {
    expiresIn: "5m",
  });

  const redirectUrl = `${BILLING_FRONTEND_URL}/?ssoToken=${encodeURIComponent(token)}`;
  res.json({ redirectUrl });
});

module.exports = router;
