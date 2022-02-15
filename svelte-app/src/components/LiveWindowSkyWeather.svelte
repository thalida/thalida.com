<script>
  import { onMount } from "svelte";
  import { store } from "../store";

  onMount(async () => {
    console.log($store.weather);
  });
</script>

<div class="weather" />

<style lang="scss">
</style>
