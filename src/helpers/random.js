export default {
  name: 'helpers',
  getRandomInt(minArg, maxArg) {
    const min = Math.ceil(minArg);
    const max = Math.floor(maxArg);
    return Math.floor(Math.random() * (max - min)) + min;
  },
  getRandomFromArray(arr) {
    const total = arr.length;
    const index = this.getRandomInt(0, total);
    return arr[index];
  },
};
