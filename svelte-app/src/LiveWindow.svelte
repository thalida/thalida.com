<script>
  import { afterUpdate } from "svelte";
  const liveWindowSize = {
    width: 25,
    height: 40,
    minWidth: 250,
    minHeight: 400,
  };
  export const liveWindowHeight = `${liveWindowSize.height}vh`;
  export const liveWindowMinHeight = `${liveWindowSize.minHeight}px`;
  export const liveWindowInnerWidth = `${liveWindowSize.width}vw`;
  export const liveWindowInnerMinWidth = `${liveWindowSize.minWidth}px`;
  export const blindsWidthScale = 1.4;
  export const collapsedSlatHeightScale = 0.5;
  export const rodHeightScale = 0.75;

  export const numBlinds = 20;
  export const numBlindsCollpased = 5;
  export const maxBlindsOpenDeg = 70; // 20 - 70
  export const maxSkewDeg = numBlindsCollpased === 0 ? 0 : 30;
  export const skewDirection = 0;
  export let leftStringHeight = "100%";
  export let rightStringHeight = "100%";

  afterUpdate(() => {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    let guideBlind = document.querySelector(
      `.slat-${numBlinds - numBlindsCollpased}`
    );
    const guideBlindRect = guideBlind.getBoundingClientRect();
    const shortString =
      guideBlindRect.top + guideBlindRect.height / 2 - blindsRect.top;
    const longString = guideBlindRect.bottom - blindsRect.top;
    const shortStringHeight = `${shortString}px`;
    const longStringHeight = `${longString}px`;

    if (skewDirection === -1) {
      leftStringHeight = longStringHeight;
      rightStringHeight = shortStringHeight;
    } else if (skewDirection === 1) {
      leftStringHeight = shortStringHeight;
      rightStringHeight = longStringHeight;
    } else {
      leftStringHeight = longStringHeight;
      rightStringHeight = longStringHeight;
    }

    const allSlides = document.querySelectorAll(".slat");
    for (let i = 1; i < allSlides.length; i += 1) {
      const prevSlide = allSlides[i - 1];
      const currSlide = allSlides[i];
      const prevSlideRect = prevSlide.getBoundingClientRect();
      const isCollapsed = currSlide.classList.contains("collapse");

      if (isCollapsed) {
        const skewFix = skewDirection === 0 || maxSkewDeg <= 0 ? 1 : maxSkewDeg;
        currSlide.style.top = `${
          prevSlideRect.top + prevSlideRect.height / skewFix - blindsRect.top
        }px`;
      }
    }
  });

  export function getIsCollapsed(blindIndex) {
    return blindIndex + numBlindsCollpased >= numBlinds;
  }

  export function getASkewClass() {
    return skewDirection === 1
      ? "askew-left"
      : skewDirection === -1
      ? "askew-right"
      : "not-askew";
  }

  export function getSlatTransform(blindIndex) {
    const currBlind = numBlinds - blindIndex;
    const skewSteps = maxSkewDeg / numBlinds;
    const skewDeg =
      skewDirection === 0 ? 0 : maxSkewDeg - currBlind * skewSteps;
    const rotateDeg = maxBlindsOpenDeg - skewDeg;
    const rotate = `rotateX(${rotateDeg}deg)`;
    const skew = `skewY(${skewDeg * skewDirection}deg)`;
    return `${rotate} ${skew}`;
  }
</script>

<div
  class="live-window"
  style="
    --live-window-num-blinds: {numBlinds};
    --live-window-height: {liveWindowHeight};
    --live-window-min-height: {liveWindowMinHeight};
    --live-window-inner-width: {liveWindowInnerWidth};
    --live-window-inner-min-width: {liveWindowInnerMinWidth};
    --live-window-blinds-width-scale: {blindsWidthScale};
    --live-window-collapsed-slat-height-scale: {collapsedSlatHeightScale};
    --live-window-rod-height-scale: {rodHeightScale};
  "
>
  <div class="rod" />
  <div class="blinds">
    <div class="strings">
      <div class="string" style:height={leftStringHeight} />
      <div class="string" style:height={rightStringHeight} />
    </div>
    <div class="slats {getASkewClass()}">
      {#each new Array(numBlinds) as _, blindIndex}
        <div
          class="slat slat-{blindIndex + 1}"
          class:collapse={getIsCollapsed(blindIndex)}
          style:transform={getSlatTransform(blindIndex)}
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
    height: var(--live-window-height);
    min-height: var(--live-window-min-height);

    .rod {
      z-index: 2;
      position: absolute;
      width: 5px;
      left: 18%;
      height: 75%;
      min-height: calc(
        var(--live-window-min-height) * var(--live-window-rod-height-scale)
      );
      background: var(--color-bg-default);
    }

    .blinds {
      position: relative;
      display: flex;
      flex-flow: column nowrap;
      justify-content: flex-start;
      align-items: center;
      z-index: 1;
      width: calc(
        var(--live-window-inner-width) * var(--live-window-blinds-width-scale)
      );
      min-width: calc(
        var(--live-window-inner-min-width) *
          var(--live-window-blinds-width-scale)
      );
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

        &.askew-left .slat {
          transform-origin: top left;
        }

        &.askew-right .slat {
          transform-origin: top right;
        }

        &.not-askew .slat {
          transform-origin: top center;
        }

        .slat {
          position: relative;
          width: 100%;
          background: var(--color-bg-default);

          &:not(.collapse) {
            height: calc(
              var(--live-window-height) / (var(--live-window-num-blinds) - 1)
            );
            min-height: calc(
              var(--live-window-min-height) /
                (var(--live-window-num-blinds) - 1)
            );
          }

          &.collapse {
            position: absolute;
            left: 0;
            height: calc(
              (var(--live-window-height) / (var(--live-window-num-blinds) - 1)) *
                var(--live-window-collapsed-slat-height-scale)
            );
            min-height: calc(
              (
                  var(--live-window-min-height) /
                    (var(--live-window-num-blinds) - 1)
                ) * var(--live-window-collapsed-slat-height-scale)
            );

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
      width: var(--live-window-inner-width);
      min-width: var(--live-window-inner-min-width);
      background: blue;
    }
  }
</style>
