// src/components/HistoryList.tsx

interface Item {
  city: string;
  country?: string;
  tempC: number;
  humidity?: number | null;
}

export default function HistoryList({
  items,
  onSelect,
  onClear,
  onDelete,
  unit = "celsius",
}: {
  items: Item[];
  onSelect: (city: string) => void;
  onClear: () => void;
  onDelete: (index: number) => void;
  unit?: "celsius" | "fahrenheit";
}) {
  const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
  return (
    <div className="history">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h4 style={{ margin: 0 }}>Search History</h4>
        <button
          onClick={onClear}
          style={{
            background: "transparent",
            border: "none",
            color: "#dc2626",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>
      <ul style={{ paddingLeft: 0 }}>
        {items.length === 0 && (
          <li style={{ color: "var(--muted)" }}>No history yet.</li>
        )}
        {items.map((h, idx) => (
          <li
            key={idx}
            style={{
              padding: "6px 0",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span onClick={() => onSelect(h.city)}>
              {h.city}
              {h.country ? `, ${h.country}` : ""} —{" "}
              {unit === "celsius" ? `${h.tempC}°C` : `${cToF(h.tempC)}°F`}
            </span>
            <button
              onClick={() => onDelete(idx)}
              style={{
                background: "transparent",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 6px",
              }}
              title="Delete this item"
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
