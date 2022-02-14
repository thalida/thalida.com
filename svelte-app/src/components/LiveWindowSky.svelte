<script>
  import LiveWindowSkyWeather from "./LiveWindowSkyWeather.svelte";
  import LiveWindowSkyColor from "./LiveWindowSkyColor.svelte";
</script>

<div class="sky">
  <LiveWindowSkyWeather />
  <LiveWindowSkyColor />
</div>

<style lang="scss">
  .sky {
    position: absolute;
    height: 100%;
    width: var(--live-window-inner-width);
    min-width: var(--live-window-inner-min-width);
  }
</style>
