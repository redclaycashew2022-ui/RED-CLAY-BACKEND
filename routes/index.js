const express = require("express");
const router = express.Router();

router.use(require("./authRoutes"));
router.use(require("./uploadRoutes"));
router.use(require("./products"));
router.use(require("./premiumCashewRoutes"));
router.use(require("./exportPremiumCashewRoutes"));
router.use(require("./addressRoutes"));
router.use(require("./orderRoutes"));
router.use(require("./paymentRoutes"));
router.use(require("./contactRoutes"));
router.use(require("./statsRoutes"));

module.exports = router;


