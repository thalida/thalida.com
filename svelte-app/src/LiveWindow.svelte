<script>
  import { afterUpdate } from "svelte";
  export const time = {
    hour: 0,
    minute: 0,
  };
  const liveWindowSize = {
    width: 25,
    height: 40,
    minWidth: 250,
    minHeight: 400,
  };

  export const numBlinds = 20;
  export let numBlindsCollpased = 0;
  export let maxBlindsOpenDeg = 20;
  export let collapsedBlindRotateDeg = 70;
  export let maxSkewDeg = numBlindsCollpased === 0 ? 0 : 30;
  export let skewDirection = 0;
  export let leftStringHeight = "100%";
  export let rightStringHeight = "100%";
  export let blindRenderKey = 0;

  export const liveWindowHeight = `${liveWindowSize.height}vh`;
  export const liveWindowMinHeight = `${liveWindowSize.minHeight}px`;
  export const liveWindowInnerWidth = `${liveWindowSize.width}vw`;
  export const liveWindowInnerMinWidth = `${liveWindowSize.minWidth}px`;
  export const rodHeightScale = 0.75;
  export const blindsWidthScale = 1.4;
  export const collapsedSlatHeightScale = 0.3;

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
    const isCollapsed = getIsCollapsed(blindIndex);
    const currBlind = numBlinds - blindIndex;
    const skewSteps = maxSkewDeg / (numBlinds - numBlindsCollpased);
    let skewDeg = 0;

    if (skewDirection !== 0 && maxSkewDeg >= 0) {
      if (!isCollapsed) {
        skewDeg = maxSkewDeg - (currBlind - numBlindsCollpased - 1) * skewSteps;
      } else {
        skewDeg = maxSkewDeg;
      }
    }
    const rotateDeg = isCollapsed
      ? collapsedBlindRotateDeg - skewDeg
      : maxBlindsOpenDeg - skewDeg;
    const rotate = `rotateX(${rotateDeg}deg)`;
    const skew = `skewY(${skewDeg * skewDirection}deg)`;
    return `${rotate} ${skew}`;
  }

  function updateStrings() {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    const selectNext = numBlindsCollpased === 0 ? 0 : 1;
    const guideBlind = document.querySelector(
      `.slat-${numBlinds - numBlindsCollpased + selectNext}`
    );
    const guideBlindRect = guideBlind.getBoundingClientRect();

    let shortString, longString;

    if (numBlindsCollpased === 0) {
      shortString = guideBlindRect.top - blindsRect.top;
      longString =
        guideBlindRect.top + guideBlindRect.height / 2 - blindsRect.top;
    } else {
      shortString =
        guideBlindRect.top + guideBlindRect.height / 2 - blindsRect.top;
      longString = guideBlindRect.top + guideBlindRect.height - blindsRect.top;
    }
    const shortStringHeight = `${shortString}px`;
    const longStringHeight = `${longString}px`;

    if (skewDirection === -1) {
      leftStringHeight = longStringHeight;
      rightStringHeight = shortStringHeight;
    } else if (skewDirection === 1) {
      leftStringHeight = shortStringHeight;
      rightStringHeight = longStringHeight;
    } else {
      leftStringHeight = shortString;
      rightStringHeight = shortString;
    }
  }

  function updateSlats() {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    const allSlides = document.querySelectorAll(".slat");
    for (let i = 1; i < allSlides.length; i += 1) {
      const prevSlide = allSlides[i - 1];
      const currSlide = allSlides[i];
      const prevSlideRect = prevSlide.getBoundingClientRect();
      const isCollapsed = currSlide.classList.contains("collapse");

      if (isCollapsed) {
        const skewFix = skewDirection === 0 || maxSkewDeg <= 0 ? 1 : maxSkewDeg;
        const top =
          prevSlideRect.top + prevSlideRect.height / skewFix - blindsRect.top;
        currSlide.style.top = `${top}px`;
      }
    }
  }

  function updateBlinds() {
    updateStrings();
    updateSlats();
  }

  function animate() {
    setTimeout(() => {
      const percentageCollpased = 0.75;
      numBlindsCollpased = numBlinds * percentageCollpased;
      maxBlindsOpenDeg = 70;
      maxSkewDeg = numBlindsCollpased === 0 ? 0 : 10;
      skewDirection = 1;
      blindRenderKey += 1;
    }, 600);
  }

  function startClock() {
    setInterval(() => {
      const today = new Date();
      time.hour = today.getHours();
      time.minute = today.getMinutes();
    }, 100);
  }

  startClock();
  afterUpdate(updateBlinds);
  animate();
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
  <div class="clock">
    <span>{time.hour < 10 ? "0" : ""}{time.hour}</span>
    <span class="seperator">:</span>
    <span>{time.minute < 10 ? "0" : ""}{time.minute}</span>
  </div>
  {#key blindRenderKey}
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
    <div class="horizontal-bar" />
  {/key}
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

    .clock {
      position: absolute;
      display: flex;
      flex-flow: row nowrap;
      justify-content: center;
      align-items: center;
      bottom: -2px;
      right: 20%;
      z-index: 2;
      background: var(--color-bg-default);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 24px;
      font-family: "Squada One";
      color: var(--color-text-red);

      &:before {
        content: "";
        position: absolute;
        top: -3px;
        height: 3px;
        width: 40%;
        border-radius: 3px 3px 0 0;
        background: var(--color-bg-default);
      }
    }

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

    .horizontal-bar {
      position: absolute;
      display: flex;
      flex-flow: column nowrap;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 15px;
      background: var(--color-bg-default);
      top: calc((100% - 15px) / 2);
      z-index: 1;

      &::before {
        content: "";
        position: absolute;
        top: -5px;
        width: 8%;
        height: 5px;
        border-radius: 5px 5px 0 0;
        background: var(--color-bg-default);
      }
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
          transition: all ease-in-out 100ms;
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
          transition: all ease-in-out 200ms;

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
