import { writable } from "svelte/store";

export const IP_RATE_LIMIT = 30 * 60000; // 30minute
export const WEATHER_RATE_LIMIT = 30 * 60000; // 30minute
export const OPEN_WEATHER_KEY = "45e138203c325d6879937693da1703d8";
export const IP_REGISTRY_KEY = "crbibyp671da1qve";
export const defaultStore = {
  location: { version: 1, lastFetched: null, lat: null, lng: null },
  weather: {
    version: 3,
    lastFetched: null,
    current: null,
    sunrise: null,
    sunset: null,
  },
};
const storedData = localStorage.liveWindowStore
  ? JSON.parse(localStorage.liveWindowStore)
  : {};

export const store = writable({
  location: {
    ...defaultStore.location,
    ...storedData.location,
  },
  weather: {
    ...defaultStore.weather,
    ...storedData.weather,
  },
});

store.subscribe((value) => {
  localStorage.liveWindowStore = JSON.stringify(value);
});
