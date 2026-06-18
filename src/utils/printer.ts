import { Capacitor } from '@capacitor/core';

// ─── Config storage ──────────────────────────────────────────────────────────

const PRINTER_KEY = 'dineink_printer';

export type PrinterConfig =
  | { type: 'bluetooth'; address: string; name: string }
  | { type: 'wifi'; ip: string; port: number; name: string };

export function getSavedPrinter(): PrinterConfig | null {
  const raw = localStorage.getItem(PRINTER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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
    return { devices: [], error: 'Bluetooth scanning only works on the Android app.' };
  }
  try {
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial');

    const btState = await BluetoothSerial.isEnabled();
    if (!btState.enabled) {
      return { devices: [], error: 'Bluetooth is off. Turn on Bluetooth in Android settings and try again.' };
    }

    const hasPerms = await BluetoothSerial.checkBluetoothPermissions();
    if (!hasPerms) {
      return { devices: [], error: 'Bluetooth permission not granted. Go to Android Settings → Apps → DineInk → Permissions → enable "Nearby devices".' };
    }

    const result = await BluetoothSerial.getPairedDevices();
    const devices = (result.devices ?? []) as Array<{ name: string; address: string }>;
    if (devices.length === 0) {
      return { devices: [], error: 'No paired Bluetooth devices found. Pair your printer in Android Bluetooth settings first, then scan again.' };
    }
    return { devices };
  } catch (e: any) {
    return {
      devices: [],
      error: e?.message || 'Bluetooth scan failed. Make sure Bluetooth is on and permissions are granted.',
    };
  }
}

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────

function b(...bytes: number[]): string {
  return bytes.map(c => String.fromCharCode(c)).join('');
}

const CMD = {
  init:       b(0x1B, 0x40),
  center:     b(0x1B, 0x61, 0x01),
  left:       b(0x1B, 0x61, 0x00),
  boldOn:     b(0x1B, 0x45, 0x01),
  boldOff:    b(0x1B, 0x45, 0x00),
  doubleSize: b(0x1B, 0x21, 0x30),
  normalSize: b(0x1B, 0x21, 0x00),
  cut:        b(0x1D, 0x56, 0x42, 0x00),
  lf:         '\n',
};

function ln(text = ''): string { return text + CMD.lf; }

function padded(left: string, right: string, width = 32): string {
  const gap = Math.max(1, width - left.length - right.length);
  return ln(left + ' '.repeat(gap) + right);
}

function divider(ch = '-', width = 32): string { return ln(ch.repeat(width)); }

function toAscii(s: string): string {
  return s.replace(/₹/g, 'Rs.').replace(/[^\x00-\x7F]/g, '?');
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
  items: Array<{ itemName: string; quantity: number; price: number }>;
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
  let r = '';
  r += CMD.init;
  r += CMD.center + CMD.boldOn + CMD.doubleSize + ln(toAscii(bill.shopName)) + CMD.normalSize + CMD.boldOff;
  if (bill.shopAddress) r += CMD.center + ln(toAscii(bill.shopAddress));
  if (bill.shopGstin) r += CMD.center + ln('GSTIN: ' + bill.shopGstin);
  r += divider();
  r += CMD.left;
  r += padded('Bill No', bill.billNo);
  r += padded('Date', new Date().toLocaleDateString('en-IN'));
  r += padded('Time', new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  r += padded('Customer', toAscii(bill.customerName || 'Walk-in'));
  r += padded('Type', bill.billingType);
  r += padded('Payment', bill.paymentMethod);
  r += divider();
  r += CMD.boldOn + padded('Item', 'Qty   Amount') + CMD.boldOff;
  r += divider();
  for (const item of bill.items) {
    const name = toAscii(item.itemName).substring(0, 18);
    const amt = `${item.quantity}  Rs.${(item.price * item.quantity).toFixed(0)}`;
    r += padded(name, amt);
  }
  r += divider();
  r += padded('Subtotal', `Rs.${bill.subtotal.toFixed(2)}`);
  if (bill.discountAmount > 0) r += padded('Discount', `-Rs.${bill.discountAmount.toFixed(2)}`);
  if (bill.cgst > 0) r += padded('CGST', `Rs.${bill.cgst.toFixed(2)}`);
  if (bill.sgst > 0) r += padded('SGST', `Rs.${bill.sgst.toFixed(2)}`);
  if (bill.serviceChargeAmount > 0) r += padded('Service Chg', `Rs.${bill.serviceChargeAmount.toFixed(2)}`);
  if (bill.packingCharge > 0) r += padded('Packing', `Rs.${bill.packingCharge.toFixed(2)}`);
  r += divider('=');
  r += CMD.boldOn + padded('TOTAL', `Rs.${bill.grandTotal.toFixed(0)}`) + CMD.boldOff;
  r += divider('=');
  r += CMD.center;
  r += ln('Thank You!  Visit Again');
  r += ln('Powered by DineInk POS');
  r += CMD.lf + CMD.lf + CMD.lf + CMD.lf;
  r += CMD.cut;
  return r;
}

// ─── Print drivers ────────────────────────────────────────────────────────────

async function printBluetooth(address: string, receipt: string): Promise<boolean> {
  try {
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial');
    await BluetoothSerial.connect({ address });
    await BluetoothSerial.write({ address, value: receipt });
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

async function printWifi(ip: string, port: number, bill: BillData): Promise<boolean> {
  if (!ip || ip === 'system') return false;
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { CapacitorHttp } = await import('@capacitor/core');
    // Prepend a cut so HTTP headers (which print as text lines) are cut off
    // before our clean receipt starts.
    const receipt = CMD.cut + buildReceipt(bill);

    await CapacitorHttp.request({
      url: `http://${ip}:${port}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      data: receipt,
      connectTimeout: 5000,
      readTimeout: 3000,
    });
    return true; // unlikely — printer doesn't respond with HTTP
  } catch (e: any) {
    const msg = String(e?.message || e || '').toLowerCase();
    // Genuine connection failure → printer is offline or wrong IP
    if (
      msg.includes('refused') ||
      msg.includes('unreachable') ||
      msg.includes('failed to connect') ||
      msg.includes('econnrefused') ||
      msg.includes('no route')
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
  const date = now.toLocaleDateString('en-IN');
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  let r = '';
  r += CMD.init;
  r += CMD.center + CMD.boldOn + CMD.doubleSize + ln('DINEINK POS') + CMD.normalSize + CMD.boldOff;
  r += CMD.center + ln('--- TEST PRINT ---');
  r += divider();
  r += CMD.left;
  r += padded('Date', date);
  r += padded('Time', time);
  r += divider();
  r += CMD.center + CMD.boldOn + ln('Printer OK!') + CMD.boldOff;
  r += CMD.center + ln('Connection successful.');
  r += CMD.lf + CMD.lf + CMD.lf;
  r += CMD.cut;
  return r;
}

export async function printTestPage(): Promise<{ success: boolean; error?: string }> {
  const config = getSavedPrinter();
  if (!config) return { success: false, error: 'No printer configured.' };

  if (config.type === 'wifi') {
    if (!config.ip || config.ip === 'system') {
      return { success: false, error: 'No IP address set for WiFi printer.' };
    }
    const ok = await printWifi(config.ip, config.port, {
      shopName: 'DineInk POS',
      billNo: 'TEST',
      billingType: 'TEST',
      paymentMethod: 'TEST',
      items: [{ itemName: 'Test Item', quantity: 1, price: 0 }],
      subtotal: 0, discountAmount: 0, cgst: 0, sgst: 0,
      serviceChargeAmount: 0, packingCharge: 0, grandTotal: 0,
    });
    if (!ok) return { success: false, error: `Could not reach printer at ${config.ip}:${config.port}. Check IP and make sure phone is on same WiFi as printer.` };
    return { success: true };
  }

  if (config.type === 'bluetooth') {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Bluetooth printing only works on Android.' };
    }
    const receipt = buildTestReceipt();
    const ok = await printBluetooth(config.address, receipt);
    if (!ok) return { success: false, error: `Could not connect to Bluetooth printer "${config.name}". Make sure it is powered on and in range.` };
    return { success: true };
  }

  return { success: false, error: 'Unknown printer type.' };
}

export async function printReceipt(bill: BillData): Promise<boolean> {
  const config = getSavedPrinter();
  if (!config) return false;

  if (config.type === 'wifi') {
    return printWifi(config.ip, config.port, bill);
  }

  // Bluetooth: ESC/POS via native plugin — requires Android
  if (!Capacitor.isNativePlatform()) return false;
  if (config.type === 'bluetooth') {
    const receipt = buildReceipt(bill);
    return printBluetooth(config.address, receipt);
  }
  return false;
}
