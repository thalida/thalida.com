<script>
  import { writable } from "svelte/store";
  import axios from "axios";
  import { onMount } from "svelte";

  const IP_RATE_LIMIT = 30 * 60000; // 30minute
  const WEATHER_RATE_LIMIT = 30 * 60000; // 30minute
  const OPEN_WEATHER_KEY = "45e138203c325d6879937693da1703d8";
  const IP_REGISTRY_KEY = "crbibyp671da1qve";
  const defaultData = {
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
  const store = writable({
    location: {
      ...defaultData.location,
      ...storedData.location,
    },
    weather: {
      ...defaultData.weather,
      ...storedData.weather,
    },
  });
  store.subscribe((value) => {
    localStorage.liveWindowStore = JSON.stringify(value);
  });
  store.set($store);

  async function getLocation() {
    const now = Date.now();
    if (
      $store.location.version === defaultData.location.version &&
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

  async function getWeather() {
    const now = Date.now();
    if (
      $store.weather.version === defaultData.weather.version &&
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
    $store.weather.sunrise = data.sys.sunrise;
    $store.weather.sunset = data.sys.sunset;
    $store.weather.lastFetched = Date.now();
    store.set($store);
  }

  onMount(async () => {
    await getLocation();
    await getWeather();
    console.log($store.weather);
  });
</script>

<div class="weather" />

<style lang="scss">
</style>
