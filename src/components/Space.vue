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
      const numStars = 20;
      const starsPerQuad = Math.floor(numStars / 4);
      const spaceSize = { start: -20, mid: 50, end: 120 };
      const stars = [];

      for (let i = 0; i < numStars; i += 1) {
        const quad = Math.floor(i / starsPerQuad);
        const newStar = {
          // TODO: investigate random in js using weights
          size: helpers.getRandomFromArray(['small', 'small', 'small', 'medium', 'large']),
          x: null,
          y: null,
        };

        const isEven = quad % 2 === 0;

        if (isEven) {
          newStar.x = helpers.getRandomInt(spaceSize.start, spaceSize.mid);
        } else {
          newStar.x = helpers.getRandomInt(spaceSize.mid, spaceSize.end);
        }

        if (quad === 0 || quad === 1) {
          newStar.y = helpers.getRandomInt(spaceSize.start, spaceSize.mid);
        } else if (quad === 2 || quad === 3) {
          newStar.y = helpers.getRandomInt(spaceSize.mid, spaceSize.end);
        }

        stars.push(newStar);
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
