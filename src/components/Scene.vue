<template>
  <div class="scene-wrapper">
    <div class="shape-clock">
      <Shapes shape="hexagon" />
      <Shapes shape="circle" />
      <Shapes shape="triangle" />
      <Shapes shape="diamond" />
      <Shapes shape="hexagon" />
      <Shapes shape="rectangle" />
      <Shapes shape="pentagon" />
      <Shapes shape="octagon" />
    </div>
    <div class="scene-copy">
      <h1 class="greeting">Oh hi! How&rsquo;d ya sleep?</h1>
      <p class="weather">It’s currently 51° and mostly cloudly</p>
      <p class="byline">I’m Thalida btw, a {{currentWork.title}} and {{randomFact}}.</p>
    </div>
  </div>
</template>

<script>
import helpers from '../helpers/random';
import Shapes from './Shapes';
import workJson from '../data/work.json';
import funFactsJson from '../data/funFacts.json';

export default {
  name: 'Scene',
  components: {
    Shapes,
  },
  data() {
    return {
      currentWork: workJson[0],
      randomFact: this.getRandomFact(),
    };
  },
  methods: {
    getRandomFact() {
      return helpers.getRandomFromArray(funFactsJson);
    },
  },
};
</script>

<style scoped lang="scss">
@import '../assets/styles/_variables';

.scene-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: $bg-color;
}

.scene-copy {
  display: block;
  position: relative;
  margin: 0 64px;

  .greeting,
  .weather,
  .byline {
    padding: 0;
    margin: 0;
    color: $color-light;
  }

  .greeting {
    padding: 0;
    margin: 0;
    font-family: 'Bungee', cursive;
    font-size: 36px;
    color: $color-light;
    text-shadow: 0 0 6px $bg-color;
  }

  .weather {
    margin-top: 4px;

    font-family: 'Signika', sans-serif;
    font-size: 16px;
    text-shadow: 0 0 6px #1C1F40;
  }

  .byline {
    margin-top: 24px;

    font-size: 14px;
    letter-spacing: -0.5px;
    line-height: 22px;
    text-shadow: 0 0 6px #1C1F40;
  }
}

// rotate(316deg) skew(2deg) scale(1.1)
.shape-clock {
  display: block;
  position: absolute;
  top: 0; 
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;

  .shape {
    display: block;
    position: absolute;

    &:nth-child(1) {
      top: $shape-height / 2;
      left: calc(50% - #{$shape-width / 2});
    }
    
    &:nth-child(2) {
      top: calc(15% - #{$shape-height / 2});
      right: calc(15% - #{$shape-width / 2});
    }

    &:nth-child(3) {
      right: -1 * ($shape-height / 4);
      top: calc(55% - #{$shape-height / 2});
    }
    
    &:nth-child(4) {
      bottom: calc(1% - #{$shape-height / 2});
      right: calc(18% - #{$shape-width / 2});
    }
    
    &:nth-child(5) {
      bottom: $shape-height / 2;
      left: calc(50% - #{$shape-width / 2});
    }
    
    &:nth-child(6) {
      bottom: $shape-height / 4;
      left: -1 * ($shape-width / 3);
    }

    &:nth-child(7) {
      left: -1 * ($shape-height / 2);
      top: calc(50% - #{$shape-height / 2});
    } 
    
    &:nth-child(8) {
      top: calc(20% - #{$shape-height / 2});
      left: $shape-width / 2;
    } 
  }

  @media (max-width: $media-sm) {
    top: -10%;
    left: -10%;
    width: 120%;
    height: 120%;
  }
}
</style>
