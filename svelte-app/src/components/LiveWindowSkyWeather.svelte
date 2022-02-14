<script>
  import axios from "axios";
  import { onMount } from "svelte";
  import {
    IP_RATE_LIMIT,
    IP_REGISTRY_KEY,
    WEATHER_RATE_LIMIT,
    OPEN_WEATHER_KEY,
    defaultStore,
    store,
  } from "../store";

  async function getLocation() {
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

  async function getWeather() {
    const now = Date.now();
    if (
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
