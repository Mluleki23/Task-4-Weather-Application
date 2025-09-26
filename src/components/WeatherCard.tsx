import React from "react";

type WeatherCardProps = {
  city: string;
  country: string;
  temperature: number;
  windspeed?: number;
  humidity?: number;
};

const WeatherCard: React.FC<WeatherCardProps> = ({
  city,
  country,
  temperature,
  windspeed,
  humidity,
}) => {
  return (
    <div className="p-4 border rounded shadow max-w-sm bg-white">
      <h2 className="text-xl font-semibold">
        {city}, {country}
      </h2>
      <p className="text-2xl mt-2">{temperature}°C</p>
      {humidity !== undefined && humidity !== null && (
        <p className="mt-1">Humidity: {humidity}%</p>
      )}
      {windspeed !== undefined && (
        <p className="mt-1">Wind: {windspeed} km/h</p>
      )}
    </div>
  );
};

export default WeatherCard;
