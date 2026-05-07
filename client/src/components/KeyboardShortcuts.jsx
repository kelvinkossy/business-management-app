export const KeyboardShortcuts = () => {
  const shortcuts = [
    { key: 'Ctrl + N', description: 'New Sale' },
    { key: 'Ctrl + I', description: 'Inventory' },
    { key: 'Ctrl + E', description: 'Expenses' },
    { key: 'Esc', description: 'Close Modal' },
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <h3 className="text-sm font-semibold mb-2 text-gray-700">Keyboard Shortcuts</h3>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex justify-between text-xs text-gray-600">
            <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{shortcut.key}</span>
            <span>{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
