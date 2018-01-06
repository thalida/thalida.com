import Vue from 'vue';
import VueLocalStorage from 'vue-localstorage';
import moment from 'moment';

Vue.use(VueLocalStorage);

export default {
  numVisits: {
    type: Number,
    default: 1,
  },
  lastVisit: {
    type: Number,
    default: moment().format('x'),
  },
};
