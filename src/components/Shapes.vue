<script>
export default {
  name: 'Shapes',
  props: ['shape'],
};
</script>

<template>
  <div class="shape">
    <svg v-if="shape === 'diamond'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g class="shape-path" fill="#000000" stroke="none" stroke-width="1">
            <polygon points="50 0 100 50 50 100 0 50"></polygon>
        </g>
    </svg>
    <svg v-else-if="shape === 'hexagon'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g class="shape-path" fill="#000000" stroke="none" stroke-width="1">
            <polygon points="50 0 93.3012702 25 93.3012702 75 50 100 6.69872981 75 6.69872981 25"></polygon>
        </g>
    </svg>
    <svg v-else-if="shape === 'octagon'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g class="shape-path" fill="#000000" stroke="none" stroke-width="1">
            <polygon points="50 0 85.3553391 14.6446609 100 50 85.3553391 85.3553391 50 100 14.6446609 85.3553391 0 50 14.6446609 14.6446609"></polygon>
        </g>
    </svg>
    <svg v-else-if="shape === 'circle'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <circle class="shape-path" fill="#000000" cx="50" cy="50" r="50"></circle>
    </svg>
    <svg v-else-if="shape === 'pentagon'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g class="shape-path" fill="#000000" stroke="none" stroke-width="1">
            <polygon points="50 4 97.5528258 38.5491503 79.3892626 94.4508497 20.6107374 94.4508497 2.44717419 38.5491503"></polygon>
        </g>
    </svg>
    <svg v-else-if="shape === 'rectangle'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect class="shape-path" fill="#000000" x="0" y="0" width="100" height="100"></rect>
    </svg>
    <svg v-else-if="shape === 'triangle'" class="shape-svg" width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g class="shape-path" fill="#000000" stroke="none" stroke-width="1">
            <polygon points="50 0 100 100 0 100"></polygon>
        </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
  @import '../assets/styles/_variables';

  .shape {
    .shape-svg {
        height: $shape-height;
        width: $shape-width;
    }
    .shape-path {
      fill: white;
    }
  }
</style>
