// src/components/WeatherCard.tsx
import React from "react";

type Weather = {
  city: string;
  country?: string;
  tempC: number;
  wind?: number;
  humidity?: number | null;
};

export default function WeatherCard({
  weather,
  unit = "celsius",
}: {
  weather: Weather;
  unit?: "celsius" | "fahrenheit";
}) {
  const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
  if (!weather) return null;
  const displayTemp =
    unit === "celsius" ? `${weather.tempC}°C` : `${cToF(weather.tempC)}°F`;

  return (
    <div className="weather-card" style={{ maxWidth: 720 }}>
      <h2 style={{ margin: 0 }}>
        {weather.city}
        {weather.country ? `, ${weather.country}` : ""}
      </h2>
      <p className="temp" style={{ marginTop: 6, marginBottom: 10 }}>
        {displayTemp}
      </p>
      {weather.humidity !== undefined && weather.humidity !== null && (
        <p style={{ margin: 0 }}>💧 Humidity: {weather.humidity}%</p>
      )}
      {weather.wind !== undefined && (
        <p style={{ marginTop: 6 }}>🌬 Wind: {weather.wind} km/h</p>
      )}
    </div>
  );
}
