<script>
import SpaceShape from './SpaceShape';

export default {
  name: 'Space',
  props: ['weather', 'time', 'calcYearDegree'],
  components: {
    SpaceShape,
  },
  data() {
    return {
      earthPlanetEl: null,
      earthOzoneEl: null,
    };
  },
  mounted() {
    this.updateElems();
  },
  updated() {
    this.updateElems();
  },
  computed: {
    earthPlanetRect() {
      if (!this.earthPlanetEl) {
        return null;
      }

      return this.earthPlanetEl.getBoundingClientRect();
    },
    earthOzoneRect() {
      if (!this.earthOzoneEl) {
        return null;
      }

      return this.earthOzoneEl.getBoundingClientRect();
    },
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
    weatherCss() {
      if (!this.weather
          || !this.earthPlanetRect
          || !this.earthOzoneRect
      ) {
        return null;
      }

      const bottom = (this.earthOzoneRect.width - this.earthPlanetRect.width) / 5;

      return {
        bottom: `${bottom}px`,
        transform: 'rotate(-180deg)',
      };
    },
  },
  methods: {
    updateElems() {
      this.earthOzoneEl = document.getElementsByClassName('earth-ozone')[0];
      this.earthPlanetEl = document.getElementsByClassName('earth-planet')[0];
    },
  },
};
</script>

<template>
  <div class="weather" 
    :class="weather.icon"
    :style="weatherCss">
    <SpaceShape v-if="isWeatherPrecipitation" type="weather-cloudy" />
    <SpaceShape v-if="weather.icon === 'wind'" type="weather-partly-cloudy" />
    <SpaceShape v-bind:type="weatherIcon" />
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/variables';
@import '../assets/styles/animations';

.weather {
  display: flex;
  position: absolute;
  width: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  bottom: 0;
  left: 0;

  .weather-snow,
  .weather-rain,
  .weather-sleet {
    margin-top: 8px;
    animation: droplets linear 4s infinite;
  }

  .weather-cloudy,
  .weather-partly-cloudy {
    animation: clouds linear 8s infinite;
  }

  .weather-fog {
    margin-top: 30px;
    animation: fog linear 8s infinite;
  }

  .weather-wind {
    animation: wind linear 2s infinite;
  }
}
</style>
