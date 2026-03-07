import type { SceneComponent, LiveWindowState } from "../types";

export class ClockComponent implements SceneComponent {
  private clockEl: HTMLDivElement | null = null;
  private hourEl: HTMLSpanElement | null = null;
  private minuteEl: HTMLSpanElement | null = null;
  private ampmEl: HTMLSpanElement | null = null;
  private amEl: HTMLSpanElement | null = null;
  private pmEl: HTMLSpanElement | null = null;

  /** Exposed so the orchestrator can read the last rendered time for events */
  public lastTick: { hour: number; minute: number } | null = null;

  mount(container: HTMLElement): void {
    const clock = document.createElement("div");
    clock.className = "clock";
    clock.innerHTML = `
      <span class="clock-hour"></span>
      <span class="separator">:</span>
      <span class="clock-minute"></span>
      <span class="clock-ampm" hidden>
        <span class="ampm-am">AM</span>
        <span class="ampm-pm">PM</span>
      </span>
    `;
    container.appendChild(clock);

    this.clockEl = clock;
    this.hourEl = clock.querySelector(".clock-hour");
    this.minuteEl = clock.querySelector(".clock-minute");
    this.ampmEl = clock.querySelector(".clock-ampm");
    this.amEl = clock.querySelector(".ampm-am");
    this.pmEl = clock.querySelector(".ampm-pm");
  }

  update(state: LiveWindowState): void {
    if (!this.clockEl) return;

    this.clockEl.hidden = state.attrs.hideClock;

    let raw: number;
    let m: number;

    if (state.ref.nowOverride != null) {
      const d = new Date(state.ref.nowOverride);
      raw = d.getHours();
      m = d.getMinutes();
    } else if (state.attrs.timezone) {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: state.attrs.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      raw = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      // Intl.DateTimeFormat returns 24 for midnight in hour12:false mode in some locales
      if (raw === 24) raw = 0;
      m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    } else {
      const now = new Date();
      raw = now.getHours();
      m = now.getMinutes();
    }

    let h = raw;
    const use12Hour = state.attrs.use12Hour;

    if (use12Hour) {
      h = raw % 12 || 12;
    }

    if (this.hourEl) this.hourEl.textContent = String(h).padStart(2, "0");
    if (this.minuteEl) this.minuteEl.textContent = String(m).padStart(2, "0");

    if (this.ampmEl) {
      this.ampmEl.hidden = !use12Hour;
      if (use12Hour) {
        const isPm = raw >= 12;
        this.amEl?.classList.toggle("active", !isPm);
        this.pmEl?.classList.toggle("active", isPm);
      }
    }

    this.lastTick = { hour: raw, minute: m };
  }

  destroy(): void {
    if (this.clockEl?.parentElement) {
      this.clockEl.parentElement.innerHTML = "";
    }
    this.clockEl = null;
    this.hourEl = null;
    this.minuteEl = null;
    this.ampmEl = null;
    this.amEl = null;
    this.pmEl = null;
    this.lastTick = null;
  }
}
