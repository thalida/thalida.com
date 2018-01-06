<script>
import helpers from '../helpers/random';

import Space from './Space';

import workJson from '../data/work.json';
import funFactsJson from '../data/funFacts.json';

export default {
  name: 'LiveScene',
  components: {
    Space,
  },
  data() {
    return {
      currentWork: workJson[0],
      randomFact: this.getRandomFact(),
      message: 'Oh hi! How’d ya sleep?',
      salutation: 'Welcome back!',
      weather: {
        icon: 'wind',
      },
      time: {

      },
    };
  },
  methods: {
    getRandomFact() {
      return helpers.getRandomFromArray(funFactsJson);
    },
  },
};
</script>

<template>
  <div class="scene-wrapper">
    <Space 
      v-bind:weather="weather"
      v-bind:time="time" />
    <div class="scene-content byline-content">
      <span class="space-p space-p2">{{salutation}} I’m Thalida.</span><br />
      <p class="space-p space-p2">{{currentWork.title}} and {{randomFact}}.</p>
    </div>
    <div class="scene-content greeting-content">
      <p class="space-p space-p1">{{message}}</p><br />
      <p class="space-p space-p2">It’s currently 51°F and Mostly Cloudy.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/_variables';

.scene-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.scene-content {
  display: block;
  flex: 0 1 auto;
  margin: 4% 0;
  text-align: center;
  z-index: 1;

  &.greeting-content {
    order: -1;
  }

  @media (min-height: $media-sm) {
    margin: 8% 0;
  }
}
</style>
