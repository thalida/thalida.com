<script>
import helpers from '../helpers/random';
import SpaceShape from './SpaceShape';

export default {
  name: 'Space',
  props: ['weather', 'time'],
  components: {
    SpaceShape,
  },
  data() {
    return {
      stars: this.generateStars(),
    };
  },
  computed: {
    isWeatherPrecipitation() {
      return this.weather.icon === 'rain'
            || this.weather.icon === 'snow'
            || this.weather.icon === 'sleet';
    },
    weatherIcon() {
      return `weather-${this.weather.icon}`;
    },
  },
  methods: {
    generateStars() {
      // divine a 2x2 grid, if matrixSize = 5 it would be a 5x5 grid
      const matrixSize = 3;
      const totalSections = matrixSize ** 2;
      const numStarsPerSection = 3;
      const sectionSize = 100 / matrixSize;
      const stars = [];

      for (let sectionIdx = 0; sectionIdx < totalSections; sectionIdx += 1) {
        const sectionStartPos = {
          x: sectionSize * (sectionIdx % matrixSize),
          y: sectionSize * Math.floor(sectionIdx / matrixSize),
        };
        const sectionEndPos = {
          x: sectionStartPos.x + sectionSize,
          y: sectionStartPos.y + sectionSize,
        };

        for (let starIdx = 0; starIdx < numStarsPerSection; starIdx += 1) {
          const newStar = {
            // TODO: investigate random in js using weights
            size: helpers.getRandomFromArray(['small', 'small', 'small', 'medium', 'large']),
            x: helpers.getRandomInt(sectionStartPos.x, sectionEndPos.x),
            y: helpers.getRandomInt(sectionStartPos.y, sectionEndPos.y),
          };

          stars.push(newStar);
        }
      }

      return stars;
    },
  },
};
</script>

<template>
  <div class="space-wrapper">
    <div class="stars">
      <SpaceShape 
        v-for="(star, index) in stars"
        :key="index"
        type="star"
        v-bind:size="star.size"
        :style="{
          'top': star.x + '%',
          'left': star.y + '%',
        }" />
      <SpaceShape type="sun" />
    </div>
    <SpaceShape type="earth" />
    <SpaceShape type="moon" />
    <div class="weather" :class="weather.icon">
      <SpaceShape v-if="isWeatherPrecipitation" type="weather-cloudy" />
      <SpaceShape v-if="weather.icon === 'wind'" type="weather-partly-cloudy" />
      <SpaceShape v-bind:type="weatherIcon" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/_variables';

.space-wrapper {
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  
  background-color: $bg-color;
  color: white;

  .stars {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;
    
    .star {
      position: absolute;
    }

    .sun {
      position: relative;
    }
  }

  .earth {
    position: absolute;
    top: 50px;
    right: 50px;
  }

  .weather {
    position: absolute;
    top: 70px;
    right: 130px;

    &.partly-cloudy,
    &.wind {
      top: 80px;
      right: 160px;
    }

    .weather-snow,
    .weather-rain,
    .weather-sleet {
      margin-top: 8px;
    }

    .weather-fog {
      margin-top: 30px;
    }

    .weather-wind {
      top: 0px;
      left: 4px;
    }
  }

  .moon {
    position: absolute;
    top: 20px;
    right: 20px;
  }

  @media (max-width: $media-sm) {
    .stars .sun,
    .earth,
    .moon {
      transform: scale(0.6);
    }
  }

  @media (min-width: $media-sm + 1px) and (max-width: $media-md) {
    .stars .sun,
    .earth,
    .moon {
      transform: scale(0.9);
    }
  }
}
</style>
