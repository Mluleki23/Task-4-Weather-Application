import React from "react";

interface HistoryListProps {
  items: { city: string; country: string; temperature: number }[];
  onSelect: (city: string) => void;
  onClear: () => void;
}

export default function HistoryList({
  items,
  onSelect,
  onClear,
}: HistoryListProps) {
  return (
    <div className="mt-6 max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Search History</h3>
        <button onClick={onClear} className="text-sm text-red-600">
          Clear
        </button>
      </div>
      {items.length === 0 && <p>No history yet.</p>}
      <ul className="space-y-1">
        {items.map((h, idx) => (
          <li
            key={idx}
            className="cursor-pointer hover:underline"
            onClick={() => onSelect(h.city)}
          >
            {h.city}, {h.country} — {h.temperature}°C
          </li>
        ))}
      </ul>
    </div>
  );
}
