<script>
import moment from 'moment';
import axios from 'axios';
import jsonp from 'jsonp';
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
      timeTick: 0,
      updateTimeInterval: 60 * 1000,

      // Time
      now: moment(),

      // Visits
      numVisits: this.$localStorage.get('numVisits'),
      lastVisit: this.$localStorage.get('lastVisit'),

      geolocation: null,

      // Weather
      weather: {
        apiKey: 'b851e4f5ae645303993f491357d17eb7',
        baseAPIUrl: 'https://api.darksky.net/forecast',
        currently: null,
        tick: 0,
        // updateInterval: 30 * 60 * 1000,
        updateInterval: 30 * 1 * 1000,
      },
    };
  },
  mounted() {
    // Get location for weather
    this.getGeoLocation();

    // Create interval for updating time data
    setInterval(this.updateTimeTick, this.updateTimeInterval);

    // Lets store this new visit to localStorage
    this.updateVisits();
  },
  computed: {
    weatherTick() {
      return this.weather.tick;
    },
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
    timeTick() {
      this.now = moment();
    },
    weatherTick() {
      this.getCurrentWeather();
    },
  },
  methods: {
    updateTimeTick() {
      if (this.timeTick >= this.maxTicks) {
        this.timeTick = 0;
      } else {
        this.timeTick += 1;
      }
    },
    updateWeatherTick() {
      if (this.weather.tick >= this.maxTicks) {
        this.weather.tick = 0;
      } else {
        this.weather.tick += 1;
      }
    },
    updateVisits() {
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
    getGeoLocation() {
      axios
        .post('https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAdqHKcbHf0sWy0iyiKtXOuDEW-TLCNE6k')
        .then((res) => {
          this.geolocation = res.data.location;
          this.updateWeatherTick();
          setInterval(this.updateWeatherTick, this.weather.updateInterval);
        });
    },
    getCurrentWeather() {
      const lat = this.geolocation.lat;
      const lng = this.geolocation.lng;
      const apiUrl = `${this.weather.baseAPIUrl}/${this.weather.apiKey}/${lat},${lng}?exclude=minutely,hourly,daily,alerts`;

      jsonp(apiUrl, null, (err, data) => {
        if (err) {
          return;
        }

        this.weather.currently = {
          ...data.currently,
          unit: data.flags.units,
        };
      });
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
    formatColor(color) {
      const isArray = Array.isArray(color);
      const colorArr = (isArray) ? color : [color.r, color.g, color.b];

      return {
        asString: `rgb(${colorArr.join(',')})`,
        asArray: colorArr,
      };
    },
  },
};
</script>

<template>
  <div id="app">
    <div class="app-left">
      <LiveScene 
        v-bind:time="time"
        v-bind:visit="visit"
        v-bind:weather="weather.currently"
      />
    </div>
    <div class="app-right">
      <Content
        v-bind:time="time"
        v-bind:visit="visit"
        v-bind:weather="weather.currently"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import './app';
</style>
