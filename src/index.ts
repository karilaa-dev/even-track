const API_BASE = "https://track.evenrealities.com";
const API_KEY = "1600082c-e5f9-11f0-aad8-42010a08401c";

interface LineItem {
  title: string;
  variant: string;
  quantity: number;
  current_quantity: number;
  fulfilled_quantity: number;
  status: number;
  is_core_product: boolean;
  material_type: string;
  expected_ship_week_start?: string;
  expected_ship_week_end?: string;
}

interface Fulfillment {
  tracking_number?: string;
  tracking_url?: string;
  tracking_company?: string;
  status?: string;
}

interface OrderData {
  created_at: string;
  estimatedDeleiveryStartDate: string; // typo is in the API
  estimatedDeliveryEndDate: string;
  financial_status: string;
  fulfillment_status: string;
  fulfillments: Fulfillment[];
  line_items: LineItem[];
  order_number: string;
  total_price: string;
}

interface ApiResponse {
  code: number;
  msg: string;
  data: {
    reOrder?: OrderData;
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const orderNumber = url.searchParams.get("order_number");

    if (!email || !orderNumber) {
      return new Response(renderForm(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    try {
      const apiUrl = `${API_BASE}/api/order_info?email=${encodeURIComponent(email)}&order_number=${encodeURIComponent(orderNumber)}`;
      const resp = await fetch(apiUrl, {
        headers: { "Api-Key": API_KEY },
      });

      if (!resp.ok) {
        return new Response(renderError(`API returned ${resp.status}`), {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      const json = (await resp.json()) as ApiResponse;

      if (json.code !== 0 || !json.data?.reOrder) {
        return new Response(renderError(json.msg || "Order not found"), {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      return new Response(renderOrder(json.data.reOrder, email), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return new Response(renderError(`Failed to fetch order: ${msg}`), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }
  },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(fulfillmentStatus: string, financialStatus: string): string {
  if (fulfillmentStatus === "fulfilled") return "Shipped";
  if (fulfillmentStatus === "partial") return "Partially Shipped";
  if (financialStatus === "paid") return "Processing";
  if (financialStatus === "pending") return "Pending Payment";
  return fulfillmentStatus || financialStatus || "Unknown";
}

function statusColor(fulfillmentStatus: string): string {
  if (fulfillmentStatus === "fulfilled") return "#16a34a";
  if (fulfillmentStatus === "partial") return "#ca8a04";
  return "#2563eb";
}

function itemStatusText(status: number, fulfilledQty: number, qty: number): string {
  if (fulfilledQty >= qty) return "Shipped";
  if (fulfilledQty > 0) return "Partially Shipped";
  if (status === 1) return "Processing";
  return "Pending";
}

function itemStatusColor(fulfilledQty: number, qty: number): string {
  if (fulfilledQty >= qty) return "#16a34a";
  if (fulfilledQty > 0) return "#ca8a04";
  return "#6b7280";
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; padding: 1rem; }
  .container { max-width: 600px; margin: 2rem auto; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); padding: 1.5rem; margin-bottom: 1rem; }
  h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; }
  .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 1rem; }
  .badge { display: inline-block; padding: 0.2rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; color: #fff; }
  .row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; font-size: 0.875rem; }
  .value { font-weight: 500; font-size: 0.875rem; text-align: right; }
  .item { padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
  .item:last-child { border-bottom: none; }
  .item-title { font-weight: 600; font-size: 0.95rem; }
  .item-variant { color: #64748b; font-size: 0.8rem; }
  .item-meta { display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.8rem; }
  .section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.75rem; }
  .tracking-link { color: #2563eb; text-decoration: none; font-weight: 500; }
  .tracking-link:hover { text-decoration: underline; }
  .error { text-align: center; padding: 2rem; }
  .error h2 { color: #dc2626; margin-bottom: 0.5rem; }
  form { display: flex; flex-direction: column; gap: 0.75rem; }
  label { font-size: 0.875rem; font-weight: 500; }
  input { padding: 0.6rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
  input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  button { padding: 0.7rem; background: #1e293b; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; }
  button:hover { background: #334155; }
  .footer { text-align: center; color: #94a3b8; font-size: 0.75rem; margin-top: 1rem; }
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`;
}

function renderForm(): string {
  return page("Even Realities Order Checker", `
    <div class="card">
      <h1>Even Realities Order Checker</h1>
      <p class="subtitle">Enter your details to check order status</p>
      <form method="GET" action="/">
        <label for="email">Email used at checkout</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
        <label for="order_number">Order number</label>
        <input type="text" id="order_number" name="order_number" required placeholder="e.g. 24323022011">
        <button type="submit">Check Order</button>
      </form>
    </div>
  `);
}

function renderError(message: string): string {
  return page("Error - Order Checker", `
    <div class="card error">
      <h2>Order Not Found</h2>
      <p>${escapeHtml(message)}</p>
      <p style="margin-top:1rem;"><a href="/" style="color:#2563eb;">Try again</a></p>
    </div>
  `);
}

function renderOrder(order: OrderData, email: string): string {
  const status = statusLabel(order.fulfillment_status, order.financial_status);
  const color = statusColor(order.fulfillment_status);

  const estStart = formatDate(order.estimatedDeleiveryStartDate);
  const estEnd = formatDate(order.estimatedDeliveryEndDate);
  const estimatedRange = estStart !== "—" && estEnd !== "—" ? `${estStart} – ${estEnd}` : "—";

  let trackingHtml = "";
  if (order.fulfillments && order.fulfillments.length > 0) {
    const trackingItems = order.fulfillments.map((f) => {
      const company = f.tracking_company || "Carrier";
      const num = f.tracking_number || "—";
      if (f.tracking_url) {
        return `<div class="row"><span class="label">${escapeHtml(company)}</span><span class="value"><a class="tracking-link" href="${escapeHtml(f.tracking_url)}" target="_blank">${escapeHtml(num)}</a></span></div>`;
      }
      return `<div class="row"><span class="label">${escapeHtml(company)}</span><span class="value">${escapeHtml(num)}</span></div>`;
    }).join("");

    trackingHtml = `
      <div class="card">
        <div class="section-title">Tracking</div>
        ${trackingItems}
      </div>`;
  }

  const itemsHtml = order.line_items.map((item) => {
    const shipRange = item.expected_ship_week_start && item.expected_ship_week_end
      ? `Ship: ${formatDate(item.expected_ship_week_start)} – ${formatDate(item.expected_ship_week_end)}`
      : "";
    const stText = itemStatusText(item.status, item.fulfilled_quantity, item.quantity);
    const stColor = itemStatusColor(item.fulfilled_quantity, item.quantity);

    return `<div class="item">
      <div class="item-title">${escapeHtml(item.title)}</div>
      ${item.variant ? `<div class="item-variant">${escapeHtml(item.variant)}</div>` : ""}
      <div class="item-meta">
        <span style="color:${stColor};">${stText}</span>
        <span style="color:#64748b;">${shipRange}</span>
      </div>
    </div>`;
  }).join("");

  return page(`Order ${order.order_number} - Even Realities`, `
    <div class="card">
      <h1>Order #${escapeHtml(order.order_number)}</h1>
      <p class="subtitle">Placed ${formatDate(order.created_at)}</p>
      <span class="badge" style="background:${color};">${status}</span>
    </div>

    <div class="card">
      <div class="section-title">Order Details</div>
      <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(email)}</span></div>
      <div class="row"><span class="label">Total</span><span class="value">$${escapeHtml(order.total_price)}</span></div>
      <div class="row"><span class="label">Payment</span><span class="value" style="text-transform:capitalize;">${escapeHtml(order.financial_status)}</span></div>
      <div class="row"><span class="label">Estimated Delivery</span><span class="value">${estimatedRange}</span></div>
    </div>

    ${trackingHtml}

    <div class="card">
      <div class="section-title">Items (${order.line_items.length})</div>
      ${itemsHtml}
    </div>

    <div class="footer">Auto-refreshes every 5 minutes &middot; <a href="/" style="color:#94a3b8;">New lookup</a></div>
    <script>setTimeout(() => location.reload(), 5 * 60 * 1000);</script>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
