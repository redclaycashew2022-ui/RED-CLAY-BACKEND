const formatCurrency = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;

const formatOrderDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

const buildProductLines = (items = []) =>
  items
    .map((item) => `• ${item.name}${item.size ? ` ${item.size}` : ""} ×${item.quantity}`)
    .join("\n");

const getCustomerName = (order) =>
  `${order.first_name || ""} ${order.last_name || ""}`.trim() || "Customer";

/**
 * order: result of order.db.js#getOrderById — joined order + address + items.
 */
const buildNewOrderAdminMessage = (order) => {
  const addressLines = [order.address, order.apartment, `${order.city} - ${order.pincode}`, order.state]
    .filter(Boolean)
    .join(",\n");

  return `New Order Received

Order ID: #${order.id}
Customer: ${getCustomerName(order)}
Phone: ${order.phone}
Amount: ${formatCurrency(order.total_amount)}
Address:
${addressLines}

Products:
${buildProductLines(order.items)}

Payment: ${order.payment_status === "paid" ? "Successful" : order.payment_status}
Order Date: ${formatOrderDate(order.created_at)}`;
};

/**
 * order: result of order.db.js#getOrderById — joined order + address + items.
 * Sent to the customer right after payment is verified, mirroring the admin
 * notification but addressed to them.
 */
const buildNewOrderCustomerMessage = (order) => {
  const addressLines = [order.address, order.apartment, `${order.city} - ${order.pincode}`, order.state]
    .filter(Boolean)
    .join(",\n");

  return `Hi ${getCustomerName(order)},

Thank you for your order with RedClay Cashews & DryFruits!

Order ID: #${order.id}
Amount: ${formatCurrency(order.total_amount)}
Delivery Address:
${addressLines}

Products:
${buildProductLines(order.items)}

Payment: ${order.payment_status === "paid" ? "Successful" : order.payment_status}
Order Date: ${formatOrderDate(order.created_at)}

We'll notify you here as your order progresses.`;
};

const ORDER_STATUS_MESSAGE_BUILDERS = {
  confirmed: (order, name) =>
    `Hi ${name},\n\nYour RedClay Cashews order #${order.id} has been confirmed.\n\nWe'll begin preparing your order and update you once it is shipped.\n\nThank you for shopping with RedClay Cashews.`,
  packed: (order, name) =>
    `Hi ${name},\n\nYour RedClay Cashews order #${order.id} has been packed and is ready for shipping.`,
  shipped: (order, name) =>
    `Hi ${name},\n\nYour RedClay Cashews order #${order.id} has been shipped and is on its way to you!`,
  delivered: (order, name) =>
    `Hi ${name},\n\nYour RedClay Cashews order #${order.id} has been delivered. We hope you enjoy it!\n\nThank you for shopping with RedClay Cashews.`,
  cancelled: (order, name) =>
    `Hi ${name},\n\nYour RedClay Cashews order #${order.id} has been cancelled. If you have any questions, please reach out to us.`,
};

/**
 * Returns the WhatsApp message body for a given order status, or null if
 * that status has no customer-facing template (e.g. "pending").
 */
const buildCustomerStatusMessage = (status, order) => {
  const builder = ORDER_STATUS_MESSAGE_BUILDERS[status];
  return builder ? builder(order, getCustomerName(order)) : null;
};

module.exports = {
  buildNewOrderAdminMessage,
  buildNewOrderCustomerMessage,
  buildCustomerStatusMessage,
};
