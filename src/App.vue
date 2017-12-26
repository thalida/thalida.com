<script>
import Scene from './components/Scene';
import Content from './components/Content';

export default {
  name: 'app',
  components: {
    Scene,
    Content,
  },
};
</script>

<template>
  <div id="app">
    <div class="app-left">
      <Scene />
    </div>
    <div class="app-right">
      <Content />
    </div>
  </div>
</template>

<style lang="scss">
@import './app';
</style>
