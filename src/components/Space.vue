<script>
import helpers from '../helpers/random';
import SpaceShape from './SpaceShape';
import Weather from './Weather';

export default {
  name: 'Space',
  props: ['weather', 'time'],
  components: {
    SpaceShape,
    Weather,
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
      stars: {
        collection: null,
        css: this.getStarCss(),
        config: {
          default: {
            matrixSize: 3,
            numStarsPerSection: 3,
            starDiameters: [
              ...new Array(6).fill('small'),
              ...new Array(3).fill('medium'),
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
          boxShadow: `inset 0 ${shadowSize}px 0 0 rgba(0, 0, 0, 0.15)`,
        },
      };
    },
    earthClasses() {
      return {
        ozone: ['animation-gradient'],
        land: ['animation-earth-rotate'],
      };
    },
    timeofDayDegree() {
      return this.calcTimeofDayDegree(this.time);
    },
  },
  watch: {
    currentBreakpoint() {
      this.stars.collection = this.getStarsCollection(this.currentBreakpoint);
      this.earthMoonGroup.css = this.getEarthMoonGroupCss(this.currentBreakpoint);
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
    getMoonCss() {
      const deg = (180 + this.timeofDayDegree) % 360;
      const translateY = -130;

      return {
        transform: `rotate(${deg}deg) translateY(${translateY}px)`,
      };
    },
    getEarthMoonGroupCss(bp) {
      const deg = this.calcYearDegree();
      let scale = 1;
      let translateY = -120;

      if (bp.width.key === 'xs') {
        scale = 0.6;
        translateY = -90;
      } else if (bp.width.key === 'sm' || bp.width.key === 'md') {
        scale = 0.9;
      }

      return {
        transform: `rotate(${deg}deg) translateY(${translateY}%) scale(${scale})`,
      };
    },
    getEarthShadowSize(time) {
      const numSecondsInHour = 60 * 60;
      const earthRect = this.earth.el.getBoundingClientRect();
      const shadowIncrements = earthRect.width / (12 * numSecondsInHour);

      const currHour = parseInt(time.now.format('k'), 10);
      const midnight = time.now.clone().startOf('day');
      const noon = midnight.clone().hours(12);

      let prevTwelve;
      let nextTwelve;
      if (currHour < 12) {
        prevTwelve = midnight;
        nextTwelve = noon;
      } else {
        prevTwelve = noon;
        nextTwelve = midnight;
      }

      const totalSecSinceTwelve = time.now.clone().diff(prevTwelve.clone(), 'seconds');
      const nextTwelveAsSeconds = nextTwelve.hour() * numSecondsInHour;
      const timeSinceTwelve = Math.abs(nextTwelveAsSeconds - totalSecSinceTwelve);

      return Math.ceil(shadowIncrements * timeSinceTwelve);
    },
  },
};
</script>

<template>
  <div class="space-wrapper">
    <div 
      class="stars"
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

      <Weather 
        v-if="weather" 
        v-bind:weather="weather"
        v-bind:time="time"
        v-bind:calc-year-degree="calcYearDegree"
      />

      <SpaceShape
        type="moon"
        v-bind:css="moon.css" />
    </div>
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

    animation: rotate linear $star-animation-speed infinite;
    
    .star {
      position: absolute;
    }

    .sun {
      position: relative;
      animation: sun linear $sun-animation-speed infinite;
    }
  }

  .earth {
    transform: rotate(0deg);
  }

  .moon {
    position: absolute;
    top: calc(50% - (24px / 2));
    left: calc(50% - (24px / 2));

    &:before,
    &:after {
        animation: translate linear $moon-translate-animation-speed infinite;
    }
  }
  
  .earth-moon-group {
    position: absolute;
    top: calc(50% - (192px / 2));
    left: calc(50% - (192px / 2));
  }
}
</style>
