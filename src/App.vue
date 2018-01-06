<script>
import LiveScene from './components/LiveScene';
import Content from './components/Content';

export default {
  name: 'app',
  components: {
    LiveScene,
    Content,
  },
};
</script>

<template>
  <div id="app">
    <div class="app-left">
      <LiveScene />
    </div>
    <div class="app-right">
      <Content />
    </div>
  </div>
</template>

<style lang="scss">
@import './app';
</style>
