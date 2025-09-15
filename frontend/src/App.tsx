import { useEffect, useState } from "react";
import Header from "./components/Header";
import QueryEditor from "./components/QueryEditor";
import FunctionEditor from "./components/FunctionEditor";
import EndpointList from "./components/EndpointList";
import EndpointTestModal from "./components/EndpointTestModal";

export type Endpoint = {
  id: string;
  name: string;
  sql: string;
  path?: string;
  type: "query" | "function";
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Array<{ key: string; type?: string; location?: string; required?: boolean; default?: string }>;
};

export type SqlFunction = {
  id: number;
  name: string;
  query: string; // SQL function body
  created_at?: string;
};

// endpoints are loaded from backend

function App() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  // API base URL from Vite env; allow override and sensible default
  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';

  const [functions, setFunctions] = useState<SqlFunction[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<Endpoint | null>(null);

  // Load endpoints from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/endpoints`)
      .then((r) => r.json())
      .then((data) => setEndpoints(data))
      .catch(() => setEndpoints([]));
  }, []);

  // Load functions from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/sql-functions`)
      .then((r) => r.json())
      .then((data) => setFunctions(data))
      .catch(() => setFunctions([]));
  }, []);

  function refreshFunctions() {
    fetch(`${API_BASE}/api/sql-functions`)
      .then((r) => r.json())
      .then((data) => setFunctions(data))
      .catch(() => setFunctions([]));
  }

  // Run SQL: attempt to call backend runner, fallback to demo mock if unavailable
  async function runSql(sql: string) {
    try {
      const res = await fetch(`${API_BASE}/api/sql-functions/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      if (!res.ok) {
        // try to parse JSON error
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        // Normalize error shape to { message, details }
        const normalized = {
          message: err.message || 'Error',
          details: err.error || err.details || (typeof err === 'string' ? err : JSON.stringify(err)),
        };
        return { error: normalized };
      }
      const data = await res.json();
      return data;
    } catch (e) {
      // fallback to local demo mock if backend unreachable
      const s = sql.trim().toLowerCase();
      if (s.startsWith("select")) {
        return {
          columns: ["id", "name", "email"],
          rows: [
            [1, "Alice", "alice@example.com"],
            [2, "Bob", "bob@example.com"],
            [3, "Carol", "carol@example.com"],
          ],
        };
      }
      if (s.startsWith("create function") || s.includes("create or replace function")) {
        return { message: "Function created (demo)" };
      }
      const fn = functions.find((f) => s.includes(f.name.toLowerCase()));
      if (fn) {
        return { message: `Invoked function ${fn.name} (demo)`, query: fn.query };
      }
      if (s.startsWith("call") || s.includes("()")) {
        return { message: "Function invoked (demo)", result: [] };
      }
      return { message: "Executed (demo)" };
    }
  }

  async function addEndpoint(ep: Endpoint) {
    // POST to backend
    const res = await fetch(`${API_BASE}/api/endpoints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: ep.name, method: ep.method, path: ep.path, sql: ep.sql, params: ep.params })
    });
    if (!res.ok) throw new Error('Failed to create endpoint');
    const created = await res.json();
    setEndpoints((s) => [created, ...s]);
  }

  async function addFunction(f: Omit<SqlFunction, 'id' | 'created_at'>) {
    // POST to backend and refresh
    await fetch(`${API_BASE}/api/sql-functions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, query: f.query }),
    });
    refreshFunctions();
  }

  async function deleteEndpoint(id: string) {
    await fetch(`${API_BASE}/api/endpoints/${id}`, { method: 'DELETE' });
    setEndpoints((s) => s.filter((e) => String(e.id) !== String(id)));
  }

  async function deleteFunction(id: number) {
    await fetch(`${API_BASE}/api/sql-functions/${id}`, { method: 'DELETE' });
    refreshFunctions();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-6">
        <section className="col-span-7 bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Query Runner</h2>
          <QueryEditor
            onRun={runSql}
            onSave={(cfg) =>
              addEndpoint({ id: String(Date.now()), name: cfg.name, sql: cfg.sql, path: cfg.path, type: "query", method: cfg.method as any, params: cfg.params })
            }
            functions={functions}
          />
        </section>

        <aside className="col-span-5 space-y-6">
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">SQL Functions</h2>
            <FunctionEditor
              onSave={async (fn) => {
                await addFunction(fn);
              }}
            />
            <div className="mt-4">
              <h3 className="font-medium">Saved functions</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {functions.map((f) => (
                  <li key={f.id} className="p-2 border rounded flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium mb-1">{f.name}</div>
                      <div className="text-xs text-gray-500">
                        <pre className="whitespace-pre-wrap break-words max-h-28 overflow-auto text-xs p-2 bg-gray-50 rounded">{f.query}</pre>
                      </div>
                    </div>
                    <div>
                      <button onClick={() => deleteFunction(f.id)} className="text-red-600 text-sm">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Saved Endpoints</h2>
            <EndpointList endpoints={endpoints} onDelete={deleteEndpoint} onTest={(ep) => { setTestEndpoint(ep); setTestModalOpen(true); }} />
          </div>
        </aside>
      </main>
      <EndpointTestModal open={testModalOpen} onClose={() => setTestModalOpen(false)} endpoint={testEndpoint} />
    </div>
  );
}

export default App;
