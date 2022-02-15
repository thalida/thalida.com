<script>
  import { store } from "../store";

  export let icon;

  icon = "02n";
  icon = "02d";
  store.subscribe(() => {
    // icon = $store.weather.current.icon;
  });
</script>

<div class="weather">
  {#if icon === "02n" || icon === "02d"}
    <div class="cloud-small" />
  {/if}
</div>

<style lang="scss">
  .weather {
    position: relative;
    width: 100%;
    height: 100%;

    .cloud-small {
      display: block;
      position: absolute;
      width: 45px;
      height: 45px;
      background: #fff;
      top: 50%;
    }
  }
</style>
