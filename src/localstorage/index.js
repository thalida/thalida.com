import Vue from 'vue';
import VueLocalStorage from 'vue-localstorage';
import moment from 'moment';
import * as STORAGE_KEYS from './localstorageKeys';

Vue.use(VueLocalStorage);

export default {
  [STORAGE_KEYS.TOTAL_VISITS]: {
    type: Number,
    default: 1,
  },
  [STORAGE_KEYS.LAST_VISIT]: {
    type: Number,
    default: moment().format('x'),
  },
};
