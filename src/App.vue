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
      location: {
        async: true,
      },
      currentLocation: null,

      time: {
        groups: timeGroupsJson,
        now: moment(),
        maxTicks: 100,
        currTick: 0,
        tickInterval: 5 * 60 * 1000,
      },

      visit: {
        groups: visitGroupsJson,
        total: this.$localStorage.get('totalVisits'),
        lastTime: this.$localStorage.get('lastVisit'),
      },

      weather: {
        async: true,
        apiKey: 'b851e4f5ae645303993f491357d17eb7',
        baseAPIUrl: 'https://api.darksky.net/forecast',
        maxTicks: 100,
        currTick: 0,
        tickInterval: 30 * 60 * 1000,
      },
      currentWeather: null,
    };
  },
  mounted() {
    // Marks this session as a new visit
    this.visit_update();

    // Get location used for the weather
    this.location_getCurrent();

    // Setup our time logic
    this.time_setup();
  },
  computed: {
    totalTimeGroups() {
      return this.time.groups.length;
    },
    totalVisitGroups() {
      return this.visit.groups.length;
    },
    currentTimeTick() {
      return this.time.currTick;
    },
    currentWeatherTick() {
      return this.weather.currTick;
    },
    currentTime() {
      if (this.time.now === null) {
        return null;
      }

      return this.time_getCurrent();
    },
    currentVisit() {
      return this.visit_getCurrent();
    },
  },
  watch: {
    currentTimeTick() {
      this.time_updateNow();
    },
    currentWeatherTick() {
      this.weather_getCurrent();
    },
  },
  methods: {
  //  ==========================================================================
  //  METHODS.TIME
  //  --------------------------------------------------------------------------

    // time_setup()
    //    Starts an interval to update the time used in the space scene
    //  ------------------------------------------------------------------------
    time_setup() {
      // Create interval for updating time data
      setInterval(this.time_tick, this.time.tickInterval);
    },

    // time_tick()
    //    Updates the time currTick with triggers, which triggers the watcher
    //    watch.currentTimeTick(). This update results in a new this.currentTime.
    //  ------------------------------------------------------------------------
    time_tick() {
      if (this.time.currTick >= this.time.maxTicks) {
        this.time.currTick = 0;
      } else {
        this.time.currTick += 1;
      }
    },

    // time_updateNow()
    //    Update time with a new now value using moment for magic
    //  ------------------------------------------------------------------------
    time_updateNow() {
      this.time.now = moment();
    },

    // time_getCurrent()
    //    Based on the current time (time.now) get the current time group and colors
    //  ------------------------------------------------------------------------
    time_getCurrent() {
      // Get the start + end colors - as well as the time used
      const range = this.time_getRange(this.time.now);
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
        now: this.time.now,
        group,
        color: {
          ...newColor,
          gradient,
        },
      };
    },

    // time_getRange()
    //    Based on a time, figure out the group it's currently in as well as the
    //    next time group
    //  ------------------------------------------------------------------------
    time_getRange(time) {
      const groups = [];
      // Current hour + minutes in military time
      const hour = parseInt(time.format('H'), 10);
      const minute = parseInt(time.format('m'), 10);

      for (let i = 0; i < this.totalTimeGroups; i += 1) {
        const nextIdx = (i + 1 < this.totalTimeGroups) ? i + 1 : 0;
        const currGroup = this.time.groups[i];
        const nextGroup = this.time.groups[nextIdx];

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


  //  ==========================================================================
  //  METHODS.WEATHER
  //  --------------------------------------------------------------------------

    //  weather_setup()
    //    Triggers an upate via weahter_tick, and starts an interval to update
    //    the weather continously
    //  ------------------------------------------------------------------------
    weather_setup() {
      this.weather_tick();
      setInterval(this.weather_tick, this.weather.tickInterval);
    },

    //  weather_tick()
    //    Similar to the time_tick() this updates the currTick which triggers
    //    a watcher that fetches the current weather data
    //  ------------------------------------------------------------------------
    weather_tick() {
      if (this.weather.currTick >= this.weather.maxTicks) {
        this.weather.currTick = 0;
      } else {
        this.weather.currTick += 1;
      }
    },

    //  weather_getCurrent()
    //    Based on the visitors currentLocaiton data get the weather for their
    //    region
    //  ------------------------------------------------------------------------
    weather_getCurrent() {
      const lat = this.currentLocation.lat;
      const lng = this.currentLocation.lng;
      const apiUrl = `${this.weather.baseAPIUrl}/${this.weather.apiKey}/${lat},${lng}?exclude=minutely,hourly,daily,alerts`;

      jsonp(apiUrl, null, (err, data) => {
        if (err) {
          return;
        }

        const currently = data.currently;
        currently.icon = currently.icon.replace('-night', '');
        currently.icon = currently.icon.replace('-day', '');

        this.currentWeather = {
          ...currently,
          unit: data.flags.units,
        };
      });
    },


  //  ==========================================================================
  //  METHODS.VISITS
  //  --------------------------------------------------------------------------

    //  visit_update()
    //    Update the current visit data for this new session
    //  ------------------------------------------------------------------------
    visit_update() {
      const isFirstVist = this.visit.total === 1;
      const timeSinceLastVisit = {
        seconds: this.time.now.diff(this.visit.lastTime, 'seconds'),
        minutes: this.time.now.diff(this.visit.lastTime, 'minutes'),
      };

      if (
        (isFirstVist && timeSinceLastVisit.seconds > 5)
        || (!isFirstVist && timeSinceLastVisit.minutes > 2)
      ) {
        this.$localStorage.set('totalVisits', this.visit.total + 1);
        this.$localStorage.set('lastVisit', this.time.now.format('x'));
      }
    },

    //  visit_getCurrent()
    //    Based on the users visit history, get the visit group they belong to
    //  ------------------------------------------------------------------------
    visit_getCurrent() {
      let foundGroup;

      for (let i = 0; i < this.totalVisitGroups; i += 1) {
        const group = this.visit.groups[i];

        if (this.visit.total <= group.minVisits || i === this.totalVisitGroups - 1) {
          foundGroup = group;
          break;
        }
      }

      return {
        count: this.visit.total,
        group: foundGroup,
      };
    },


  //  ==========================================================================
  //  METHODS.LOCATION
  //  --------------------------------------------------------------------------

    //  location_getCurrent()
    //    Get the vistors current location
    //  ------------------------------------------------------------------------
    location_getCurrent() {
      axios
        .post('https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAdqHKcbHf0sWy0iyiKtXOuDEW-TLCNE6k')
        .then((res) => {
          this.currentLocation = res.data.location;
          this.weather_setup();
        });
    },


  //  ==========================================================================
  //  OTHER METHODS
  //  --------------------------------------------------------------------------

    //  formatColor()
    //    Given an rgb color as an array or object format it to a string
    //  ------------------------------------------------------------------------
    formatColor(color) {
      const isArray = Array.isArray(color);
      const colorArr = (!isArray) ? [color.r, color.g, color.b] : color;
      const colorObj = (isArray) ? { r: color[0], g: color[1], b: color[2] } : color;

      return {
        asString: `rgb(${colorArr.join(',')})`,
        asArray: colorArr,
        asObject: colorObj,
        textColor: this.getTextColor(colorObj),
      };
    },

    //  getTextColor()
    //    https://stackoverflow.com/a/1855903
    //    Given an rgb color object get the best text color (light/dark) to show
    //  ------------------------------------------------------------------------
    getTextColor(color) {
      // Counting the perceptive luminance - human eye favors green color..
      const r = 0.299 * color.r;
      const g = 0.587 * color.g;
      const b = 0.114 * color.b;
      const a = 1 - ((r + g + b) / 255);
      return (a < 0.4) ? 'black' : 'white';
    },
  },
};
</script>

<template>
  <div id="app">
    <div class="app-left">
      <LiveScene 
        v-bind:time="currentTime"
        v-bind:visit="currentVisit"
        v-bind:weather="currentWeather"
      />
    </div>
    <div class="app-right">
      <Content
        v-bind:time="currentTime"
        v-bind:visit="currentVisit"
        v-bind:weather="currentWeather"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import './app';
</style>
