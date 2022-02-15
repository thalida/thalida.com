<script>
  import { afterUpdate } from "svelte";
  import { gradient } from "../store";

  let isLoading = true;
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

  export function getSkewAndRotateTransform(blindIndex) {
    const currBlind = NUM_BLINDS - blindIndex;
    const skewSteps =
      liveWindowSettings.blindsSkewDeg /
      (NUM_BLINDS - liveWindowSettings.numBlindsCollpased);

    let skewDeg = 0;
    if (
      liveWindowSettings.skewDirection !== 0 &&
      liveWindowSettings.blindsSkewDeg >= 0
    ) {
      skewDeg =
        liveWindowSettings.blindsSkewDeg -
        (currBlind - liveWindowSettings.numBlindsCollpased - 1) * skewSteps;
    }
    const rotateDeg = liveWindowSettings.blindsOpenDeg;
    const rotate = `rotateX(${rotateDeg}deg)`;
    const skew = `skewY(${skewDeg * liveWindowSettings.skewDirection}deg)`;
    return `${rotate} ${skew}`;
  }

  export function getSkewOnlyTransform() {
    let skewDeg = 0;
    if (
      liveWindowSettings.skewDirection !== 0 &&
      liveWindowSettings.blindsSkewDeg >= 0
    ) {
      skewDeg = liveWindowSettings.blindsSkewDeg / 2;
    }
    const skew = `skewY(${skewDeg * liveWindowSettings.skewDirection}deg)`;
    return `${skew}`;
  }

  function updateStrings() {
    const blinds = document.querySelector(".blinds");
    const blindsRect = blinds.getBoundingClientRect();
    const leftStringEnd = blinds.querySelector(".string-left-end");
    const rightStringEnd = blinds.querySelector(".string-right-end");
    const leftStringTop = leftStringEnd.getBoundingClientRect().top;
    const rightStringTop = rightStringEnd.getBoundingClientRect().top;
    const leftHeight = leftStringTop - blindsRect.top;
    const rightHeight = rightStringTop - blindsRect.top;
    liveWindowSettings.string.leftHeight = `${leftHeight}px`;
    liveWindowSettings.string.rightHeight = `${rightHeight}px`;
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
  });

  gradient.subscribe((newGradient) => {
    if (newGradient.start && isLoading) {
      isLoading = false;
      runAnimation();
    }
  });
</script>

{#key blindsRenderKey}
  <div
    class="blinds"
    style="
    --live-window-num-blinds: {NUM_BLINDS};"
  >
    <div class="slats">
      {#each new Array(NUM_BLINDS - liveWindowSettings.numBlindsCollpased) as _, blindIndex}
        <div
          class="slat slat-{blindIndex + 1}"
          style:transform={getSkewAndRotateTransform(blindIndex)}
        />
      {/each}
      <div class="slat-collapse-group" style:transform={getSkewOnlyTransform()}>
        {#each new Array(liveWindowSettings.numBlindsCollpased) as _, blindIndex}
          <div class="slat collapse" />
        {/each}
      </div>
      <div class="slat-bar" style:transform={getSkewOnlyTransform()}>
        <div class="string string-left-end" />
        <div class="string string-right-end" />
      </div>
    </div>
    <div class="rod" />
    <div class="strings">
      <div class="string" style:height={liveWindowSettings.string.leftHeight} />
      <div
        class="string"
        style:height={liveWindowSettings.string.rightHeight}
      />
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
    width: calc(
      var(--live-window-width) * var(--live-window-blinds-width-scale)
    );
    height: auto;

    .rod {
      position: absolute;
      width: 5px;
      left: 18%;
      height: calc(
        var(--live-window-height) * var(--live-window-rod-height-scale)
      );
      background: var(--color-bg-default);
    }

    .strings,
    .slat-bar {
      position: absolute;
      display: flex;
      flex-flow: row nowrap;
      justify-content: space-between;
      width: 100%;
      padding: 0 25%;

      .string {
        width: 2px;
        height: 100%;
        background: var(--color-bg-default);
      }
    }

    .strings {
      height: 100%;
    }

    .slat-bar {
      height: 10px;
      background: var(--color-bg-default);
    }

    .slats {
      position: relative;
      width: 100%;

      .slat {
        position: relative;
        width: 100%;
        background: var(--color-bg-default);

        &:not(.collapse) {
          height: calc(
            var(--live-window-height) / (var(--live-window-num-blinds) - 1)
          );
        }

        &.collapse {
          height: calc(
            (var(--live-window-height) / (var(--live-window-num-blinds) - 1)) *
              var(--live-window-collapsed-slat-height-scale)
          );
        }
      }
    }
  }
</style>
