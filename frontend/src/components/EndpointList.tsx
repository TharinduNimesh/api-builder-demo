// Presentational component - no default React import required
import type { Endpoint } from "../App";

type Props = {
  endpoints: Endpoint[];
  onDelete: (id: string) => void;
  onTest?: (ep: Endpoint) => void;
};

export default function EndpointList({ endpoints, onDelete, onTest }: Props) {
  return (
    <div className="space-y-2">
      {endpoints.length === 0 ? (
        <div className="text-sm text-gray-500">No saved endpoints</div>
      ) : (
        <ul className="space-y-3">
          {endpoints.map((e) => (
            <li key={e.id} className="border rounded-lg p-3 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">{e.method ?? 'GET'}</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-800 leading-5">{e.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5"><code className="bg-gray-50 px-1 rounded">{e.path}</code></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onDelete(e.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                      <button onClick={() => onTest?.(e)} className="text-indigo-600 text-sm hover:underline">Test</button>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words">{e.sql}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(e.params || []).map((p) => (
                      <span key={p.key} className="text-xs bg-gray-50 border rounded px-2 py-0.5 text-gray-600">{p.key}</span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
