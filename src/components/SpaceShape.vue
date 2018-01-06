<script>
export default {
  name: 'SpaceShape',
  props: ['type', 'size', 'css', 'classes'],
};
</script>

<template>
  <div v-if="type === 'sun'" :class="[type, size]">
    <div class="sun-core"></div>
  </div>
  <div v-else-if="type === 'earth'" :class="[type, size]">
    <div class="earth-planet">
      <div class="planet-land-container" :class="classes.land" >
        <div class="planet-land land-1"></div>
        <div class="planet-land land-2"></div>
        <div class="planet-land land-3"></div>
      </div>
      <div 
        class="earth-planet-shadow" 
        v-bind:style="css.shadow">
      </div>
    </div>
    <div 
      class="earth-ozone" 
      :class="classes.ozone" 
      v-bind:style="css.ozone">
    </div>
    <div class="earth-weather"></div>
  </div>
  <div 
    v-else-if="type === 'weather-cloudy' 
            || type === 'weather-partly-cloudy' 
            || type === 'weather-fog'" 
    :class="[type, size]">
    <div class="cloud cloud-1"></div>
    <div class="cloud cloud-2" 
         v-if="type !== 'weather-partly-cloudy'">
    </div>
  </div>
  <div v-else :class="[type, size]" v-bind:style="css"></div>
</template>

<style lang="scss">
@import '../assets/styles/_variables';
.star {
  background-color: $space-stars-color;
  border-radius: 50%;
  
  &.small {
    width: 2px;
    height: 2px;
  }
  
  &.medium {
    width: 4px;
    height: 4px;
  }
  
  &.large {
    width: 8px;
    height: 8px;
  }
}

.sun {
  $sun-width: 64px;
  $sun-height: 64px;

  $sun-ray-height: 96px;
  $sun-ray-width: 96px;

  display: block;
  position: relative;

  .sun-core {
    display: block;
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: $space-sun-color;
  }

  .sun-core:before,
  .sun-core:after,
  &:before,
  &:after {
    content: "";
    display: block;
    position: absolute;
    width: $sun-ray-width;
    height: $sun-ray-height;
    border-radius: 50%;
    background-color: rgba($space-sun-color, 0.05);
    z-index: 1;
  }

  &:before,
  &:after {
    left: -1 * (($sun-ray-width - $sun-width) / 2);
  }

  .sun-core:before,
  .sun-core:after {
    top: -1 * (($sun-ray-height - $sun-height) / 2);
  }

  &:before {
    bottom: 0;
  }

  &:after {
    top: 0;
  }

  .sun-core:before {
    right: 0;
  }

  .sun-core:after {
    left: 0;
  }
}

.moon {
  display: block;
  position: relative;
  width: 24px;
  height: 24px;
  overflow: hidden;
  border-radius: 50%;
  background-color: $space-moon-color;

  &:before,
  &:after {
    content: "";
    display: block;
    position: relative;
    background-color: darken($space-moon-color, 10%);
    border-radius: 50%;
  }

  &:before {
    width: 60%;
    height: 60%;
  }

  &:after {
    width: 30%;
    height: 30%;
    margin: 2px 0 0 12px;
  }
}

.earth {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 192px;
  height: 192px;

  .earth-ozone {
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: white;
    opacity: 0.3;
  }

  .earth-planet {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: $space-earth-water-color;
    overflow: hidden;
  }

  .earth-planet-shadow {
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border-radius: 50%;
    box-shadow: inset 0px 0 0 0 rgba(0, 0, 0, 0.10);
    transition: box-shadow 2s;
  }

  .planet-land-container {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
  }

  .planet-land {
    border-radius: 50%;
    background-color: $space-earth-land-color;

    &.land-1 {
      width: 64%;
      height: 64%;
    }

    &.land-2 {
      width: 32%;
      height: 32%;
      margin-top: 18%;
      margin-left: 20%;
    }

    &.land-3 {
      width: 16%;
      height: 16%;
      margin-top: -32%;
      margin-left: 96%;
    }
  }
}

.weather {
  &-clear {}

  &-rain,
  &-snow,
  &-sleet,
  &-wind {
    &,
    &:before, 
    &:after {
      content: "";
      display: block;
      position: relative;
      border-radius: 50%;
      width: 4px;
      height: 4px;
    }

    &:before {
      top: -8px;
      left: 12px;
    }

    &:after {
      top: 8px;
      left: 8px;
    }
  }

  &-rain {
    &,
    &:before, 
    &:after {
      width: 2px;
      height: 4px;
      background-color: $weather-rain-color;
    }
  }

  &-snow {
    &,
    &:before, 
    &:after {
      background-color: $weather-snow-color;
    }
  }

  &-sleet {
    &,
    &:before, 
    &:after {
      width: 3px;
      height: 4px;
      background-color: $weather-sleet-color;
    }
  }

  &-wind {
    &,
    &:before, 
    &:after {
      width: 16px;
      height: 1px;
      border-radius: 0;
      background-color: $weather-sleet-color;
    }

    &:before {
      top: -4px;
    }

    &:after {
      top: 4px;
    }
  }

  .cloud {
    display: inline-block;

    &:before, 
    &:after {
      content: "";
      display: block;
    }

    &,
    &:before, 
    &:after {
      position: relative;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      background-color: $weather-cloud-color;
    }

    &.cloud-1 {
      &:after {
        display: none;
      }

      &:before {
        width: 12px;
        height: 12px;
        left: -8px;
        top: 8px;
      }
    }

    &.cloud-2 {
      &:before {
        width: 8px;
        height: 8px;
        left: -4px;
        top: 6px;
      }

      &:after {
        width: 12px;
        height: 12px;
        left: 10px;
        top: -4px;
      }
    }
  }

  &-fog {
    opacity: 0.8;
  }
}
</style>
