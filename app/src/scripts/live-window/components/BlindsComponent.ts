import type { SceneComponent, LiveWindowState } from "../types";

const NUM_BLINDS = 20;

interface BlindsState {
  numBlindsCollapsed: number;
  blindsOpenDeg: number;
  blindsSkewDeg: number;
  skewDirection: number;
}

type AnimatableProp = keyof BlindsState;

export class BlindsComponent implements SceneComponent {
  private blindsEl: HTMLDivElement | null = null;
  private stringLeftEl: HTMLDivElement | null = null;
  private stringRightEl: HTMLDivElement | null = null;
  private containerEl: HTMLElement | null = null;

  private blindsState: BlindsState = {
    numBlindsCollapsed: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
  };

  private isOpen = false;
  private animationInterval: number | null = null;
  private animationResolve: (() => void) | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;
    container.innerHTML = `
      <div class="blinds" style="--live-window-num-blinds: ${NUM_BLINDS}"></div>
      <div class="blinds-string blinds-string-left"></div>
      <div class="blinds-string blinds-string-right"></div>
    `;

    this.blindsEl = container.querySelector(".blinds");
    this.stringLeftEl = container.querySelector(".blinds-string-left");
    this.stringRightEl = container.querySelector(".blinds-string-right");

    this.renderBlinds();
  }

  update(_state: LiveWindowState): void {
    // Blinds animation is driven by openBlinds/closeBlinds, not the update cycle.
  }

  destroy(): void {
    this.cancelAnimation();
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.blindsEl = null;
    this.stringLeftEl = null;
    this.stringRightEl = null;
  }

  openBlinds(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.cancelAnimation();

    this.stepAnimation({ blindsOpenDeg: { targetValue: 75, step: 5 } }, 150).then(() => {
      if (!this.isOpen) return;
      this.stepAnimation({
        blindsOpenDeg: { targetValue: 80, step: 1 },
        numBlindsCollapsed: { targetValue: NUM_BLINDS * 0.7, step: 1 },
        blindsSkewDeg: { targetValue: 5, step: 1 },
        skewDirection: { targetValue: -1, step: 1 },
      });
    });
  }

  closeBlinds(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.cancelAnimation();

    this.stepAnimation(
      {
        numBlindsCollapsed: { targetValue: 0, step: 1 },
        blindsOpenDeg: { targetValue: 20, step: 3 },
        blindsSkewDeg: { targetValue: 0, step: 1 },
        skewDirection: { targetValue: 0, step: 1 },
      },
      80,
    );
  }

  private cancelAnimation(): void {
    if (this.animationInterval != null) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.animationResolve) {
      this.animationResolve();
      this.animationResolve = null;
    }
  }

  private renderBlinds(): void {
    if (!this.blindsEl) return;
    const state = this.blindsState;
    const numOpen = NUM_BLINDS - Math.round(state.numBlindsCollapsed);
    const numCollapsed = Math.round(state.numBlindsCollapsed);

    let slats = "";
    for (let i = 0; i < numOpen; i++) {
      slats += `<div class="slat slat-${i + 1}" style="transform:${this.getSkewAndRotateTransform(i)}"></div>`;
    }

    const skew = this.getSkewOnlyTransform();
    slats += `<div class="slat-collapse-group" style="transform:${skew}">`;
    for (let i = 0; i < numCollapsed; i++) {
      slats += '<div class="slat collapse"></div>';
    }
    slats += "</div>";

    slats += `<div class="slat-bar" style="transform:${skew}">`;
    slats += '<span class="string-marker string-marker-left"></span>';
    slats += '<span class="string-marker string-marker-right"></span>';
    slats += "</div>";

    this.blindsEl.innerHTML = `
      <div class="slats">${slats}</div>
      <div class="rod"></div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => this.updateStrings()));
  }

  private updateStrings(): void {
    if (!this.containerEl) return;
    const win = this.containerEl.closest(".live-window");
    const ml = this.containerEl.querySelector(".string-marker-left");
    const mr = this.containerEl.querySelector(".string-marker-right");
    if (!win || !ml || !mr) return;

    const winTop = win.getBoundingClientRect().top;
    if (this.stringLeftEl) this.stringLeftEl.style.height = `${ml.getBoundingClientRect().top - winTop}px`;
    if (this.stringRightEl) this.stringRightEl.style.height = `${mr.getBoundingClientRect().top - winTop}px`;
  }

  private stepAnimation(
    targets: Partial<Record<AnimatableProp, { targetValue: number; step: number }>>,
    speedMs = 100,
  ): Promise<void> {
    const remaining = new Map(Object.entries(targets) as [string, { targetValue: number; step: number }][]);
    return new Promise<void>((resolve) => {
      this.animationResolve = resolve;
      this.animationInterval = window.setInterval(() => {
        const size = remaining.size;
        let finished = 0;

        for (const [prop, anim] of remaining) {
          const key = prop as AnimatableProp;
          const cur = this.blindsState[key];
          const dir = cur < anim.targetValue ? 1 : -1;
          const next = cur + anim.step * dir;
          this.blindsState[key] = next;

          const reached = dir === -1 ? next <= anim.targetValue : next >= anim.targetValue;
          if (reached) {
            this.blindsState[key] = anim.targetValue;
            finished++;
            remaining.delete(prop);
          }
        }

        this.renderBlinds();

        if (finished >= size) {
          if (this.animationInterval != null) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
          }
          this.animationResolve = null;
          resolve();
        }
      }, speedMs);
    });
  }

  private getSkewAndRotateTransform(blindIndex: number): string {
    const state = this.blindsState;
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

  private getSkewOnlyTransform(): string {
    const state = this.blindsState;
    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      skewDeg = state.blindsSkewDeg / 2;
    }
    return `skewY(${skewDeg * state.skewDirection}deg)`;
  }
}
