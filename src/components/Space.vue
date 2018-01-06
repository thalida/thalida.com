<script>
import helpers from '../helpers/random';
import Weather from './Weather';
import SpaceShape from './SpaceShape';

export default {
  name: 'Space',
  props: ['weather', 'time'],
  components: {
    Weather,
    SpaceShape,
  },
  data() {
    return {
      moon: {
        css: null,
      },
      earth: {
        el: null,
        config: {
          gradientDegrees: '135deg',
        },
      },
      earthMoonGroup: {
        css: null,
      },
      sun: {
        css: null,
      },
      stars: {
        collection: null,
        css: this.getStarCss(),
        config: {
          default: {
            matrixSize: 3,
            numStarsPerSection: 5,
            starDiameters: [
              ...new Array(3).fill('small'),
              ...new Array(1).fill('medium'),
              ...new Array(1).fill('large'),
            ],
          },
          xs: {
            matrixSize: 2,
            numStarsPerSection: 3,
            starDiameters: [
              ...new Array(4).fill('small'),
              ...new Array(2).fill('medium'),
            ],
          },
          sm: {
            matrixSize: 3,
            numStarsPerSection: 3,
            starDiameters: [
              ...new Array(3).fill('small'),
              ...new Array(2).fill('medium'),
            ],
          },
        },
      },
      windowDimensions: null,
      currentBreakpoint: {},
      breakpoints: [
        { key: 'xs', size: 0 },
        { key: 'sm', size: 480 },
        { key: 'md', size: 640 },
        { key: 'lg', size: 900 },
        { key: 'xl', size: 1200 },
        { key: 'tv', size: 1680 },
      ],
    };
  },
  mounted() {
    this.earth.el = document.getElementsByClassName('earth-planet')[0];
    this.handleWindowResize();
    window.addEventListener('resize', this.handleWindowResize);
  },
  computed: {
    earthShadowSize() {
      if (!this.earth.el) {
        return 0;
      }

      return this.getEarthShadowSize(this.time);
    },
    earthCss() {
      if (!this.time) {
        return '';
      }

      const startColor = this.time.color.gradient.start.asString;
      const endColor = this.time.color.gradient.end.asString;
      const gradient = `(${this.earth.config.gradientDegrees}, ${startColor}, ${endColor})`;
      const shadowSize = this.earthShadowSize;

      return {
        ozone: {
          backgroundColor: endColor,
          backgroundImage: `linear-gradient${gradient}`,
        },
        shadow: {
          boxShadow: `inset -${shadowSize}px 0 0 0 rgba(0, 0, 0, 0.10)`,
        },
      };
    },
    earthClasses() {
      return {
        ozone: ['animation-gradient'],
        land: ['animation-earth-rotate'],
      };
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
    timeofDayDegree() {
      return this.calcTimeofDayDegree(this.time);
    },
  },
  watch: {
    currentBreakpoint() {
      this.stars.collection = this.getStarsCollection(this.currentBreakpoint);
      this.earthMoonGroup.css = this.getEarthMoonGroupCss(this.currentBreakpoint);
      this.sun.css = this.getSunCss(this.currentBreakpoint);
      this.moon.css = this.getMoonCss(this.currentBreakpoint);
    },
  },
  methods: {
    handleWindowResize() {
      this.windowDimensions = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      };

      this.currentBreakpoint = {
        width: this.getBreakpoint(this.windowDimensions.width),
        height: this.getBreakpoint(this.windowDimensions.height),
      };
    },
    getBreakpoint(size) {
      return this.breakpoints.find((bp, index) => {
        const nextBp = this.breakpoints[index + 1] || { size: size + 1 };
        return size >= bp.size && size < nextBp.size;
      });
    },
    getStarsCollection(bp) {
      const defaults = this.stars.config.default;
      let bpConfig = {};

      if (bp && bp.width) {
        bpConfig = this.stars.config[bp.width.key];
      }

      return this.generateStars(Object.assign({}, defaults, bpConfig));
    },
    generateStars({ matrixSize, numStarsPerSection, starDiameters }) {
      const totalSections = matrixSize ** 2;
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
            size: helpers.getRandomFromArray(starDiameters),
            x: helpers.getRandomInt(sectionStartPos.x, sectionEndPos.x),
            y: helpers.getRandomInt(sectionStartPos.y, sectionEndPos.y),
          };

          stars.push(newStar);
        }
      }

      return stars;
    },
    calcTimeofDayDegree(time) {
      const secIncrements = 360 / (24 * 60 * 60);
      const midnight = time.now.clone().startOf('day');
      const totalSecElapsed = time.now.clone().diff(midnight.clone(), 'seconds');
      const deg = Math.floor(secIncrements * totalSecElapsed);

      return deg;
    },
    calcYearDegree() {
      const secIncrements = 360 / (365 * 24 * 60 * 60);
      const jan = this.time.now.clone().startOf('year');
      const totalSecElapsed = this.time.now.clone().diff(jan.clone(), 'seconds');
      const deg = Math.floor(secIncrements * totalSecElapsed);

      return deg;
    },
    getStarCss() {
      const deg = this.timeofDayDegree;
      return {
        transform: `rotate(${deg}deg)`,
      };
    },
    getSunCss(bp) {
      const deg = this.timeofDayDegree;
      let scale = 1;

      if (bp.width.key === 'xs') {
        scale = 0.6;
      } else if (bp.width.key === 'sm' || bp.width.key === 'md') {
        scale = 0.9;
      }

      return {
        transform: `rotate(${deg}deg) scale(${scale})`,
      };
    },
    getMoonCss() {
      const deg = 130 + this.timeofDayDegree;
      const translateX = 150;

      return {
        transform: `rotate(${deg}deg) translateX(${translateX}px)`,
      };
    },
    getEarthMoonGroupCss(bp) {
      const deg = -90 + this.calcYearDegree();
      let scale = 1;
      let translateX = 120;

      if (bp.width.key === 'xs') {
        scale = 0.6;
        translateX = 70;
      } else if (bp.width.key === 'sm' || bp.width.key === 'md') {
        scale = 0.9;
        translateX = 90;
      }

      return {
        transform: `rotate(${deg}deg) translateX(${translateX}%) scale(${scale})`,
      };
    },
    getEarthShadowSize(time) {
      const earthRect = this.earth.el.getBoundingClientRect();
      const maxShadowSize = earthRect.width;

      const shadowIncrements = maxShadowSize / (24 * 60 * 60);
      const midnight = time.now.clone().startOf('day');
      const totalSecElapsed = time.now.clone().diff(midnight.clone(), 'seconds');
      const shadow = Math.floor(shadowIncrements * totalSecElapsed);

      // console.log(maxShadowSize, shadow, maxShadowSize - shadow);

      return shadow;
    },
  },
};
</script>

<template>
  <div class="space-wrapper">
    <div 
      class="stars animation-space-rotate"
      v-bind:style="stars.css">
      <SpaceShape 
        v-for="(star, index) in stars.collection"
        :key="index"
        type="star"
        v-bind:size="star.size"
        :style="{
          'top': star.x + '%',
          'left': star.y + '%',
        }" />

      <SpaceShape 
        type="sun"
        v-bind:style="sun.css"
      />
    </div>

    <div 
      class="earth-moon-group"
      v-bind:style="earthMoonGroup.css">
      <SpaceShape 
        type="earth" 
        v-bind:css="earthCss"
        v-bind:classes="earthClasses"
      />
      <SpaceShape
        type="moon"
        class="animation-moon-rotate"
        v-bind:css="moon.css" />
    </div>

    <Weather
      v-bind:weather="weather" 
    />
  </div>
</template>

<style scoped lang="scss">
@import '../assets/styles/variables';
@import '../assets/styles/animations';

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
    transform: rotate(0deg);
  }

  .moon {
    position: absolute;
    top: calc(50% - (24px / 2));
    left: calc(50% - (24px / 2));
  }
  
  .earth-moon-group {
    position: absolute;
    top: calc(50% - (192px / 2));
    left: calc(50% - (192px / 2));
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
}
</style>
