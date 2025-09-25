import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import SearchBar from "./components/SearchBar";
function App() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (city: string) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    try {
      const res = await fetch(
        `https://weather-api167.p.rapidapi.com/api/weather/current?place=${encodeURIComponent(
          city
        )}&units=standard&lang=en&mode=json`,
        {
          method: "GET",
          headers: {
            "x-rapidapi-key":
              "d587790286mshed52531465cb313p152099jsn426eef08e53c",
            "x-rapidapi-host": "weather-api167.p.rapidapi.com",
            Accept: "application/json",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        // Show API error message if available
        throw new Error(data?.message || "City not found or API error");
      }
      setWeather(data);
    } catch (e: any) {
      setError(
        (e.message || "Error fetching weather") +
          "\nFormat: City or City,CountryCode (e.g. Durban or Durban,ZA)"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Weather App</h1>
      <SearchBar onSearch={handleSearch} />
      {loading && <p>Loading...</p>}
      {error && (
        <div style={{ color: "red", whiteSpace: "pre-line" }}>{error}</div>
      )}
      {weather && (
        <div style={{ marginTop: 16 }}>
          <p>Temperature: {weather?.current?.temperature ?? "N/A"}°K</p>
        </div>
      )}
    </>
  );
}

export default App;
