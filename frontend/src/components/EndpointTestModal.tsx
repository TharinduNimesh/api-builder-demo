import { useEffect, useState } from 'react';
import type { Endpoint } from '../App';

type Props = {
  open: boolean;
  onClose: () => void;
  endpoint?: Endpoint | null;
};

export default function EndpointTestModal({ open, onClose, endpoint }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (open && endpoint) {
      const initial: Record<string, string> = {};
      (endpoint.params || []).forEach((p) => { initial[p.key] = p.default ?? ''; });
      setValues(initial);
      setResult(null);
    }
  }, [open, endpoint]);

  if (!open || !endpoint) return null;

  async function run() {
    setLoading(true);
    try {
      // build url
  const ep = endpoint as NonNullable<typeof endpoint>;
  const path = ep.path || '/';
      // substitute path params — convert simple types when possible
      let urlPath = path;
      (ep.params || []).filter(p => p.location === 'path').forEach((p) => {
        const raw = values[p.key] ?? '';
        let out = raw;
        if (p.type === 'number') out = raw === '' ? '' : String(Number(raw));
        else if (p.type === 'boolean') out = raw === '' ? '' : String(raw === 'true' || raw === '1');
        else if (p.type === 'json') out = raw === '' ? '' : raw; // leave JSON as-is for path (not recommended)
        else out = raw;
        urlPath = urlPath.replace(new RegExp(`\{${p.key}\}`, 'g'), encodeURIComponent(out));
      });

      // build query string
      const qs = (ep.params || []).filter(p => p.location === 'query')
        .map((p) => {
          const raw = values[p.key] ?? '';
          if (raw === '') return '';
          // simple conversions for query params
          if (p.type === 'number') return `${encodeURIComponent(p.key)}=${encodeURIComponent(String(Number(raw)))}`;
          if (p.type === 'boolean') return `${encodeURIComponent(p.key)}=${encodeURIComponent(String(raw === 'true' || raw === '1'))}`;
          return `${encodeURIComponent(p.key)}=${encodeURIComponent(raw)}`;
        })
        .filter(Boolean)
        .join('&');
  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';
  const url = `${API_BASE}/api/api-builder${urlPath}${qs ? '?' + qs : ''}`;

      // build body for body params — convert according to declared type
      const bodyObj: Record<string, any> = {};
  (ep.params || []).filter(p => p.location === 'body').forEach((p) => {
    const raw = values[p.key] ?? '';
    if (raw === '') { bodyObj[p.key] = raw; return; }
    try {
      if (p.type === 'number') bodyObj[p.key] = Number(raw);
      else if (p.type === 'boolean') bodyObj[p.key] = (raw === 'true' || raw === '1');
      else if (p.type === 'json') bodyObj[p.key] = JSON.parse(raw);
      else if (p.type === 'date') bodyObj[p.key] = new Date(raw).toISOString();
      else bodyObj[p.key] = raw;
    } catch (e) {
      bodyObj[p.key] = raw; // fallback to raw string if parsing fails
    }
  });

  const res = await fetch(url, { method: ep.method ?? 'GET', headers: { 'Content-Type': 'application/json' }, body: Object.keys(bodyObj).length ? JSON.stringify(bodyObj) : undefined });
      const data = await res.json().catch(() => null);
      setResult({ status: res.status, ok: res.ok, data });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-11/12 max-w-3xl bg-white rounded shadow-lg overflow-auto max-h-[90vh] p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold">Test Endpoint</h3>
            <div className="text-xs text-gray-500">{endpoint.method ?? 'GET'} {endpoint.path}</div>
          </div>
          <div>
            <button onClick={onClose} className="text-gray-600">Close</button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Parameters</div>
          {(endpoint.params || []).length === 0 ? (
            <div className="text-xs text-gray-500">No parameters</div>
          ) : (
            (endpoint.params || []).map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <div className="w-32 text-xs font-mono">{p.key}</div>
                <input value={values[p.key] ?? ''} onChange={(e) => setValues((s) => ({ ...s, [p.key]: e.target.value }))} placeholder={p.default ?? ''} className="flex-1 p-1 border rounded text-xs" />
              </div>
            ))
          )}

          <div className="flex gap-2">
            <button onClick={run} className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Running...' : 'Run'}</button>
            <button onClick={() => { setValues({}); setResult(null); }} className="px-3 py-2 border rounded">Reset</button>
          </div>

          <div className="mt-3">
            <div className="text-sm font-medium">Result</div>
            <pre className="text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{result ? JSON.stringify(result, null, 2) : 'No result yet'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
