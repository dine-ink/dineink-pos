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

// ─── WiFi: HTML receipt for Android system print dialog ──────────────────────

function buildHtmlReceipt(bill: BillData): string {
  const items = bill.items.map(item =>
    `<div class="row"><span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${toAscii(item.itemName).substring(0, 20)}</span><span style="width:28px;text-align:center">${item.quantity}</span><span style="width:58px;text-align:right">Rs.${(item.price * item.quantity).toFixed(0)}</span></div>`
  ).join('');
  const tot = (n: number) => `Rs.${n.toFixed(2)}`;
  return `
    <h1>${toAscii(bill.shopName)}</h1>
    ${bill.shopAddress ? `<p>${toAscii(bill.shopAddress)}</p>` : ''}
    ${bill.shopGstin ? `<p>GSTIN: ${bill.shopGstin}</p>` : ''}
    <div class="div"></div>
    <div class="row"><span>Bill No</span><span>${bill.billNo}</span></div>
    <div class="row"><span>Date</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
    <div class="row"><span>Time</span><span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="row"><span>Customer</span><span>${toAscii(bill.customerName || 'Walk-in')}</span></div>
    <div class="row"><span>Type</span><span>${bill.billingType}</span></div>
    <div class="row"><span>Payment</span><span>${bill.paymentMethod}</span></div>
    <div class="div"></div>
    <div class="row" style="font-weight:bold"><span style="flex:1">Item</span><span style="width:28px;text-align:center">Qty</span><span style="width:58px;text-align:right">Amt</span></div>
    <div class="div"></div>
    ${items}
    <div class="div"></div>
    <div class="row"><span>Subtotal</span><span>${tot(bill.subtotal)}</span></div>
    ${bill.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${tot(bill.discountAmount)}</span></div>` : ''}
    ${bill.cgst > 0 ? `<div class="row"><span>CGST</span><span>${tot(bill.cgst)}</span></div>` : ''}
    ${bill.sgst > 0 ? `<div class="row"><span>SGST</span><span>${tot(bill.sgst)}</span></div>` : ''}
    ${bill.serviceChargeAmount > 0 ? `<div class="row"><span>Service Chg</span><span>${tot(bill.serviceChargeAmount)}</span></div>` : ''}
    ${bill.packingCharge > 0 ? `<div class="row"><span>Packing</span><span>${tot(bill.packingCharge)}</span></div>` : ''}
    <div class="div" style="border-top-style:solid"></div>
    <div class="row" style="font-weight:900;font-size:16px"><span>TOTAL</span><span>Rs.${bill.grandTotal.toFixed(0)}</span></div>
    <div class="div"></div>
    <p style="font-weight:bold;margin-top:6px">Thank You! Visit Again</p>
    <p>Powered by DineInk POS</p>
  `;
}

async function printWifi(_ip: string, _port: number, bill: BillData): Promise<boolean> {
  const html = buildHtmlReceipt(bill);
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html><head><title>Bill</title>
    <style>
      body{margin:0;padding:6px;font-family:monospace;font-size:12px;color:#000;background:#fff}
      h1{font-size:17px;font-weight:900;text-align:center;margin:0 0 2px}
      p{margin:2px 0;text-align:center;font-size:10px}
      .row{display:flex;justify-content:space-between;margin:2px 0;font-size:11px}
      .div{border-top:1px dashed #000;margin:6px 0}
      @media print{@page{size:80mm auto;margin:0}body{width:72mm;padding:2px;margin:0}}
    </style></head>
    <body onload="setTimeout(function(){window.print();window.close();},120)">${html}</body></html>`);
  w.document.close();
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function printReceipt(bill: BillData): Promise<boolean> {
  const config = getSavedPrinter();
  if (!config) return false;

  // WiFi: system print dialog — works in any environment
  if (config.type === 'wifi') return printWifi(config.ip, config.port, bill);

  // Bluetooth: ESC/POS via native plugin — requires Android
  if (!Capacitor.isNativePlatform()) return false;
  if (config.type === 'bluetooth') {
    const receipt = buildReceipt(bill);
    return printBluetooth(config.address, receipt);
  }
  return false;
}
