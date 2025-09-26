import { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import WeatherCard from "../components/WeatherCard";
import HistoryList from "../components/HistoryList";

export default function Home() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [forecastType, setForecastType] = useState<"hourly" | "daily">("daily");
  const [forecast, setForecast] = useState<any[]>([]);
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Load stored history, try geolocation, and handle online/offline
  useEffect(() => {
    const stored = localStorage.getItem("weather-history");
    if (stored) setHistory(JSON.parse(stored));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.geolocation && navigator.onLine) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoading(true);
        setError(null);
        try {
          // Reverse geocode to get city/country
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
          );
          const geoData = await geoRes.json();
          const loc = geoData.results?.[0];
          if (!loc) throw new Error("Could not determine your city");

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=${unit}&windspeed_unit=kmh&hourly=relative_humidity_2m`
          );
          const w = await weatherRes.json();
          if (!w.current_weather) throw new Error("No weather data");
          // Find humidity for current hour
          let humidity = null;
          if (w.hourly && w.hourly.time && w.hourly.relative_humidity_2m) {
            const now = w.current_weather.time;
            const idx = w.hourly.time.indexOf(now);
            if (idx !== -1) humidity = w.hourly.relative_humidity_2m[idx];
          }
          const entry = {
            city: loc.name,
            country: loc.country,
            temperature: w.current_weather.temperature,
            windspeed: w.current_weather.windspeed,
            humidity,
          };
          setWeather(entry);
          saveHistory(entry);
        } catch (e: any) {
          setError(e.message || "Error fetching weather");
        } finally {
          setLoading(false);
        }
      });
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [unit]);

  const saveHistory = (entry: any) => {
    const updated = [entry, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("weather-history", JSON.stringify(updated));
  };

  const handleSearch = async (city: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    setForecast([]);
    try {
      if (!isOnline) {
        setError("You are offline. Only cached data is available.");
        setLoading(false);
        return;
      }
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0)
        throw new Error("City not found");
      const { latitude, longitude, name, country } = geoData.results[0];

      // Fetch both hourly and daily forecast
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=${unit}&windspeed_unit=kmh&hourly=temperature_2m,relative_humidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`
      );
      const w = await weatherRes.json();
      if (!w.current_weather) throw new Error("No weather data");
      // Find humidity for current hour (fallback to closest hour if needed)
      let humidity = null;
      if (w.hourly && w.hourly.time && w.hourly.relative_humidity_2m) {
        const now = w.current_weather.time;
        let idx = w.hourly.time.indexOf(now);
        if (idx === -1) {
          // Fallback: find closest hour
          const nowDate = new Date(now);
          let minDiff = Infinity;
          w.hourly.time.forEach((t: string, i: number) => {
            const diff = Math.abs(new Date(t).getTime() - nowDate.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              idx = i;
            }
          });
        }
        if (idx !== -1) humidity = w.hourly.relative_humidity_2m[idx];
      }
      const entry = {
        city: name,
        country,
        temperature: w.current_weather.temperature,
        windspeed: w.current_weather.windspeed,
        humidity,
      };
      setWeather(entry);
      saveHistory(entry);

      // Prepare forecast data
      if (forecastType === "hourly" && w.hourly) {
        setForecast(
          w.hourly.time.map((t: string, i: number) => ({
            time: t,
            temperature: w.hourly.temperature_2m[i],
            humidity: w.hourly.relative_humidity_2m[i],
            windspeed: w.hourly.windspeed_10m[i],
          }))
        );
      } else if (forecastType === "daily" && w.daily) {
        setForecast(
          w.daily.time.map((t: string, i: number) => ({
            date: t,
            tempMax: w.daily.temperature_2m_max[i],
            tempMin: w.daily.temperature_2m_min[i],
            precipitation: w.daily.precipitation_sum[i],
            weathercode: w.daily.weathercode[i],
          }))
        );
      }
    } catch (e: any) {
      setError(e.message || "Error fetching weather");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 min-h-screen ${theme}-theme`}>
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <h1 className="text-2xl font-bold">Weather App</h1>
        <div className="flex gap-2">
          <button
            className={`theme-toggle ${
              theme === "light" ? "active" : "inactive"
            }`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
          <button
            className={`theme-toggle ${
              theme === "dark" ? "active" : "inactive"
            }`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className={`unit-toggle ${
              unit === "celsius" ? "active" : "inactive"
            }`}
            onClick={() => setUnit("celsius")}
          >
            °C
          </button>
          <button
            className={`unit-toggle ${
              unit === "fahrenheit" ? "active" : "inactive"
            }`}
            onClick={() => setUnit("fahrenheit")}
          >
            °F
          </button>
        </div>
      </div>
      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded ${
            forecastType === "daily" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setForecastType("daily")}
        >
          Daily
        </button>
        <button
          className={`px-3 py-1 rounded ${
            forecastType === "hourly" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setForecastType("hourly")}
        >
          Hourly
        </button>
      </div>
      {!isOnline && (
        <div className="mb-2 p-2 bg-yellow-200 text-yellow-900 rounded">
          You are offline. Only cached data is available.
        </div>
      )}
      <SearchBar onSearch={handleSearch} />
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {weather && (
        <div className="mt-4">
          <WeatherCard {...weather} />
        </div>
      )}
      {/* Forecast display */}
      {forecastType === "hourly" && forecast.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Hourly Forecast</h3>
          <div className="overflow-x-auto">
            <table className="min-w-max text-sm">
              <thead>
                <tr>
                  <th className="px-2">Time</th>
                  <th className="px-2">
                    Temp ({unit === "celsius" ? "°C" : "°F"})
                  </th>
                  <th className="px-2">Humidity (%)</th>
                  <th className="px-2">Wind (km/h)</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((h, i) => (
                  <tr key={i}>
                    <td className="px-2 whitespace-nowrap">
                      {h.time.slice(11, 16)}
                    </td>
                    <td className="px-2">{h.temperature}</td>
                    <td className="px-2">{h.humidity}</td>
                    <td className="px-2">{h.windspeed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {forecastType === "daily" && forecast.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Daily Forecast</h3>
          <div className="overflow-x-auto">
            <table className="min-w-max text-sm">
              <thead>
                <tr>
                  <th className="px-2">Date</th>
                  <th className="px-2">
                    Max ({unit === "celsius" ? "°C" : "°F"})
                  </th>
                  <th className="px-2">
                    Min ({unit === "celsius" ? "°C" : "°F"})
                  </th>
                  <th className="px-2">Precip (mm)</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((d, i) => (
                  <tr key={i}>
                    <td className="px-2 whitespace-nowrap">{d.date}</td>
                    <td className="px-2">{d.tempMax}</td>
                    <td className="px-2">{d.tempMin}</td>
                    <td className="px-2">{d.precipitation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
