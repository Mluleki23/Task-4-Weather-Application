// src/components/HistoryList.tsx

export default function HistoryList({
  items,
  onSelect,
  onClear,
}: {
  items: string[];
  onSelect: (city: string) => void;
  onClear: () => void;
}) {
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
            }}
          >
            <span onClick={() => onSelect(h)}>
              {h}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
