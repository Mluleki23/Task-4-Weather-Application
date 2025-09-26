import { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import WeatherCard from "../components/WeatherCard";
import HistoryList from "../components/HistoryList";

export default function Home() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Load stored history on mount
  useEffect(() => {
    const stored = localStorage.getItem("weather-history");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const saveHistory = (entry: any) => {
    const updated = [entry, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("weather-history", JSON.stringify(updated));
  };

  const handleSearch = async (city: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0)
        throw new Error("City not found");
      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`
      );
      const w = await weatherRes.json();
      if (!w.current_weather) throw new Error("No weather data");
      const entry = {
        city: name,
        country,
        temperature: w.current_weather.temperature,
      };
      setWeather(entry);
      saveHistory(entry);
    } catch (e: any) {
      setError(e.message || "Error fetching weather");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Weather App</h1>
      <SearchBar onSearch={handleSearch} />
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {weather && (
        <div className="mt-4">
          <WeatherCard {...weather} />
        </div>
      )}
      <HistoryList
        items={history}
        onSelect={handleSearch}
        onClear={() => {
          localStorage.removeItem("weather-history");
          setHistory([]);
        }}
      />
    </div>
  );
}
