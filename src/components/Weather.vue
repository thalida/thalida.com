<script>
import SpaceShape from './SpaceShape';

export default {
  name: 'Weather',
  props: ['weather'],
  components: {
    SpaceShape,
  },
  data() {
    return {};
  },
  computed: {
    isWeatherPrecipitation() {
      if (!this.weather) {
        return false;
      }

      return this.weather.icon === 'rain'
            || this.weather.icon === 'snow'
            || this.weather.icon === 'sleet';
    },
    weatherIcon() {
      if (!this.weather) {
        return '';
      }

      return `weather-${this.weather.icon}`;
    },
  },
};
</script>

<template>
  <div class="weather" v-if="weather" :class="weather.icon">
    <SpaceShape v-if="isWeatherPrecipitation" type="weather-cloudy" />
    <SpaceShape v-if="weather.icon === 'wind'" type="weather-partly-cloudy" />
    <SpaceShape v-bind:type="weatherIcon" />
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/variables';
@import '../assets/styles/animations';

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
</style>
