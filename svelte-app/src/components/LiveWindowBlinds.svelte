<script>
  import { afterUpdate } from "svelte";

  export let blindsRenderKey = 0;
  export const NUM_BLINDS = 20;
  export const COLLAPSED_BLINDS_ROTATE_DEG = 70;

  export const liveWindowSettings = {
    numBlindsCollpased: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
    string: {
      leftHeight: "100%",
      rightHeight: "100%",
    },
  };

  export function getIsCollapsed(blindIndex) {
    return blindIndex + liveWindowSettings.numBlindsCollpased >= NUM_BLINDS;
  }

  export function getASkewClass() {
    return liveWindowSettings.skewDirection === 1
      ? "askew-left"
      : liveWindowSettings.skewDirection === -1
      ? "askew-right"
      : "not-askew";
  }

  export function getSlatTransform(blindIndex) {
    const isCollapsed = getIsCollapsed(blindIndex);
    const currBlind = NUM_BLINDS - blindIndex;
    const skewSteps =
      liveWindowSettings.blindsSkewDeg /
      (NUM_BLINDS - liveWindowSettings.numBlindsCollpased);
    let skewDeg = 0;

    if (
      liveWindowSettings.skewDirection !== 0 &&
      liveWindowSettings.blindsSkewDeg >= 0
    ) {
      if (!isCollapsed) {
        skewDeg =
          liveWindowSettings.blindsSkewDeg -
          (currBlind - liveWindowSettings.numBlindsCollpased - 1) * skewSteps;
      } else {
        skewDeg = liveWindowSettings.blindsSkewDeg;
      }
    }
    const rotateDeg = isCollapsed
      ? COLLAPSED_BLINDS_ROTATE_DEG - skewDeg
      : liveWindowSettings.blindsOpenDeg - skewDeg;
    const rotate = `rotateX(${rotateDeg}deg)`;
    const skew = `skewY(${skewDeg * liveWindowSettings.skewDirection}deg)`;
    return `${rotate} ${skew}`;
  }

  function updateStrings() {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    const selectNext = liveWindowSettings.numBlindsCollpased === 0 ? 0 : 1;
    const guideBlind = document.querySelector(
      `.slat-${NUM_BLINDS - liveWindowSettings.numBlindsCollpased + selectNext}`
    );
    const guideBlindRect = guideBlind.getBoundingClientRect();

    let shortString, longString;

    if (liveWindowSettings.numBlindsCollpased === 0) {
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

    if (liveWindowSettings.skewDirection === -1) {
      liveWindowSettings.string.leftHeight = longStringHeight;
      liveWindowSettings.string.rightHeight = shortStringHeight;
    } else if (liveWindowSettings.skewDirection === 1) {
      liveWindowSettings.string.leftHeight = shortStringHeight;
      liveWindowSettings.string.rightHeight = longStringHeight;
    } else {
      liveWindowSettings.string.leftHeight = shortString;
      liveWindowSettings.string.rightHeight = shortString;
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
        const skewFix =
          liveWindowSettings.skewDirection === 0 ||
          liveWindowSettings.blindsSkewDeg <= 0
            ? 1
            : liveWindowSettings.blindsSkewDeg;
        const top =
          prevSlideRect.top + prevSlideRect.height / skewFix - blindsRect.top;
        currSlide.style.top = `${top}px`;
      }
    }
  }

  function stepAnimation(animateFrom, targetAnimations, speedMs = 100) {
    const animateTo = { ...targetAnimations };
    return new Promise((resolve) => {
      const blindsInterval = setInterval(() => {
        let finishedAnimations = 0;
        const numAnimations = Object.keys(animateTo).length;
        for (const [prop, animation] of Object.entries(animateTo)) {
          let reachedTarget;
          let direction = animateFrom[prop] < animation.targetValue ? 1 : -1;
          animateFrom[prop] += animation.step * direction;

          if (direction === -1) {
            reachedTarget = animateFrom[prop] <= animation.targetValue;
          } else {
            reachedTarget = animateFrom[prop] >= animation.targetValue;
          }

          if (!reachedTarget) {
            continue;
          }

          finishedAnimations += 1;
          delete animateTo[prop];
        }

        blindsRenderKey += 1;

        if (finishedAnimations >= numAnimations) {
          clearInterval(blindsInterval);
          resolve();
        }
      }, speedMs);
    });
  }

  function runAnimation() {
    stepAnimation(
      liveWindowSettings,
      {
        blindsOpenDeg: {
          targetValue: 75,
          step: 5,
        },
      },
      150
    ).then(() => {
      stepAnimation(liveWindowSettings, {
        blindsOpenDeg: {
          targetValue: 80,
          step: 1,
        },
        numBlindsCollpased: {
          targetValue: NUM_BLINDS * 0.7,
          step: 1,
        },
        blindsSkewDeg: {
          targetValue: 5,
          step: 1,
        },
        skewDirection: {
          targetValue: -1,
          step: 1,
        },
      });
    });
  }

  afterUpdate(() => {
    updateStrings();
    updateSlats();
  });

  runAnimation();
</script>

{#key blindsRenderKey}
  <div
    class="blinds"
    style="
    --live-window-num-blinds: {NUM_BLINDS};"
  >
    <div class="rod" />
    <div class="strings">
      <div class="string" style:height={liveWindowSettings.string.leftHeight} />
      <div
        class="string"
        style:height={liveWindowSettings.string.rightHeight}
      />
    </div>
    <div class="slats {getASkewClass()}">
      {#each new Array(NUM_BLINDS - liveWindowSettings.numBlindsCollpased + liveWindowSettings.numBlindsCollpased) as _, blindIndex}
        <div
          class="slat slat-{blindIndex + 1}"
          class:collapse={getIsCollapsed(blindIndex)}
          style:transform={getSlatTransform(blindIndex)}
        />
      {/each}
    </div>
  </div>
{/key}

<style lang="scss">
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
      var(--live-window-inner-min-width) * var(--live-window-blinds-width-scale)
    );
    height: auto;

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
            var(--live-window-min-height) / (var(--live-window-num-blinds) - 1)
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
</style>
