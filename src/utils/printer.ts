import { Capacitor } from "@capacitor/core";

// ─── Config storage ──────────────────────────────────────────────────────────

const PRINTER_KEY = "dineink_printer";

export type PrinterConfig =
  | { type: "bluetooth"; address: string; name: string }
  | { type: "wifi"; ip: string; port: number; name: string };

export function getSavedPrinter(): PrinterConfig | null {
  const raw = localStorage.getItem(PRINTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePrinter(config: PrinterConfig): void {
  localStorage.setItem(PRINTER_KEY, JSON.stringify(config));
}

export function clearPrinter(): void {
  localStorage.removeItem(PRINTER_KEY);
}

// ─── Bluetooth device list ────────────────────────────────────────────────────

export interface BluetoothScanResult {
  devices: Array<{ name: string; address: string }>;
  error?: string;
}

export async function listBluetoothDevices(): Promise<BluetoothScanResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      devices: [],
      error: "Bluetooth scanning only works on the Android app.",
    };
  }
  try {
    const { BluetoothSerial } =
      await import("@ascentio-it/capacitor-bluetooth-serial");

    const btState = await BluetoothSerial.isEnabled();
    if (!btState.enabled) {
      return {
        devices: [],
        error:
          "Bluetooth is off. Turn on Bluetooth in Android settings and try again.",
      };
    }

    const hasPerms = await BluetoothSerial.checkBluetoothPermissions();
    if (!hasPerms) {
      return {
        devices: [],
        error:
          'Bluetooth permission not granted. Go to Android Settings → Apps → DineInk → Permissions → enable "Nearby devices".',
      };
    }

    const result = await BluetoothSerial.getPairedDevices();
    const devices = (result.devices ?? []) as Array<{
      name: string;
      address: string;
    }>;
    if (devices.length === 0) {
      return {
        devices: [],
        error:
          "No paired Bluetooth devices found. Pair your printer in Android Bluetooth settings first, then scan again.",
      };
    }
    return { devices };
  } catch (e: any) {
    return {
      devices: [],
      error:
        e?.message ||
        "Bluetooth scan failed. Make sure Bluetooth is on and permissions are granted.",
    };
  }
}

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────
//
// IMPORTANT: The Capacitor JS→Java bridge truncates strings at the first \x00
// (null byte). Every ESC/POS "turn-off" command (boldOff, normalSize, left
// align, standard cut) uses \x00 as the parameter byte. We avoid ALL of them:
//
//   ✗  ESC E \x00  = bold off      → truncates here
//   ✗  ESC ! \x00  = normal size   → truncates here
//   ✗  ESC a \x00  = left align    → truncates here
//   ✗  GS  V B \x00 = cut         → truncates here
//
// Instead we use CMD.init (ESC @) to reset bold/alignment (no \x00), space-
// padding to center text, and GS V \x01 (partial cut, no \x00) for the cutter.

function b(...bytes: number[]): string {
  return bytes.map((c) => String.fromCharCode(c)).join("");
}

const CMD = {
  init: b(0x1b, 0x40), // ESC @ — resets bold, size, alignment (no null bytes)
  center: b(0x1b, 0x61, 0x01),
  boldOn: b(0x1b, 0x45, 0x01),
  doubleSize: b(0x1b, 0x21, 0x30),
  cut: b(0x1d, 0x56, 0x01), // GS V 1 — partial cut, no null byte
  lf: "\n",
};
// left/boldOff/normalSize all use 0x00 which truncates the Capacitor bridge string.
// Use CMD.init (ESC @) to reset bold, size, and alignment instead.

const W = 48; // receipt width — 80mm paper at standard ESC/POS Font A density

function ln(text = ""): string {
  return text + CMD.lf;
}

function centeredLine(text: string): string {
  const t = text.substring(0, W);
  const pad = Math.max(0, Math.floor((W - t.length) / 2));
  return ln(" ".repeat(pad) + t);
}

// Handles embedded newlines and auto word-wraps lines longer than W chars
function centered(text: string): string {
  if (!text) return "";
  if (text.includes("\n")) {
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => centered(l.trim()))
      .join("");
  }
  if (text.length <= W) return centeredLine(text);
  // Word-wrap: break into ≤W-char lines, center each
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const w = word.substring(0, W);
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= W) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.map(centeredLine).join("");
}

// Convert TAKE_AWAY / CASH / cash → "Take Away" / "Cash"
function fmtLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function padded(left: string, right: string, width = W): string {
  const gap = Math.max(1, width - left.length - right.length);
  return ln(left + " ".repeat(gap) + right);
}

function divider(ch = "-", width = W): string {
  return ln(ch.repeat(width));
}

function toAscii(s: string): string {
  return s.replace(/[₹]/g, "Rs.").replace(/[^\x01-\x7F]/g, "?");
}

// ─── Bill data type ───────────────────────────────────────────────────────────

export type BillData = {
  shopName: string;
  shopAddress?: string;
  shopGstin?: string;
  billNo: string;
  customerName?: string;
  billingType: string;
  paymentMethod: string;
  items: Array<{
    itemName: string;
    quantity: number;
    price: number;
    notes?: string;
    addOns?: Array<{ name: string; price: number }>;
  }>;
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  serviceChargeAmount: number;
  packingCharge: number;
  grandTotal: number;
};

// ─── ESC/POS receipt builder ──────────────────────────────────────────────────

function buildReceipt(bill: BillData): string {
  let r = "";

  const IC = 28;
  const QC = 5;
  const AC = 15;

  const now = new Date();

  r += CMD.init;

  /* ---------- HEADER ---------- */

  r += CMD.center;
  r += CMD.boldOn;
  r += CMD.doubleSize;

  r += ln(toAscii(bill.shopName).toUpperCase());

  r += CMD.init;

  if (bill.shopAddress) r += centered(toAscii(bill.shopAddress));

  if (bill.shopGstin) r += centered(`GSTIN: ${bill.shopGstin}`);

  r += divider();

  /* ---------- DETAILS ---------- */

  r += padded("Bill No", bill.billNo);
  r += padded("Date", now.toLocaleDateString("en-IN"));
  r += padded(
    "Time",
    now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
  );
  r += padded("Customer", toAscii(bill.customerName || "Walk-in"));
  r += padded("Order Type", fmtLabel(bill.billingType));
  r += padded("Payment", fmtLabel(bill.paymentMethod));

  r += divider();

  /* ---------- ITEMS ---------- */

  r += CMD.boldOn;

  r += ln("ITEM".padEnd(IC) + "QTY".padStart(QC) + "AMOUNT".padStart(AC));

  r += CMD.init;

  r += divider();

  for (const item of bill.items) {
    const addOnTotal = (item.addOns || []).reduce((s, a) => s + a.price, 0);
    const unitPrice = item.price + addOnTotal;

    const name = toAscii(item.itemName)
      .substring(0, IC)

      .padEnd(IC);

    const qty = String(item.quantity).padStart(QC);

    const amt = `Rs.${(unitPrice * item.quantity).toFixed(2)}`.padStart(AC);

    r += ln(name + qty + amt);

    for (const addOn of item.addOns || []) {
      r += ln(`  + ${toAscii(addOn.name)} (+Rs.${addOn.price})`.substring(0, IC + QC + AC));
    }

    if (item.notes?.trim()) {
      r += ln(`  * ${toAscii(item.notes).substring(0, IC + QC + AC - 4)}`);
    }
  }

  r += divider();

  /* ---------- TOTALS ---------- */

  r += padded(
    "Subtotal",

    `Rs.${bill.subtotal.toFixed(2)}`,
  );

  if (bill.discountAmount > 0)
    r += padded(
      "Discount",

      `-Rs.${bill.discountAmount.toFixed(2)}`,
    );

  if (bill.cgst > 0)
    r += padded(
      "CGST",

      `Rs.${bill.cgst.toFixed(2)}`,
    );

  if (bill.sgst > 0)
    r += padded(
      "SGST",

      `Rs.${bill.sgst.toFixed(2)}`,
    );

  if (bill.serviceChargeAmount > 0)
    r += padded(
      "Service Charge",

      `Rs.${bill.serviceChargeAmount.toFixed(2)}`,
    );

  if (bill.packingCharge > 0)
    r += padded(
      "Packing Charge",

      `Rs.${bill.packingCharge.toFixed(2)}`,
    );

  r += divider("=");

  /* ---------- TOTAL ---------- */

  r += CMD.boldOn;

  r += padded(
    "TOTAL",

    `Rs.${bill.grandTotal.toFixed(2)}`,
  );

  r += CMD.init;

  r += divider("=");

  /* ---------- FOOTER ---------- */

  r += CMD.center;

  r += ln("Thank You For Visiting");

  r += ln("Please Visit Again");

  r += CMD.lf;

  r += ln("Powered by DineInk POS");

  r += CMD.lf.repeat(4);

  r += CMD.cut;

  return r;
}

// ─── Print drivers ────────────────────────────────────────────────────────────

async function printBluetooth(
  address: string,
  receipt: string,
): Promise<boolean> {
  try {
    const { BluetoothSerial } =
      await import("@ascentio-it/capacitor-bluetooth-serial");
    await BluetoothSerial.connect({ address });
    await BluetoothSerial.write({ address, value: receipt });
    // Wait for the serial buffer to flush before closing the connection
    await new Promise((r) => setTimeout(r, 1200));
    await BluetoothSerial.disconnect({ address });
    return true;
  } catch {
    return false;
  }
}

// ─── WiFi: direct TCP via CapacitorHttp (native, no popup, no CORS) ──────────
//
// CapacitorHttp makes a real TCP connection to IP:9100 and sends the HTTP POST.
// The printer receives HTTP headers first (printed as a few lines of text), then
// our ESC/POS body. We prepend CMD.cut so those header lines get sliced off by
// the cutter before our actual receipt starts printing on fresh paper.
// The printer never sends an HTTP response — CapacitorHttp will timeout/error,
// but by that point the data is already at the printer. We treat connect-refused
// as "printer offline" and all other errors as "sent OK".

async function printWifi(
  ip: string,
  port: number,
  bill: BillData,
): Promise<boolean> {
  if (!ip || ip === "system") return false;
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { CapacitorHttp } = await import("@capacitor/core");
    // Prepend a cut so HTTP headers (which print as text lines) are cut off
    // before our clean receipt starts.
    const receipt = CMD.cut + buildReceipt(bill);

    await CapacitorHttp.request({
      url: `http://${ip}:${port}`,
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      data: receipt,
      connectTimeout: 5000,
      readTimeout: 3000,
    });
    return true; // unlikely — printer doesn't respond with HTTP
  } catch (e: any) {
    const msg = String(e?.message || e || "").toLowerCase();
    // Genuine connection failure → printer is offline or wrong IP.
    // A *connect-phase* timeout belongs here too — nothing ever picked up
    // the connection, the most common real-world signature of a powered-off
    // printer or a mistyped IP, which previously fell through to "sent OK"
    // below. A *read*-phase timeout is deliberately excluded: per the note
    // above, the printer never replies, so timing out waiting for a
    // response after a successful connect is the expected outcome, not a
    // failure — only a message that explicitly mentions the connect phase
    // is treated as offline.
    if (
      msg.includes("refused") ||
      msg.includes("unreachable") ||
      msg.includes("failed to connect") ||
      msg.includes("econnrefused") ||
      msg.includes("no route") ||
      (msg.includes("connect") && (msg.includes("timeout") || msg.includes("timed out")))
    ) {
      return false;
    }
    // Any other error (bad HTTP response, timeout on response) means the data
    // was delivered — the printer is printing.
    return true;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function buildTestReceipt(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-IN");
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  let r = "";
  r += CMD.init;
  r += CMD.center + CMD.boldOn + ln("DINEINK POS");
  r += CMD.init; // reset bold + center → left, normal
  r += centered("--- TEST PRINT ---");
  r += divider();
  r += padded("Date", date);
  r += padded("Time", time);
  r += divider();
  r += CMD.boldOn + centered("Printer OK!");
  r += CMD.init;
  r += centered("Connection successful.");
  r += CMD.lf + CMD.lf + CMD.lf;
  r += CMD.cut;
  return r;
}

export async function printTestPage(): Promise<{
  success: boolean;
  error?: string;
}> {
  const config = getSavedPrinter();
  if (!config) return { success: false, error: "No printer configured." };

  if (config.type === "wifi") {
    if (!config.ip || config.ip === "system") {
      return { success: false, error: "No IP address set for WiFi printer." };
    }
    const ok = await printWifi(config.ip, config.port, {
      shopName: "DineInk POS",
      billNo: "TEST",
      billingType: "TEST",
      paymentMethod: "TEST",
      items: [{ itemName: "Test Item", quantity: 1, price: 0 }],
      subtotal: 0,
      discountAmount: 0,
      cgst: 0,
      sgst: 0,
      serviceChargeAmount: 0,
      packingCharge: 0,
      grandTotal: 0,
    });
    if (!ok)
      return {
        success: false,
        error: `Could not reach printer at ${config.ip}:${config.port}. Check IP and make sure phone is on same WiFi as printer.`,
      };
    return { success: true };
  }

  if (config.type === "bluetooth") {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        error: "Bluetooth printing only works on Android.",
      };
    }
    const receipt = buildTestReceipt();
    const ok = await printBluetooth(config.address, receipt);
    if (!ok)
      return {
        success: false,
        error: `Could not connect to Bluetooth printer "${config.name}". Make sure it is powered on and in range.`,
      };
    return { success: true };
  }

  return { success: false, error: "Unknown printer type." };
}

// ─── Browser / USB print (web / laptop) ──────────────────────────────────────
// Opens an 80mm-sized HTML receipt in a new window and triggers window.print().
// The OS print dialog shows all installed printers including USB thermal printers.

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function printReceiptBrowser(bill: BillData): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const drow = (l: string, v: string) =>
    `<div class="row"><span class="lbl">${l}</span><span class="val">${v}</span></div>`;

  const itemRows = bill.items
    .map((item) => {
      const addOnTotal = (item.addOns || []).reduce((s, a) => s + a.price, 0);
      const unitPrice = item.price + addOnTotal;
      const addOnRows = (item.addOns || [])
        .map(
          (a) =>
            `<tr><td class="INote" colspan="2">&#8226; ${escHtml(a.name)}</td><td class="IA">+&#8377;${a.price}</td></tr>`,
        )
        .join("");
      return (
        `<tr>` +
        `<td class="IN">${escHtml(item.itemName)}</td>` +
        `<td class="IQ">${item.quantity}</td>` +
        `<td class="IA">&#8377;${(unitPrice * item.quantity).toFixed(2)}</td>` +
        `</tr>` +
        addOnRows +
        (item.notes?.trim()
          ? `<tr><td class="INote" colspan="3">&#128221; ${escHtml(item.notes)}</td></tr>`
          : "")
      );
    })
    .join("");

  const extraRows = [
    bill.discountAmount > 0
      ? drow("Discount", `-&#8377;${bill.discountAmount.toFixed(2)}`)
      : "",
    bill.cgst > 0 ? drow("CGST", `&#8377;${bill.cgst.toFixed(2)}`) : "",
    bill.sgst > 0 ? drow("SGST", `&#8377;${bill.sgst.toFixed(2)}`) : "",
    bill.serviceChargeAmount > 0
      ? drow("Service Charge", `&#8377;${bill.serviceChargeAmount.toFixed(2)}`)
      : "",
    bill.packingCharge > 0
      ? drow("Packing Charge", `&#8377;${bill.packingCharge.toFixed(2)}`)
      : "",
  ].join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Bill ${escHtml(bill.billNo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:monospace;color:#000;font-size:11px;line-height:1.25;padding:2px}
.sname{text-align:center;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}
.addr{text-align:center;font-size:10px;line-height:1.3;margin-bottom:1px}
.ds{border-top:1px dashed black;margin:4px 0}
.dd{border-top:2px solid black;margin:5px 0}
.row{display:flex;justify-content:space-between;padding:1px 0;font-size:11px}
.lbl{font-weight:600}
.val{text-align:right}
table{width:100%;border-collapse:collapse}
.ih th{font-size:11px;font-weight:800;padding:4px 0;border-bottom:1px dashed black;text-align:left}
.ih th.IQ{text-align:center}
.ih th.IA{text-align:right}
.IN{width:60%;padding:3px 0;word-break:break-word}
.IQ{width:10%;text-align:center}
.IA{width:30%;text-align:right;font-weight:700}
.INote{padding:0 0 3px 0;font-size:10px;font-style:italic;color:#555;word-break:break-word}
.totrow{display:flex;justify-content:space-between;font-size:16px;font-weight:900;padding:6px 0;border-top:2px solid black;border-bottom:2px solid black}
.foot{text-align:center;font-size:10px;line-height:1.5;padding-top:5px}
@media print{
@page{margin:0;size:80mm auto}
body{padding:0 6mm 0 1mm}
}
</style></head><body>
<div class="sname">${escHtml(bill.shopName)}</div>
${bill.shopAddress ? `<div class="addr">${escHtml(bill.shopAddress)}</div>` : ""}
${bill.shopGstin ? `<div class="addr">GSTIN: ${escHtml(bill.shopGstin)}</div>` : ""}
<div class="ds"></div>
${drow("Bill No", escHtml(bill.billNo))}
${drow("Date", dateStr)}
${drow("Time", timeStr)}
${drow("Customer", escHtml(bill.customerName || "Walk-in"))}
${drow("Order Type", escHtml(fmtLabel(bill.billingType)))}
${drow("Payment", escHtml(fmtLabel(bill.paymentMethod)))}
<div class="ds"></div>
<table class="ih">

<thead>

<tr>

<th class="IN">
ITEM
</th>

<th class="IQ">
QTY
</th>

<th class="IA">
AMOUNT
</th>

</tr>

</thead>

<tbody>

${itemRows}

</tbody>

</table>
<div class="ds"></div>
${drow("Subtotal", `&#8377;${bill.subtotal.toFixed(2)}`)}
${extraRows}
<div class="ds"></div>
<div class="totrow"><span>TOTAL</span><span>&#8377;${bill.grandTotal.toFixed(2)}</span></div>
<div class="ds"></div>
<div class="foot">

Thank You For Visiting

<br>

Please Visit Again

<br><br>

Powered by DineInk POS

</div>
</body></html>`;

  // Hidden iframe — works even after async/await (popup blocker doesn't apply)
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.addEventListener("load", () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);
  });
}

export async function printReceipt(bill: BillData): Promise<boolean> {
  // Web / laptop: use browser print dialog — works with any USB printer
  if (!Capacitor.isNativePlatform()) {
    printReceiptBrowser(bill);
    return true;
  }

  // Android native: ESC/POS direct print
  const config = getSavedPrinter();
  if (!config) return false;

  if (config.type === "wifi") {
    return printWifi(config.ip, config.port, bill);
  }
  if (config.type === "bluetooth") {
    return printBluetooth(config.address, buildReceipt(bill));
  }
  return false;
}
