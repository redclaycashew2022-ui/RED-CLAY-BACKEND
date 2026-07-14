const { getUserByPhone } = require("../db/auth.db");

const isAdmin = async (req, res, next) => {
  try {
   let phone =
      req.headers["x-phone-number"] ||
      req.body.phone_number ||
      req.body.phoneNumber ||
      req.body.phone;
        console.log("isAdmin check - phone:", phone); 
    if (!phone)
      return res.status(401).json({ message: "Admin phone required" });

      // Normalize: if no +91 prefix, add it
    if (!phone.startsWith("+")) {
      phone = "+91" + phone;
    }

    const user = await getUserByPhone(phone);
     console.log("isAdmin check - user:", user); 
    if (!user || user.user_type !== "admin") {
      return res.status(403).json({ message: "Admin privileges required" });
    }

    next();
  } catch (err) {
    console.error("isAdmin middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = isAdmin;