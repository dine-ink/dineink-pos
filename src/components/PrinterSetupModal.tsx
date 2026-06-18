import { useEffect, useState } from 'react';
import { Bluetooth, Wifi, X, Check, RefreshCw, Printer, Trash2, AlertCircle, Info } from 'lucide-react';
import {
  listBluetoothDevices,
  getSavedPrinter,
  savePrinter,
  clearPrinter,
  type PrinterConfig,
} from '@/utils/printer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PrinterSetupModal({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'bluetooth' | 'wifi'>('bluetooth');
  const [btDevices, setBtDevices] = useState<Array<{ name: string; address: string }>>([]);
  const [btError, setBtError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [wifiIp, setWifiIp] = useState('');
  const [wifiPort, setWifiPort] = useState('9100');
  const [showIpHelp, setShowIpHelp] = useState(false);
  const [saved, setSaved] = useState<PrinterConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSavedPrinter();
      setSaved(cfg);
      if (cfg?.type === 'wifi') {
        setTab('wifi');
        if (cfg.ip && cfg.ip !== 'system') setWifiIp(cfg.ip);
        setWifiPort(String(cfg.port || 9100));
      }
    }
  }, [isOpen]);

  const scanBluetooth = async () => {
    setScanning(true);
    setBtError(null);
    setBtDevices([]);
    const result = await listBluetoothDevices();
    setBtDevices(result.devices);
    if (result.error) setBtError(result.error);
    setScanning(false);
  };

  const selectBluetooth = (device: { name: string; address: string }) => {
    const cfg: PrinterConfig = { type: 'bluetooth', address: device.address, name: device.name };
    savePrinter(cfg);
    setSaved(cfg);
  };

  const saveWifi = () => {
    const ip = wifiIp.trim() || 'system';
    const cfg: PrinterConfig = {
      type: 'wifi',
      ip,
      port: Number(wifiPort) || 9100,
      name: wifiIp.trim() ? `${wifiIp.trim()}:${wifiPort || 9100}` : 'WiFi / LAN Printer',
    };
    savePrinter(cfg);
    setSaved(cfg);
  };

  const removePrinter = () => {
    clearPrinter();
    setSaved(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-200" />

        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-black text-gray-900">Printer Setup</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* current printer badge */}
          {saved && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Active Printer</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{saved.name}</p>
                <p className="text-[10px] text-gray-500 capitalize mt-0.5">{saved.type}</p>
              </div>
              <button
                onClick={removePrinter}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}

          {/* tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(['bluetooth', 'wifi'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setBtError(null); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  tab === t ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}
              >
                {t === 'bluetooth'
                  ? <Bluetooth className="h-3.5 w-3.5" />
                  : <Wifi className="h-3.5 w-3.5" />}
                {t === 'bluetooth' ? 'Bluetooth' : 'WiFi / LAN'}
              </button>
            ))}
          </div>

          {/* bluetooth panel */}
          {tab === 'bluetooth' && (
            <div className="space-y-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                Before scanning: make sure your printer is <strong>paired</strong> in Android
                Settings → Bluetooth. Then tap Scan below.
              </div>

              <button
                onClick={scanBluetooth}
                disabled={scanning}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 hover:border-red-300 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Scan Paired Devices'}
              </button>

              {btError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-[11px] text-red-700">{btError}</p>
                </div>
              )}

              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {btDevices.length === 0 && !scanning && !btError && (
                  <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                    Tap Scan to find your paired Bluetooth printer.
                  </p>
                )}
                {btDevices.map(device => {
                  const active =
                    saved?.type === 'bluetooth' &&
                    (saved as Extract<typeof saved, { type: 'bluetooth' }>).address === device.address;
                  return (
                    <button
                      key={device.address}
                      onClick={() => selectBluetooth(device)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                        active
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold text-gray-900">{device.name || 'Unknown Device'}</p>
                        <p className="text-[10px] text-gray-500">{device.address}</p>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* wifi panel */}
          {tab === 'wifi' && (
            <div className="space-y-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                When you print, Android's print dialog will open — select your WiFi printer there.
                Make sure your printer is set up in <strong>Android Settings → Print</strong>.
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px] font-bold text-gray-700">
                    IP Address <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    value={wifiIp}
                    onChange={e => setWifiIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-red-400 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-gray-700">Port</label>
                  <input
                    value={wifiPort}
                    onChange={e => setWifiPort(e.target.value)}
                    placeholder="9100"
                    type="number"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-red-400 transition"
                  />
                </div>
              </div>

              {/* IP help toggle */}
              <button
                onClick={() => setShowIpHelp(v => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500"
              >
                <Info className="h-3.5 w-3.5" />
                How to find my printer's IP address?
              </button>
              {showIpHelp && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 space-y-1.5 text-[11px] text-gray-600">
                  <p><strong>Method 1 — Print config page:</strong> Hold the Feed button on your printer for 5 seconds while it's on. It will print a sheet showing its IP address.</p>
                  <p><strong>Method 2 — Router admin:</strong> Open your router's admin page (usually 192.168.1.1) and look for connected devices or DHCP clients list.</p>
                  <p><strong>Method 3 — Android WiFi:</strong> Android Settings → WiFi → tap your network → scroll to see connected devices (some routers show this).</p>
                </div>
              )}

              <button
                onClick={saveWifi}
                className="w-full rounded-xl bg-red-500 py-2 text-xs font-black text-white shadow-sm hover:bg-red-600 transition"
              >
                Save WiFi Printer
              </button>
            </div>
          )}
        </div>

        {/* bottom safe area */}
        <div className="h-4" />
      </div>
    </div>
  );
}
