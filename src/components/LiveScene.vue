<script>
import moment from 'moment';
import helpers from '../helpers/random';

import Space from './Space';

import timeGroupsJson from '../data/timeGroups.json';
import visitGroupsJson from '../data/visitGroups.json';
import workJson from '../data/work.json';
import funFactsJson from '../data/funFacts.json';

export default {
  name: 'LiveScene',
  components: {
    Space,
  },
  mounted() {
    this.updateTick();
    setInterval(this.updateTick, 10 * 1000);
  },
  data() {
    return {
      currentWork: workJson[0],
      timeGroups: timeGroupsJson,
      visitGroups: visitGroupsJson,

      maxTicks: 100,
      tick: 0,
      currentTime: null,
      numVisit: 0,
      visitSalutation: null,
      randomFact: null,
      weather: {
        icon: 'wind',
      },
    };
  },
  computed: {
    totalTimeGroups() {
      return this.timeGroups.length;
    },
    currentTimeGroup() {
      if (this.currentTime === null) {
        return null;
      }

      return this.getTimeGroup(this.currentTime);
    },
    timeMessage() {
      if (this.currentTime === null || this.currentTimeGroup === null) {
        return null;
      }

      return helpers.getRandomFromArray(this.currentTimeGroup.group.sayings);
    },
    totalVisitGroups() {
      return this.visitGroups.length;
    },
    currentVisitGroup() {
      return this.getVisitGroup(this.numVisit);
    },
  },
  watch: {
    tick() {
      this.currentTime = this.setCurrentTime();
      this.randomFact = this.getRandomFact();
      this.visitSalutation = helpers.getRandomFromArray(this.currentVisitGroup.sayings);
    },
  },
  methods: {
    updateTick() {
      if (this.tick >= this.maxTicks) {
        this.tick = 0;
      } else {
        this.tick += 1;
      }
    },
    setCurrentTime() {
      this.currentTime = moment();
      return this.currentTime;
    },
    getRandomFact() {
      return helpers.getRandomFromArray(funFactsJson);
    },
    getTimeRange(time) {
      const groups = [];
      // Current hour + minutes in military time
      const hour = parseInt(time.format('H'), 10);
      const minute = parseInt(time.format('m'), 10);

      for (let i = 0; i < this.totalTimeGroups; i += 1) {
        const nextIdx = (i + 1 < this.totalTimeGroups) ? i + 1 : 0;
        const currGroup = this.timeGroups[i];
        const nextGroup = this.timeGroups[nextIdx];

        // Check if we have found the correct color range:
        //    current hour >= the currGroups's start time
        //  AND current hour is < nextGroup's start time
        //  OR  nextGroup's start time is midnight
        //    meaning that the currGroup's index is the last in the arr
        if (hour >= currGroup.startHour
           && (hour < nextGroup.startHour || nextGroup.startHour === 0)
        ) {
          groups[0] = currGroup;
          groups[1] = nextGroup;
          break;
        }
      }
      return {
        time: { hour, minute },
        groups,
      };
    },
    getTimeGroup(time) {
      // Get the start + end colors - as well as the time used
      const range = this.getTimeRange(time);
      const interval = {};
      const distance = {};
      const endRangeTime = (range.groups[1].startHour === 0) ? 24 : range.groups[1].startHour;
      const numHrsInRange = Math.abs(endRangeTime - range.groups[0].startHour);
      const timeSinceRangeBegin = Math.abs(range.time.hour - range.groups[0].startHour);
      const colorParts = ['r', 'g', 'b'];
      const newColor = [];

      // Get the total # of hours b/w the two groups
      // Split the transition distance (1) to pieces for each hour mark
      interval.hour = +(1 / numHrsInRange).toFixed(3);
      // Split the hour interval into 60 pieces (1 for each minute)
      interval.minute = +(interval.hour / 60).toFixed(3);

      // Calculate the current hour + minute values using the intervals
      distance.hour = +(interval.hour * timeSinceRangeBegin).toFixed(3);
      distance.minute = +(interval.minute * range.time.minute).toFixed(3);
      distance.total = +(distance.hour + distance.minute).toFixed(3);

      for (let i = 0; i < colorParts.length; i += 1) {
        const part = colorParts[i];
        const startColor = range.groups[0].color[part];
        const endColor = range.groups[1].color[part];
        const transitionColor = Math.round(endColor + ((startColor - endColor) * distance.total));
        newColor.push(transitionColor);
      }

      return {
        group: (timeSinceRangeBegin < numHrsInRange) ? range.groups[0] : range.groups[1],
        rgbColor: {
          asString: `rgb(${newColor.join(',')})`,
          asArray: newColor,
        },
      };
    },
    getVisitGroup(numVisits) {
      let foundGroup;

      for (let i = 0; i < this.totalVisitGroups; i += 1) {
        const group = this.visitGroups[i];

        if (numVisits <= group.minVisits || i === this.totalVisitGroups - 1) {
          foundGroup = group;
          break;
        }
      }

      return foundGroup;
    },
  },
};
</script>

<template>
  <div class="scene-wrapper">
    <Space 
      v-bind:weather="weather"
      v-bind:time="currentTimeGroup" />
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
  justify-content: space-between;
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
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
