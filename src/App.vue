<script>
import moment from 'moment';
import LiveScene from './components/LiveScene';
import Content from './components/Content';
import timeGroupsJson from './data/timeGroups.json';
import visitGroupsJson from './data/visitGroups.json';

export default {
  name: 'app',
  components: {
    LiveScene,
    Content,
  },
  data() {
    return {
      timeGroups: timeGroupsJson,
      visitGroups: visitGroupsJson,

      maxTicks: 100,
      tick: 0,
      updateInterval: 60 * 1000,
      now: moment(),
      numVisits: this.$localStorage.get('numVisits'),
      lastVisit: this.$localStorage.get('lastVisit'),
      weather: null,
    };
  },
  mounted() {
    setInterval(this.updateTick, this.updateInterval);
    this.updateNumVisits();
  },
  computed: {
    totalTimeGroups() {
      return this.timeGroups.length;
    },
    totalVisitGroups() {
      return this.visitGroups.length;
    },
    isFirstVist() {
      return this.numVisits === 1;
    },
    time() {
      if (this.now === null) {
        return null;
      }

      return this.getTimeGroup(this.now);
    },
    visit() {
      return this.getVisitGroup(this.numVisits);
    },
  },
  watch: {
    tick() {
      this.now = moment();
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
    updateNumVisits() {
      const timeSinceLastVisit = {
        seconds: this.now.diff(this.lastVisit, 'seconds'),
        minutes: this.now.diff(this.lastVisit, 'minutes'),
      };

      if (
        (this.isFirstVist && timeSinceLastVisit.seconds > 5)
        || (!this.isFirstVist && timeSinceLastVisit.minutes > 2)
      ) {
        this.$localStorage.set('numVisits', this.numVisits + 1);
        this.$localStorage.set('lastVisit', moment().format('x'));
      }
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
      const isCloserToStart = timeSinceRangeBegin < (numHrsInRange - 1);
      let newColor = [];
      let group = null;
      let gradient = {
        start: null,
        end: null,
      };

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

      newColor = this.formatColor(newColor);

      if (isCloserToStart) {
        group = range.groups[0];
        gradient = {
          start: this.formatColor(group.color),
          end: newColor,
        };
      } else {
        group = range.groups[1];
        gradient = {
          start: newColor,
          end: this.formatColor(group.color),
        };
      }

      return {
        now: time,
        group,
        color: {
          ...newColor,
          gradient,
        },
      };
    },
    formatColor(color) {
      const isArray = Array.isArray(color);
      const colorArr = (isArray) ? color : [color.r, color.g, color.b];

      return {
        asString: `rgb(${colorArr.join(',')})`,
        asArray: colorArr,
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

      return {
        count: numVisits,
        group: foundGroup,
      };
    },
  },
};
</script>

<template>
  <div id="app" v-if="time && visit">
    <div class="app-left">
      <LiveScene 
        v-bind:time="time"
        v-bind:visit="visit"
        v-bind:weather="weather"
      />
    </div>
    <div class="app-right">
      <Content
        v-bind:time="time"
        v-bind:visit="visit"
        v-bind:weather="weather"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import './app';
</style>
