import { useEffect, useState } from 'react';
import { Bluetooth, Wifi, X, Check, RefreshCw, Printer, Trash2, AlertCircle, Info, Zap } from 'lucide-react';
import {
  listBluetoothDevices,
  getSavedPrinter,
  savePrinter,
  clearPrinter,
  printTestPage,
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
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

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
    setTestState('idle');
    setTestError(null);
  };

  const runTestPrint = async () => {
    setTestState('testing');
    setTestError(null);
    const result = await printTestPage();
    if (result.success) {
      setTestState('ok');
    } else {
      setTestState('fail');
      setTestError(result.error || 'Test print failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-secondary" />

        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-black text-foreground">Printer Setup</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-secondary transition">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* current printer badge */}
          {saved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.6875rem] font-black uppercase tracking-wide text-emerald-700">Active Printer</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{saved.name}</p>
                  <p className="text-[0.6875rem] text-muted-foreground capitalize mt-0.5">{saved.type}</p>
                </div>
                <button
                  onClick={removePrinter}
                  className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>

              {/* Test print button + feedback */}
              <button
                onClick={runTestPrint}
                disabled={testState === 'testing'}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-black transition ${
                  testState === 'ok'
                    ? 'bg-emerald-500 text-white'
                    : testState === 'fail'
                    ? 'bg-red-500 text-white'
                    : 'bg-white border border-emerald-400 text-emerald-700 hover:bg-emerald-100'
                } disabled:opacity-60`}
              >
                {testState === 'testing' ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending test print…</>
                ) : testState === 'ok' ? (
                  <><Check className="h-3.5 w-3.5" /> Printed! Printer is connected.</>
                ) : testState === 'fail' ? (
                  <><AlertCircle className="h-3.5 w-3.5" /> Failed — tap to retry</>
                ) : (
                  <><Zap className="h-3.5 w-3.5" /> Send Test Print</>
                )}
              </button>

              {testState === 'fail' && testError && (
                <p className="text-[0.6875rem] text-red-600 leading-relaxed">{testError}</p>
              )}
            </div>
          )}

          {/* tabs */}
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            {(['bluetooth', 'wifi'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setBtError(null); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  tab === t ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-white'
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
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Before scanning: make sure your printer is <strong>paired</strong> in Android
                Settings → Bluetooth. Then tap Scan below.
              </div>

              <button
                onClick={scanBluetooth}
                disabled={scanning}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-xs font-bold text-foreground hover:border-red-300 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Scan Paired Devices'}
              </button>

              {btError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-xs text-red-700">{btError}</p>
                </div>
              )}

              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {btDevices.length === 0 && !scanning && !btError && (
                  <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-subtle-foreground">
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
                          : 'border-border bg-muted hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">{device.name || 'Unknown Device'}</p>
                        <p className="text-[0.6875rem] text-muted-foreground">{device.address}</p>
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
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 space-y-1">
                <p>The app sends the bill <strong>directly to the printer</strong> over your WiFi network — no dialog, no popup.</p>
                <p>Make sure your phone is connected to the <strong>same WiFi as the printer</strong> (or the printer's own hotspot).</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">IP Address</label>
                  <input
                    value={wifiIp}
                    onChange={e => setWifiIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full rounded-lg border border-border px-3 py-2 text-xs outline-none focus:border-red-400 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.6875rem] font-bold text-foreground">Port</label>
                  <input
                    value={wifiPort}
                    onChange={e => setWifiPort(e.target.value)}
                    placeholder="9100"
                    type="number"
                    className="w-full rounded-lg border border-border px-3 py-2 text-xs outline-none focus:border-red-400 transition"
                  />
                </div>
              </div>

              {/* IP help toggle */}
              <button
                onClick={() => setShowIpHelp(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-500"
              >
                <Info className="h-3.5 w-3.5" />
                {showIpHelp ? 'Hide help' : 'How to find my printer\'s IP address?'}
              </button>
              {showIpHelp && (
                <div className="rounded-xl border border-border bg-muted px-3 py-2.5 space-y-1.5 text-xs text-muted-foreground">
                  <p><strong>Method 1 — Config print:</strong> Hold the Feed button on the printer for 5 sec while powered on. It prints a sheet with IP and WiFi info.</p>
                  <p><strong>Printer hotspot (AP mode):</strong> If your phone is connected to the printer's own WiFi (e.g. KPC307-UEWB-xxxx), the IP is usually <strong>192.168.223.1</strong> and port <strong>9100</strong>.</p>
                  <p><strong>Same router (STA mode):</strong> If both phone and printer are on your shop WiFi, check the router admin (192.168.1.1) → DHCP clients to find the printer's assigned IP.</p>
                </div>
              )}

              <button
                onClick={saveWifi}
                disabled={!wifiIp.trim()}
                className="w-full rounded-xl bg-red-500 py-2 text-xs font-black text-white shadow-sm hover:bg-red-600 transition disabled:opacity-50"
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
