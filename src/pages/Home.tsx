// src/pages/Home.tsx
import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import HistoryList from "../components/HistoryList";

/* ---- helper conversions ---- */
const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
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
  const [savedLocations, setSavedLocations] = useState<HistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [forecastType, setForecastType] = useState<"hourly" | "daily">("daily");
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  /* Load saved locations and search history on mount */
  useEffect(() => {
    const storedSaved = localStorage.getItem("saved-locations");
    if (storedSaved) setSavedLocations(JSON.parse(storedSaved));

    const storedSearch = localStorage.getItem("search-history");
    if (storedSearch) setSearchHistory(JSON.parse(storedSearch));

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Try geolocation (non-blocking)
    if ("geolocation" in navigator) {
      console.log("Geolocation is available, requesting position...");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          console.log("Geolocation success:", pos);
          const { latitude, longitude } = pos.coords;
          // reverse geocode for readable name
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
            );
            const geo = await geoRes.json();
            console.log("Geocoding response:", geo);
            const loc = geo.results?.[0];
            const name = loc?.name ?? "Your location";
            const country = loc?.country ?? "";
            await fetchWeatherByCoords(latitude, longitude, name, country);
          } catch (e) {
            console.error("Geocoding failed:", e);
            setNotification({
              message: "Failed to get location name",
              type: "error",
            });
          }
        },
        () => {
          setNotification({
            message: "Location access denied. Using demo location...",
            type: "info",
          });

          // Use demo location as fallback
          fetchWeatherByCoords(
            -29.6099,
            30.3783,
            "Pietermaritzburg",
            "South Africa"
          );
        },
        {
          timeout: 7000,
          enableHighAccuracy: true,
        }
      );
    } else {
      console.log("Geolocation is not available");
      setNotification({
        message: "Geolocation is not supported by your browser",
        type: "error",
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Manual geolocation trigger */
  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      setNotification({ message: "Getting your location...", type: "info" });
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          console.log("Manual geolocation success:", pos);
          const { latitude, longitude } = pos.coords;
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
            );
            const geo = await geoRes.json();
            console.log("Manual geocoding response:", geo);
            const loc = geo.results?.[0];
            const name = loc?.name ?? "Your location";
            const country = loc?.country ?? "";
            await fetchWeatherByCoords(latitude, longitude, name, country);
          } catch (e) {
            console.error("Manual geocoding failed:", e);
            setNotification({
              message: "Failed to get location name",
              type: "error",
            });
          }
        },
        (error) => {
          console.error("Manual geolocation error:", error);
          setNotification({
            message: "Location access denied. Please enter your city manually.",
            type: "error",
          });
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
        }
      );
    } else {
      setNotification({
        message: "Geolocation is not supported by your browser",
        type: "error",
      });
    }
  };

  /* Add to search history helper */
  const addToSearchHistory = (query: string) => {
    const updated = [query, ...searchHistory.filter(s => s !== query)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem("search-history", JSON.stringify(updated));
  };

  /* Save location helper */
  const saveLocation = (entry: HistoryItem) => {
    const updated = [
      entry,
      ...savedLocations.filter(
        (h) => !(h.city === entry.city && h.country === entry.country)
      ),
    ].slice(0, 10);
    setSavedLocations(updated);
    localStorage.setItem("saved-locations", JSON.stringify(updated));
    setNotification({
      message: `Location saved: ${entry.city}`,
      type: "success",
    });
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
        const fullHourly = w.hourly.time.map((t: string, i: number) => ({
          time: t,
          tempC:
            typeof w.hourly.temperature_2m[i] === "number"
              ? round(w.hourly.temperature_2m[i])
              : null,
          humidity: w.hourly.relative_humidity_2m?.[i] ?? null,
          wind: w.hourly.windspeed_10m?.[i] ?? null,
        }));
        // Find index of current time in location's timezone
        const nowLocal = new Date(Date.now() + (w.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 13) + ":00";
        let startIdx = 0;
        for (let i = 0; i < fullHourly.length; i++) {
          if (fullHourly[i].time >= nowLocal) {
            startIdx = i;
            break;
          }
        }
        hourlyArr.push(...fullHourly.slice(startIdx)); // start from current hour
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
      addToSearchHistory(query);
    } catch (e: any) {
      setNotification({ message: e.message || "Search failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* Unit change - we keep stored data in Celsius, we simply switch UI rendering */
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

  /* Delete individual saved location */
  const handleDeleteSavedLocation = (index: number) => {
    const updated = savedLocations.filter((_, i) => i !== index);
    setSavedLocations(updated);
    localStorage.setItem("saved-locations", JSON.stringify(updated));
    setNotification({
      message: "Saved location deleted",
      type: "info",
    });
  };

  return (
    <div
      className={`app-root ${theme === "light" ? "light-theme" : "dark-theme"}`}
    >
      <div className="app-frame">
        <div className="header">
          <div className="brand">
            <h1>Weather Application</h1>
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
                <div style={{ marginBottom: 16 }}>
                  Search for a city or allow location to view weather.
                </div>
                <button
                  onClick={handleGetLocation}
                  className="toggle-pill"
                  style={{ marginBottom: 16 }}
                >
                  📍 Use My Current Location
                </button>
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
                    {/* big stylized icon (dynamic for rain) */}
                    <div style={{ fontSize: 48 }}>
                      {(() => {
                        // Show rain icon if humidity is high or if precipitation is detected
                        // You can refine this logic as needed
                        const isRainy = (() => {
                          // Check for high humidity or recent rain in forecast
                          if (
                            weather.humidity !== undefined &&
                            weather.humidity !== null &&
                            weather.humidity > 80
                          )
                            return true;
                          // Check for rain in daily forecast (today)
                          if (
                            daily &&
                            daily.length > 0 &&
                            daily[0].precipitation &&
                            daily[0].precipitation > 0
                          )
                            return true;
                          return false;
                        })();
                        return isRainy ? "🌧️" : "☀️";
                      })()}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, textAlign: "center" }}>
                  <button
                    onClick={() => saveLocation(weather)}
                    className="toggle-pill"
                    style={{ marginBottom: 8 }}
                  >
                    Save Location
                  </button>
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
                  <div className="hourly-vertical" aria-hidden={false}>
                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Time</th>
                          <th style={{ textAlign: "left" }}>Temp</th>
                          <th style={{ textAlign: "left" }}>Humidity</th>
                          <th style={{ textAlign: "left" }}>Wind</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hourly.slice(0, 24).map((h, i) => (
                          <tr key={i}>
                            <td>
                              {new Date(h.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>{displayTemp(h.tempC)}</td>
                            <td>{h.humidity ?? "-"}</td>
                            <td>{h.wind ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

            {/* render saved locations */}
            {savedLocations.length === 0 && (
              <div style={{ color: "var(--muted)" }}>
                No saved locations yet
              </div>
            )}
            {savedLocations.map((h, idx) => (
              <div key={idx} className="saved-card" onClick={() => handleSearch(h.city)} style={{ cursor: "pointer" }}>
                <div>
                  <div className="city-small">{h.city}</div>
                  <div className="country-small">{h.country}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div className="temp-small">
                    {unit === "celsius" ? `${h.tempC}°C` : `${cToF(h.tempC)}°F`}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {h.humidity ?? "-"}%
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSavedLocation(idx); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "2px 6px",
                      marginTop: 4,
                    }}
                    title="Delete this saved location"
                  >
                    ❌
                  </button>
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
                items={searchHistory}
                onSelect={handleSelectHistory}
                onClear={() => {
                  localStorage.removeItem("search-history");
                  setSearchHistory([]);
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
