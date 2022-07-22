<script>
  import LiveWindowSkyWeather from "./LiveWindowSkyWeather.svelte";
  import LiveWindowSkyColor from "./LiveWindowSkyColor.svelte";
</script>

<div class="sky">
  <LiveWindowSkyColor />
  <LiveWindowSkyWeather />
</div>

<style lang="scss">
  .sky {
    position: absolute;
    height: 100%;
    width: var(--live-window-width);
    background-color: var(--color-bg-default-darker);
  }
</style>
