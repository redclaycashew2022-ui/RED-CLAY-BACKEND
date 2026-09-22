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

const buildProductLinesInline = (items = []) =>
  items
    .map((item) => `${item.name}${item.size ? ` ${item.size}` : ""} x${item.quantity}`)
    .join(", ");

const getCustomerName = (order) =>
  `${order.first_name || ""} ${order.last_name || ""}`.trim() || "Customer";

const buildAddressInline = (order) =>
  [order.address, order.apartment, `${order.city} - ${order.pincode}`, order.state]
    .filter(Boolean)
    .join(", ");

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

// Matches order_confirmation_admin_v3 template: {{1}} = combined details, {{2}} = payment status
const buildNewOrderAdminTemplateVars = (order) => {
  const details = [
    `Order ID: #${order.id}`,
    `Customer: ${getCustomerName(order)}`,
    `Phone: ${order.phone}`,
    `Amount: ${formatCurrency(order.total_amount)}`,
    `Address: ${buildAddressInline(order)}`,
    `Products: ${buildProductLinesInline(order.items)}`,
  ].join(", ");

  return {
    1: details,
    2: order.payment_status === "paid" ? "Successful" : order.payment_status,
  };
};

// Matches order_confirmation_customer_v2 template: {{1}} = name, {{2}} = combined details, {{3}} = payment status
const buildNewOrderCustomerTemplateVars = (order) => {
  const details = [
    `Order ID: #${order.id}`,
    `Amount: ${formatCurrency(order.total_amount)}`,
    `Address: ${buildAddressInline(order)}`,
    `Products: ${buildProductLinesInline(order.items)}`,
  ].join(", ");

  return {
    1: getCustomerName(order),
    2: details,
    3: order.payment_status === "paid" ? "Successful" : order.payment_status,
  };
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

const buildCustomerStatusMessage = (status, order) => {
  const builder = ORDER_STATUS_MESSAGE_BUILDERS[status];
  return builder ? builder(order, getCustomerName(order)) : null;
};

const ORDER_STATUS_TEMPLATE_SIDS = {
  confirmed: "HX8abfc8738f2cb40b7c6e4d41b7c965ab",
  packed: "HXd622db6e044343de30ff69d3b1edef3c",
  shipped: "HXba1736e3ca80f0c2a7c088c95fa7d183",
  delivered: "HX3f452718d216e1e5a1c3eef97f740149",
  cancelled: "HX774528dd41f51a9fd64c87509d030890",
};


const buildCustomerStatusTemplate = (status, order) => {
  const contentSid = ORDER_STATUS_TEMPLATE_SIDS[status];
  if (!contentSid) return null;
  return {
    contentSid,
    contentVariables: JSON.stringify({
      1: getCustomerName(order),
      2: String(order.id),
    }),
  };
};

module.exports = {
  buildNewOrderAdminMessage,
  buildNewOrderCustomerMessage,
  buildCustomerStatusMessage,
  buildNewOrderAdminTemplateVars,
  buildNewOrderCustomerTemplateVars,
  buildCustomerStatusTemplate,
};