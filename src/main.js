// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import App from './App';
import localStorage from './localstorage';

Vue.config.productionTip = false;

/* eslint-disable no-new */
new Vue({
  el: '#app',
  localStorage,
  template: '<App/>',
  components: { App },
});
