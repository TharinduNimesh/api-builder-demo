import { useState } from "react";
import type { SqlFunction } from "../App";

type Props = {
  onSave: (fn: Omit<SqlFunction, "id" | "created_at">) => void;
};

export default function FunctionEditor({ onSave }: Props) {
  const [name, setName] = useState("my_function");
  const [query, setQuery] = useState<string>(
    "CREATE FUNCTION my_function() RETURNS void AS $$ SELECT 1; $$ LANGUAGE SQL;"
  );

  return (
    <div className="space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
  <textarea value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-28 p-2 border rounded font-mono text-sm" />
      <div className="flex gap-2">
  <button onClick={() => onSave({ name, query })} className="px-3 py-2 bg-indigo-600 text-white rounded">Save Function</button>
        <div className="text-sm text-gray-500 self-center">Functions can be saved and later exposed as endpoints.</div>
      </div>
    </div>
  );
}
