import { writable } from "svelte/store";
import axios from "axios";


export const IP_RATE_LIMIT = 30 * 60000; // 30minute
export const WEATHER_RATE_LIMIT = 30 * 60000; // 30minute
export const OPEN_WEATHER_KEY = "45e138203c325d6879937693da1703d8";
export const IP_REGISTRY_KEY = "crbibyp671da1qve";
export const defaultStore = {
  location: { version: 1, lastFetched: null, lat: null, lng: null },
  weather: {
    version: 4,
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

export const gradient = writable({});

store.subscribe((value) => {
  localStorage.liveWindowStore = JSON.stringify(value);
});



export async function fetchLocation($store) {
  const now = Date.now();
  if (
    $store.location.version === defaultStore.location.version &&
    $store.location.lastFetched !== null &&
    now - $store.location.lastFetched < IP_RATE_LIMIT
  ) {
    return;
  }

  const url = `https://api.ipregistry.co/?key=${IP_REGISTRY_KEY}`;
  const { data } = await axios.get(url);
  $store.location.lat = data.location.latitude;
  $store.location.lng = data.location.longitude;
  $store.location.lastFetched = Date.now();
  store.set($store);
}

export async function fetchWeather($store) {
  const now = Date.now();
  const fetchedDate = new Date($store.weather.lastFetched).getDate();
  const todayDate = new Date(now).getDate()
  const isFetchedToday = fetchedDate === todayDate;

  if (
    isFetchedToday &&
    $store.weather.version === defaultStore.weather.version &&
    $store.weather.lastFetched !== null &&
    now - $store.weather.lastFetched < WEATHER_RATE_LIMIT
  ) {
    return;
  }

  const { lat, lng } = $store.location;
  const url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lng}&appid=${OPEN_WEATHER_KEY}`;
  const { data } = await axios.get(url);
  $store.weather.current = {
    ...data.weather[0],
    temp: data.main.temp,
  };
  $store.weather.sunrise = data.sys.sunrise * 1000; // convert to milliseconds
  $store.weather.sunset = data.sys.sunset * 1000; // ^^
  $store.weather.lastFetched = Date.now();
  store.set($store);
}
