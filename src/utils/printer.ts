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

export async function listBluetoothDevices(): Promise<Array<{ name: string; address: string }>> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial');
    const result = await BluetoothSerial.getPairedDevices();
    return (result.devices ?? []) as Array<{ name: string; address: string }>;
  } catch {
    return [];
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

// WiFi raw TCP printing — requires @capacitor-community/tcp-socket (not yet installed).
// Config is stored and ready; add TCP socket plugin when needed.
async function printWifi(_ip: string, _port: number, _receipt: string): Promise<boolean> {
  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function printReceipt(bill: BillData): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const config = getSavedPrinter();
  if (!config) return false;

  const receipt = buildReceipt(bill);

  if (config.type === 'bluetooth') return printBluetooth(config.address, receipt);
  if (config.type === 'wifi') return printWifi(config.ip, config.port, receipt);
  return false;
}
