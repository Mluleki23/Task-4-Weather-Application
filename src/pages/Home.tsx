// src/pages/Home.tsx
import React, { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import WeatherCard from "../components/WeatherCard";
import HistoryList from "../components/HistoryList";

/* Notification component */
function Notification({
  message,
  type = "info",
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`notification ${type === "error" ? "error" : ""}`}>
      {message}
    </div>
  );
}

/* ---- helper conversions ---- */
const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
const fToC = (f: number) => Math.round(((f - 32) * 5) / 9);
const round = (n: number) => Math.round(n);

/* ---- Types ---- */
type HistoryItem = {
  city: string;
  country?: string;
  tempC: number; // stored in Celsius
  wind?: number;
  humidity?: number | null;
  ts?: number;
};

export default function Home() {
  const [notification, setNotification] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);
  const [weather, setWeather] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [forecastType, setForecastType] = useState<"hourly" | "daily">("daily");
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  /* Load history and geolocation on mount */
  useEffect(() => {
    const stored = localStorage.getItem("weather-history");
    if (stored) setHistory(JSON.parse(stored));

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Try geolocation (non-blocking)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          // reverse geocode for readable name
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
            );
            const geo = await geoRes.json();
            const loc = geo.results?.[0];
            const name = loc?.name ?? "Your location";
            const country = loc?.country ?? "";
            await fetchWeatherByCoords(latitude, longitude, name, country);
          } catch (e) {
            // ignore; user can search manually
          }
        },
        () => {
          // denied or failed; no-op
        },
        { timeout: 7000 }
      );
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Save history helper */
  const saveHistory = (entry: HistoryItem) => {
    const updated = [
      entry,
      ...history.filter(
        (h) => !(h.city === entry.city && h.country === entry.country)
      ),
    ].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("weather-history", JSON.stringify(updated));
  };

  /* Core fetch function (always request celsius and convert client-side) */
  const fetchWeatherByCoords = async (
    latitude: number,
    longitude: number,
    name = "Unknown",
    country = ""
  ) => {
    setLoading(true);
    try {
      if (!isOnline) throw new Error("Offline: can't fetch live data");
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh&hourly=temperature_2m,relative_humidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
      const res = await fetch(url);
      const w = await res.json();
      if (!w.current_weather) throw new Error("No weather data returned");

      // get humidity for the current hour if available
      let humidity: number | null = null;
      if (w.hourly && w.hourly.time && w.hourly.relative_humidity_2m) {
        const now = w.current_weather.time;
        let idx = w.hourly.time.indexOf(now);
        if (idx === -1) {
          const nowDate = new Date(now).getTime();
          let best = 0;
          let bestDiff = Infinity;
          w.hourly.time.forEach((t: string, i: number) => {
            const diff = Math.abs(new Date(t).getTime() - nowDate);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = i;
            }
          });
          idx = best;
        }
        humidity = w.hourly.relative_humidity_2m[idx];
      }

      const entry: HistoryItem = {
        city: name,
        country,
        tempC: round(w.current_weather.temperature),
        wind: round(w.current_weather.windspeed),
        humidity,
        ts: Date.now(),
      };

      // build forecasts in Celsius (store internal as Celsius)
      const hourlyArr: any[] = [];
      if (w.hourly && w.hourly.time) {
        hourlyArr.push(
          ...w.hourly.time.map((t: string, i: number) => ({
            time: t,
            tempC:
              typeof w.hourly.temperature_2m[i] === "number"
                ? round(w.hourly.temperature_2m[i])
                : null,
            humidity: w.hourly.relative_humidity_2m?.[i] ?? null,
            wind: w.hourly.windspeed_10m?.[i] ?? null,
          }))
        );
      }
      const dailyArr: any[] = [];
      if (w.daily && w.daily.time) {
        dailyArr.push(
          ...w.daily.time.map((t: string, i: number) => ({
            date: t,
            maxC: w.daily.temperature_2m_max?.[i] ?? null,
            minC: w.daily.temperature_2m_min?.[i] ?? null,
            precipitation: w.daily.precipitation_sum?.[i] ?? null,
            weathercode: w.daily.weathercode?.[i] ?? null,
          }))
        );
      }

      setWeather(entry);
      setHourly(hourlyArr);
      setDaily(dailyArr);
      saveHistory(entry);
      setNotification({
        message: `Weather for ${name} loaded`,
        type: "success",
      });
    } catch (e: any) {
      setNotification({
        message: e.message || "Error fetching weather",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /* Search handler (geocode then fetch) */
  const handleSearch = async (query: string) => {
    if (!query || query.trim().length === 0) return;
    setLoading(true);
    try {
      if (!isOnline)
        throw new Error("You are offline. Only cached data available.");
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1&language=en&format=json`
      );
      const geo = await geoRes.json();
      const loc = geo.results?.[0];
      if (!loc) throw new Error("City not found");
      await fetchWeatherByCoords(
        loc.latitude,
        loc.longitude,
        loc.name,
        loc.country
      );
    } catch (e: any) {
      setNotification({ message: e.message || "Search failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* Unit change - we keep stored data in Celsius, we simply switch the UI rendering */
  const toggleUnit = (u: "celsius" | "fahrenheit") => {
    setUnit(u);
    setNotification({
      message: `Units: ${u === "celsius" ? "°C" : "°F"}`,
      type: "info",
    });
  };

  /* Theme toggle */
  const toggleTheme = (t: "light" | "dark") => {
    setTheme(t);
    setNotification({
      message: `${t === "light" ? "Light" : "Dark"} theme enabled`,
      type: "info",
    });
  };

  /* Helpers for display */
  const displayTemp = (tempC: number | null | undefined) => {
    if (tempC === null || tempC === undefined) return "-";
    return unit === "celsius" ? `${tempC}°C` : `${cToF(tempC)}°F`;
  };

  /* When user selects a past history item (city name), trigger search again */
  const handleSelectHistory = (city: string) => {
    handleSearch(city);
  };

  return (
    <div
      className={`app-root ${theme === "light" ? "light-theme" : "dark-theme"}`}
    >
      <div className="app-frame">
        <div className="header">
          <div className="brand">
            <h1>SkyCast</h1>
          </div>

          <div className="header-center">
            <div style={{ width: "100%" }}>
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>

          <div className="controls">
            <button
              className={`toggle-pill ${theme === "light" ? "active" : ""}`}
              onClick={() => toggleTheme("light")}
              aria-label="Light theme"
            >
              Light
            </button>
            <button
              className={`toggle-pill ${theme === "dark" ? "active" : ""}`}
              onClick={() => toggleTheme("dark")}
              aria-label="Dark theme"
            >
              Dark
            </button>

            <button
              className={`toggle-pill ${unit === "celsius" ? "active" : ""}`}
              onClick={() => toggleUnit("celsius")}
            >
              °C
            </button>
            <button
              className={`toggle-pill ${unit === "fahrenheit" ? "active" : ""}`}
              onClick={() => toggleUnit("fahrenheit")}
            >
              °F
            </button>
          </div>
        </div>

        {!isOnline && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fff3bf",
              color: "#92400e",
            }}
          >
            You are offline. Only cached data is available.
          </div>
        )}

        <div style={{ marginTop: 14 }} className="layout">
          <div className="main-card">
            {loading && (
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Loading…</div>
            )}
            {!weather && !loading && (
              <div className="center">
                Search for a city or allow location to view weather.
              </div>
            )}

            {weather && (
              <>
                <div className="current-row">
                  <div className="current-left">
                    <div className="city">
                      {weather.city}
                      {weather.country ? `, ${weather.country}` : ""}
                    </div>
                    <p className="big-temp">
                      {unit === "celsius"
                        ? `${weather.tempC}°C`
                        : `${cToF(weather.tempC)}°F`}
                    </p>

                    <div className="kv">
                      <div>💧 {weather.humidity ?? "-"}%</div>
                      <div>🌬 {weather.wind ?? "-"} km/h</div>
                    </div>
                  </div>

                  <div className="current-right">
                    {/* big stylized icon (simple) */}
                    <div style={{ fontSize: 48 }}>
                      {/* dynamic icon by temp/humidity could be added */}☀️
                    </div>
                  </div>
                </div>

                <div className="tabs" style={{ marginTop: 14 }}>
                  <div
                    className={`tab ${
                      forecastType === "daily" ? "active" : ""
                    }`}
                    onClick={() => setForecastType("daily")}
                  >
                    Daily
                  </div>
                  <div
                    className={`tab ${
                      forecastType === "hourly" ? "active" : ""
                    }`}
                    onClick={() => setForecastType("hourly")}
                  >
                    Hourly
                  </div>
                </div>

                {/* Hourly */}
                {forecastType === "hourly" && hourly.length > 0 && (
                  <div className="hourly-scroll" aria-hidden={false}>
                    {hourly.slice(0, 16).map((h, i) => (
                      <div className="hour-card" key={i}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {new Date(h.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>
                          {displayTemp(h.tempC)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--muted)",
                            marginTop: 6,
                          }}
                        >
                          {h.humidity ?? "-"}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily */}
                {forecastType === "daily" && daily.length > 0 && (
                  <div className="forecast-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Max</th>
                          <th>Min</th>
                          <th>Precip (mm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily.slice(0, 10).map((d, i) => (
                          <tr key={i}>
                            <td>{new Date(d.date).toLocaleDateString()}</td>
                            <td>{displayTemp(d.maxC)}</td>
                            <td>{displayTemp(d.minC)}</td>
                            <td>{d.precipitation ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="sidebar">
            <div style={{ fontWeight: 700 }}>Saved Locations</div>

            {/* render saved (history) */}
            {history.length === 0 && (
              <div style={{ color: "var(--muted)" }}>
                No saved locations yet
              </div>
            )}
            {history.map((h, idx) => (
              <div key={idx} className="saved-card">
                <div>
                  <div className="city-small">{h.city}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {h.country}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="temp-small">
                    {unit === "celsius" ? `${h.tempC}°C` : `${cToF(h.tempC)}°F`}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {h.humidity ?? "-"}%
                  </div>
                </div>
              </div>
            ))}

            {/* Weather alert box: show notification or placeholder */}
            <div
              className={`alert-box${
                notification && notification.type === "error" ? " error" : ""
              }`}
            >
              {notification
                ? notification.message
                : "Weather alerts will appear here"}
            </div>

            {/* History component (compact) */}
            <div style={{ marginTop: 12 }}>
              <HistoryList
                items={history}
                onSelect={handleSelectHistory}
                onClear={() => {
                  localStorage.removeItem("weather-history");
                  setHistory([]);
                }}
                unit={unit}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
