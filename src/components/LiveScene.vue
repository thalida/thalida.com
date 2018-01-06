<script>
import helpers from '../helpers/random';
import Space from './Space';
import workJson from '../data/work.json';
import funFactsJson from '../data/funFacts.json';

export default {
  name: 'LiveScene',
  props: ['time', 'visit', 'weather'],
  components: {
    Space,
  },
  data() {
    return {
      currentWork: workJson[0],
      randomFact: this.getRandomFact(),
    };
  },
  computed: {
    timeMessage() {
      return helpers.getRandomFromArray(this.time.group.sayings);
    },
    visitSalutation() {
      return helpers.getRandomFromArray(this.visit.group.sayings);
    },
  },
  watch: {
    time() {
      this.randomFact = this.getRandomFact();
    },
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
    <div class="scene-content greeting-content">
      <p class="space-p space-p1">{{timeMessage}}</p><br />
      <p class="space-p space-p2">It’s currently 51°F and Mostly Cloudy.</p>
    </div>
    <div class="scene-content byline-content">
      <span class="space-p space-p2">{{visitSalutation}} I’m Thalida.</span><br />
      <p class="space-p space-p2">{{currentWork.title}} and {{randomFact}}.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/_variables';

.scene-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: space-evenly;
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;

  @media (min-height: $media-md) and (max-height: $media-lg - 1px) {
    justify-content: space-around;
  }

  @media (min-height: $media-lg) {
    justify-content: space-between;
  }
}

.scene-content {
  color: white;
  display: block;
  flex: 0 1 auto;
  margin: 4% 0;
  text-align: center;
  z-index: 1;

  @media (min-height: $media-sm) {
    margin: 8% 0;
  }
}
</style>
