export default function History() {
  const items = JSON.parse(localStorage.getItem("weather-history") || "[]");
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Search History</h1>
      <ul className="mt-4 space-y-1">
        {items.map((h: any, idx: number) => (
          <li key={idx}>
            {h.city}, {h.country} — {h.temperature}°C
          </li>
        ))}
      </ul>
    </div>
  );
}
