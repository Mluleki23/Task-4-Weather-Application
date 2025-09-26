# Weather App — README

## Overview

A React + TypeScript weather application that shows real-time weather for the user’s current location and any searched location. Users can save locations, switch between Celsius and Fahrenheit, and toggle light/dark themes.

## Features

* **Real-Time Weather:** Temperature, humidity, wind speed, hourly and daily forecasts.
* **Location Detection:** Auto-detect user location (with permission) or search for a city.
* **Saved Locations:** Persist multiple locations for quick access.
* **Customization:** Switch between °C/°F and light/dark themes.
* **Offline Access:** View cached data when offline.

## Tech Stack

* React 18 + TypeScript
* Context API for global state
* Axios or Fetch API for weather data (e.g., OpenWeatherMap)
* LocalStorage or IndexedDB for caching and saved locations
* Tailwind CSS or standard CSS modules for styling

## Setup

1. **Clone & Install**

```bash
git clone https://github.com/<your-username>/weather-app.git
cd weather-app
npm install
```

2. **Environment Variables**
   Create a `.env` file:

```
VITE_WEATHER_API_KEY=your_api_key
```

3. **Run**

```bash
npm run dev     # Start development server
npm run build   # Production build
```

## Project Structure

```
src/
  components/     # WeatherCard, SearchBar, etc.
  contexts/       # ThemeContext, WeatherContext
  hooks/          # useWeather, useGeolocation
  pages/          # Home, Settings
  utils/          # helper functions
```

## Key Components

* **Home Page:** Current and saved locations, search bar.
* **WeatherCard:** Displays temperature, humidity, wind, and forecast.
* **Settings:** Theme and unit toggles.

## Notes

* Ensure API key is kept private.
* Gracefully handle denied location permission.
* Provide clear loading/error states for better UX.

## Deployment

Deploy on Vercel, Netlify, or GitHub Pages. Set environment variables on the host.

---


