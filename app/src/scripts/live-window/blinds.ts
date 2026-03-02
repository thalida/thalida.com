export const NUM_BLINDS = 20;

export type AnimatableProp = "numBlindsCollapsed" | "blindsOpenDeg" | "blindsSkewDeg" | "skewDirection";

export interface BlindsState {
  numBlindsCollapsed: number;
  blindsOpenDeg: number;
  blindsSkewDeg: number;
  skewDirection: number;
}

export function createBlindsState(): BlindsState {
  return {
    numBlindsCollapsed: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
  };
}

function getSkewAndRotateTransform(blindIndex: number, state: BlindsState): string {
  const currBlind = NUM_BLINDS - blindIndex;
  const numOpen = NUM_BLINDS - state.numBlindsCollapsed;
  const skewSteps = numOpen > 0 ? state.blindsSkewDeg / numOpen : 0;

  let skewDeg = 0;
  if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
    skewDeg = state.blindsSkewDeg - (currBlind - state.numBlindsCollapsed - 1) * skewSteps;
  }

  const rot = state.blindsOpenDeg;
  return `rotateX(${rot}deg) skewY(${skewDeg * state.skewDirection}deg)`;
}

function getSkewOnlyTransform(state: BlindsState): string {
  let skewDeg = 0;
  if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
    skewDeg = state.blindsSkewDeg / 2;
  }
  return `skewY(${skewDeg * state.skewDirection}deg)`;
}

export function renderBlinds(el: HTMLElement, state: BlindsState): void {
  const numOpen = NUM_BLINDS - Math.round(state.numBlindsCollapsed);
  const numCollapsed = Math.round(state.numBlindsCollapsed);

  let slats = "";
  for (let i = 0; i < numOpen; i++) {
    slats += `<div class="slat slat-${i + 1}" style="transform:${getSkewAndRotateTransform(i, state)}"></div>`;
  }

  const skew = getSkewOnlyTransform(state);
  slats += `<div class="slat-collapse-group" style="transform:${skew}">`;
  for (let i = 0; i < numCollapsed; i++) {
    slats += '<div class="slat collapse"></div>';
  }
  slats += "</div>";

  slats += `<div class="slat-bar" style="transform:${skew}">`;
  slats += '<span class="string-marker string-marker-left"></span>';
  slats += '<span class="string-marker string-marker-right"></span>';
  slats += "</div>";

  el.innerHTML = `
    <div class="slats">${slats}</div>
    <div class="rod"></div>
  `;
}

export function updateStrings(
  shadow: ShadowRoot,
  stringLeftEl: HTMLDivElement | null,
  stringRightEl: HTMLDivElement | null,
): void {
  const win = shadow.querySelector(".live-window");
  const ml = shadow.querySelector(".string-marker-left");
  const mr = shadow.querySelector(".string-marker-right");
  if (!win || !ml || !mr) return;

  const winTop = win.getBoundingClientRect().top;

  if (stringLeftEl) stringLeftEl.style.height = `${ml.getBoundingClientRect().top - winTop}px`;
  if (stringRightEl) stringRightEl.style.height = `${mr.getBoundingClientRect().top - winTop}px`;
}

export function stepAnimation(
  state: BlindsState,
  renderFn: () => void,
  targets: Partial<Record<AnimatableProp, { targetValue: number; step: number }>>,
  speedMs = 100,
): Promise<void> {
  const remaining = new Map(Object.entries(targets) as [string, { targetValue: number; step: number }][]);
  return new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      const size = remaining.size;
      let finished = 0;

      for (const [prop, anim] of remaining) {
        const cur = (state as unknown as Record<string, number>)[prop];
        const dir = cur < anim.targetValue ? 1 : -1;
        const next = cur + anim.step * dir;
        (state as unknown as Record<string, number>)[prop] = next;

        const reached = dir === -1 ? next <= anim.targetValue : next >= anim.targetValue;
        if (reached) {
          finished++;
          remaining.delete(prop);
        }
      }

      renderFn();

      if (finished >= size) {
        clearInterval(interval);
        resolve();
      }
    }, speedMs);
  });
}

export function runBlindsAnimation(state: BlindsState, renderFn: () => void): void {
  stepAnimation(state, renderFn, { blindsOpenDeg: { targetValue: 75, step: 5 } }, 150).then(() => {
    stepAnimation(state, renderFn, {
      blindsOpenDeg: { targetValue: 80, step: 1 },
      numBlindsCollapsed: { targetValue: NUM_BLINDS * 0.7, step: 1 },
      blindsSkewDeg: { targetValue: 5, step: 1 },
      skewDirection: { targetValue: -1, step: 1 },
    });
  });
}
