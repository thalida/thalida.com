import { merge } from "lodash";
import type { IStore } from "./types";

export const IP_RATE_LIMIT = 30 * 60000; // 30minute
export const WEATHER_RATE_LIMIT = 30 * 60000; // 30minute
export const OPEN_WEATHER_KEY = import.meta.env.PUBLIC_OPEN_WEATHER_API_KEY
export const IP_REGISTRY_KEY = import.meta.env.PUBLIC_IP_REGISTRY_API_KEY;

class Store {
  store: IStore;
  defaultStore: IStore = {
    location: {
      lastFetched: null,
      lat: null,
      lng: null,
      city: null,
      region: null,
      country: null,
    },
    weather: {
      lastFetched: null,
      current: null,
      sunrise: null,
      sunset: null,
    },
  };

  isFetchingWeather: boolean = false;
  isFetchingLocation: boolean = false;

  constructor() {
    const storedData = localStorage && localStorage.liveWindowStore2025
      ? JSON.parse(localStorage.liveWindowStore2025)
      : {};

      this.store = merge({}, this.defaultStore, storedData);
  }

  save() {
    if (localStorage) {
      localStorage.liveWindowStore2025 = JSON.stringify(this.store);
    }
  }

  async fetchLocation() {
    const now = Date.now();
    if (
      this.store.location.lastFetched !== null &&
      now - this.store.location.lastFetched < IP_RATE_LIMIT
    ) {
      return;
    }

    console.log("Fetching location data...");

    const url = `https://api.ipregistry.co/?key=${IP_REGISTRY_KEY}`;
    const response  = await fetch(url);
    const data = await response.json();
    this.store.location.lat = data.location.latitude;
    this.store.location.lng = data.location.longitude;
    this.store.location.city = data.location.city || null;
    this.store.location.country = data.location.country.name || null;
    this.store.location.region = data.location.region.name || null;
    this.store.location.lastFetched = Date.now();
    this.save();
  }

  async fetchWeather() {
    const now = Date.now();
    const fetchedDate = this.store.weather.lastFetched ? new Date(this.store.weather.lastFetched).getDate() : null;
    const todayDate = new Date(now).getDate();
    const isFetchedToday = fetchedDate === todayDate;

    if (
      this.isFetchingWeather ||
      (
        isFetchedToday &&
        this.store.weather.lastFetched !== null &&
        now - this.store.weather.lastFetched < WEATHER_RATE_LIMIT
      )
    ) {
      return;
    }

    this.isFetchingWeather = true;

    console.log("Fetching weather data...");

    await this.fetchLocation();

    const { lat, lng } = this.store.location;
    const url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lng}&appid=${OPEN_WEATHER_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    const icon = parseInt(data.weather[0].icon.slice(0, 2), 10); // Extract the first two digits of the icon code

    this.store.weather.current = {
      ...data.weather[0],
      icon, // Use the parsed icon code
      temp: data.main.temp,
    };
    this.store.weather.sunrise = data.sys.sunrise * 1000; // convert to milliseconds
    this.store.weather.sunset = data.sys.sunset * 1000; // ^^
    this.store.weather.lastFetched = Date.now();
    this.save();
    this.isFetchingWeather = false;
  }
}

const store = new Store();
export default store;
