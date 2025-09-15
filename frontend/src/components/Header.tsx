// Header is a pure presentational component - no React default import needed with the new JSX transform

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">VB</div>
          <div>
            <div className="font-semibold">Visual API Builder</div>
            <div className="text-xs text-gray-500">Postgres visual API demo</div>
          </div>
        </div>
        <div className="text-sm text-gray-600">Demo / Local only</div>
      </div>
    </header>
  );
}
