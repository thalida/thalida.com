export interface ClockElements {
  hourEl: HTMLSpanElement | null;
  minuteEl: HTMLSpanElement | null;
  ampmEl: HTMLSpanElement | null;
  amEl: HTMLSpanElement | null;
  pmEl: HTMLSpanElement | null;
}

export function renderClock(els: ClockElements, use12Hour: boolean): { hour: number; minute: number } {
  const now = new Date();
  const raw = now.getHours();
  let h = raw;
  const m = now.getMinutes();

  if (use12Hour) {
    h = raw % 12 || 12;
  }

  if (els.hourEl) els.hourEl.textContent = `${h < 10 ? "0" : ""}${h}`;
  if (els.minuteEl) els.minuteEl.textContent = `${m < 10 ? "0" : ""}${m}`;

  if (els.ampmEl) {
    els.ampmEl.hidden = !use12Hour;
    if (use12Hour) {
      const isPm = raw >= 12;
      els.amEl?.classList.toggle("active", !isPm);
      els.pmEl?.classList.toggle("active", isPm);
    }
  }

  return { hour: raw, minute: m };
}
