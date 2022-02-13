<script>
  import { afterUpdate } from "svelte";
  export const numBlinds = 20;
  export const numBlindsCollpased = 0;
  export const maxBlindsOpenDeg = 20; // 20 - 70
  export const maxSkewDeg = numBlindsCollpased === 0 ? 0 : 30;
  export const skewDirection = -1;
  export let stringHeight = "100%";

  afterUpdate(() => {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    let guideBlind = document.querySelector(
      `.slat-${numBlinds - numBlindsCollpased}`
    );
    const guideBlindRect = guideBlind.getBoundingClientRect();
    const stringLength = guideBlindRect.bottom - blindsRect.top - 1;
    stringHeight = `${stringLength}px`;

    const allSlides = document.querySelectorAll(".slat");
    for (let i = 1; i < allSlides.length; i += 1) {
      const prevSlide = allSlides[i - 1];
      const currSlide = allSlides[i];
      const prevSlideRect = prevSlide.getBoundingClientRect();
      const isCollapsed = currSlide.classList.contains("collapse");

      if (isCollapsed) {
        const skewFix = maxSkewDeg <= 0 ? 1 : maxSkewDeg;
        currSlide.style.top = `${
          prevSlideRect.top + prevSlideRect.height / skewFix - blindsRect.top
        }px`;
      }
    }
  });

  export function getIsCollapsed(blindIndex) {
    return blindIndex + numBlindsCollpased >= numBlinds;
  }

  export function getSlatHeight(blindIndex) {
    const isCollapsed = getIsCollapsed(blindIndex);
    const height = 40 / (numBlinds - 1);
    return isCollapsed ? `${height / 2}vh` : `${height}vh`;
  }

  export function getSlatMinHeight(blindIndex) {
    const isCollapsed = getIsCollapsed(blindIndex);
    const minHeight = 400 / (numBlinds - 1);
    return isCollapsed ? `${minHeight / 2}px` : `${minHeight}px`;
  }

  export function getSlatTransformOrigin() {
    const transformOrigin = skewDirection === -1 ? "top right" : "top left";
    return transformOrigin;
  }

  export function getSlatTransform(blindIndex) {
    const currBlind = numBlinds - blindIndex;
    const skewSteps = maxSkewDeg / numBlinds;
    const skewDeg = maxSkewDeg - currBlind * skewSteps;
    const rotateDeg = maxBlindsOpenDeg - skewDeg;
    const rotate = `rotateX(${rotateDeg}deg)`;
    const skew = `skewY(${skewDeg * skewDirection}deg)`;
    return `${rotate} ${skew}`;
  }
</script>

<div class="live-window">
  <div class="rod" />
  <div class="blinds">
    <div class="strings" style:height={stringHeight}>
      <div class="string" />
      <div class="string" />
    </div>
    <div class="slats">
      {#each new Array(numBlinds) as _, blindIndex}
        <div
          class="slat slat-{blindIndex + 1}"
          class:collapse={getIsCollapsed(blindIndex)}
          style:transform={getSlatTransform(blindIndex)}
          style:transform-origin={getSlatTransformOrigin()}
          style:height={getSlatHeight(blindIndex)}
          style:min-height={getSlatMinHeight(blindIndex)}
        />
      {/each}
    </div>
  </div>
  <div class="sky" />
</div>

<style lang="scss">
  .live-window {
    position: relative;
    display: flex;
    flex-flow: column nowrap;
    justify-content: flex-start;
    align-items: center;
    height: 40vh;
    min-height: 400px;

    .rod {
      position: absolute;
      width: 5px;
      height: 75%;
      min-height: 300px;
      left: 18%;
      z-index: 2;
      background: var(--color-bg-default);
    }

    .blinds {
      position: relative;
      display: flex;
      flex-flow: column nowrap;
      justify-content: flex-start;
      align-items: center;
      z-index: 1;
      width: 34vw;
      min-width: 340px;
      height: auto;

      .strings {
        position: absolute;
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        padding: 0 25%;

        .string {
          width: 2px;
          height: 100%;
          background: var(--color-bg-default);
        }
      }

      .slats {
        position: relative;
        width: 100%;
        z-index: -1;

        .slat {
          position: relative;
          width: 100%;
          background: var(--color-bg-default);

          &.collapse {
            position: absolute;
            left: 0;
            &:before,
            &:after {
              content: "";
              position: absolute;
              width: 2px;
              height: 200%;
              background: var(--color-bg-default);
            }

            &:before {
              top: -100%;
              left: 25%;
            }

            &:after {
              top: -100%;
              right: 25%;
            }
          }
        }
      }
    }
    .sky {
      position: absolute;
      height: 100%;
      width: 25vw;
      min-width: 250px;
      background: blue;
    }
  }
</style>
