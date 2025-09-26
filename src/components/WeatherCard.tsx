import React from "react";

interface WeatherCardProps {
  city: string;
  country: string;
  temperature: number;
}

export default function WeatherCard({
  city,
  country,
  temperature,
}: WeatherCardProps) {
  return (
    <div className="p-4 border rounded shadow max-w-sm bg-white">
      <h2 className="text-xl font-semibold">
        {city}, {country}
      </h2>
      <p className="text-2xl mt-2">{temperature}°C</p>
    </div>
  );
}
