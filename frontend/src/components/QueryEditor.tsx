import { useState } from "react";
import type { SqlFunction } from "../App";
import EndpointModal from "./EndpointModal";

type Props = {
  onRun: (sql: string) => Promise<any> | any;
  onSave: (cfg: { name: string; sql: string; path: string; method?: string; params?: any[] }) => void;
  functions: SqlFunction[];
};

export default function QueryEditor({ onRun, onSave, functions }: Props) {
  const [sql, setSql] = useState<string>("SELECT * FROM users;");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function run() {
    try {
      setLoading(true);
      const r = await onRun(sql);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Write SQL queries or call functions. This is a demo runner (mocked).</div>
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        className="w-full h-44 p-3 border border-gray-200 rounded text-sm font-mono"
      />

      <div className="flex items-center gap-3">
        <button onClick={run} className="px-3 py-2 bg-indigo-600 text-white rounded">Run</button>
        <button onClick={() => setModalOpen(true)} className="px-3 py-2 bg-green-600 text-white rounded">Create Endpoint</button>
      </div>

      <div className="bg-gray-50 border rounded p-3">
        <div className="text-sm font-medium mb-2">Result</div>
        {loading ? (
          <div className="text-sm text-gray-600">Running...</div>
        ) : result ? (
          result.error ? (
            <div className="text-sm text-red-700">
              <div className="font-medium">{result.error.message || 'Error'}</div>
              {(() => {
                const d = result.error.details ?? result.error.error ?? result.error;
                if (d === undefined || d === null) return null;
                if (typeof d === 'object') {
                  return (
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap break-words">{JSON.stringify(d, null, 2)}</pre>
                  );
                }
                if (typeof d === 'string') {
                  try {
                    const parsed = JSON.parse(d);
                    return (
                      <pre className="text-xs mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap break-words">{JSON.stringify(parsed, null, 2)}</pre>
                    );
                  } catch (_) {
                    return (
                      <pre className="text-xs mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap break-words">{d}</pre>
                    );
                  }
                }
                return <pre className="text-xs mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap break-words">{String(d)}</pre>;
              })()}
            </div>
          ) : result.rows ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm table-auto">
                <thead>
                  <tr>
                    {result.columns.map((c: string) => (
                      <th key={c} className="text-left p-2 border-b">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r: any[], i: number) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-100">
                      {r.map((v, j) => (
                        <td key={j} className="p-2 align-top">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="text-sm text-gray-700">{JSON.stringify(result, null, 2)}</pre>
          )
        ) : (
          <div className="text-xs text-gray-400">No result yet — run a query</div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500">Saved functions: {functions.map((f) => f.name).join(", ") || "(none)"}</div>

      <EndpointModal open={modalOpen} onClose={() => setModalOpen(false)} initialSql={sql} onSave={({ name, pathTemplate, method, params, sql: modalSql }) => {
        onSave({ name, sql: modalSql, path: pathTemplate || "/", method, params });
      }} />
    </div>
  );
}
