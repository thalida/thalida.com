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
    <div class="scene-content byline">
      <span class="space-text">{{salutation}} I’m Thalida.</span><br />
      <p class="space-text">{{currentWork.title}} and {{randomFact}}.</p>
    </div>
    <h1 class="scene-content message space-text">{{message}}</h1>
    <p class="scene-content weather space-text">It’s currently 51°F and Mostly Cloudy.</p>
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/_variables';

.scene-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.space-text {
  display: inline-block;
  margin: 0 0 8px;
  padding: 4px 4px;

  color: $color-light;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 300;
  text-align: center;

  background-color: rgba($bg-color, 0.2);
  border-radius: 30px;

  @media (min-width: $media-md) {
    padding: 8px 16px;
  }
}

.scene-content {
  display: block;
  text-align: center;
  z-index: 1;

  &.byline {
    margin: 32px 0 15vh;
  }

  &.message {
    font-size: 24px;
  }

  &.byline,
  &.weather {
    font-size: 16px;
  }

  @media (min-width: $media-md) {
    &.byline {
      margin-top: 64px;
    }

    &.message {
      font-size: 32px;
    }

    &.byline,
    &.weather {
      font-size: 18px;
    }
  }
}
</style>
