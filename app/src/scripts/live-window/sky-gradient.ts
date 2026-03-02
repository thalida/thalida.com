export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SkyGradient {
  zenith: RGB;
  upper: RGB;
  lower: RGB;
  horizon: RGB;
}

interface SkyPhase {
  name: string;
  gradient: SkyGradient;
}

// 16 sky phases ordered chronologically from midnight.
// Each defines a 4-stop vertical gradient: zenith (top) → horizon (bottom).
export const SKY_PHASES: SkyPhase[] = [
  {
    name: "night",
    gradient: {
      zenith: { r: 5, g: 5, b: 25 },
      upper: { r: 10, g: 15, b: 40 },
      lower: { r: 10, g: 15, b: 45 },
      horizon: { r: 12, g: 20, b: 50 },
    },
  },
  {
    name: "astronomicalDawn",
    gradient: {
      zenith: { r: 10, g: 15, b: 40 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 70 },
      horizon: { r: 35, g: 30, b: 80 },
    },
  },
  {
    name: "nauticalDawn",
    gradient: {
      zenith: { r: 15, g: 25, b: 60 },
      upper: { r: 30, g: 40, b: 90 },
      lower: { r: 50, g: 45, b: 100 },
      horizon: { r: 80, g: 60, b: 100 },
    },
  },
  {
    name: "civilDawn",
    gradient: {
      zenith: { r: 40, g: 60, b: 120 },
      upper: { r: 60, g: 80, b: 150 },
      lower: { r: 120, g: 100, b: 160 },
      horizon: { r: 200, g: 130, b: 120 },
    },
  },
  {
    name: "sunrise",
    gradient: {
      zenith: { r: 70, g: 130, b: 200 },
      upper: { r: 130, g: 160, b: 210 },
      lower: { r: 220, g: 160, b: 140 },
      horizon: { r: 255, g: 170, b: 80 },
    },
  },
  {
    name: "goldenHourAm",
    gradient: {
      zenith: { r: 80, g: 150, b: 220 },
      upper: { r: 140, g: 185, b: 225 },
      lower: { r: 230, g: 200, b: 170 },
      horizon: { r: 255, g: 200, b: 100 },
    },
  },
  {
    name: "earlyMorning",
    gradient: {
      zenith: { r: 90, g: 165, b: 230 },
      upper: { r: 140, g: 195, b: 235 },
      lower: { r: 180, g: 210, b: 235 },
      horizon: { r: 210, g: 215, b: 220 },
    },
  },
  {
    name: "lateMorning",
    gradient: {
      zenith: { r: 80, g: 160, b: 235 },
      upper: { r: 120, g: 185, b: 240 },
      lower: { r: 170, g: 210, b: 245 },
      horizon: { r: 200, g: 220, b: 240 },
    },
  },
  {
    name: "midday",
    gradient: {
      zenith: { r: 65, g: 150, b: 240 },
      upper: { r: 110, g: 180, b: 245 },
      lower: { r: 160, g: 210, b: 250 },
      horizon: { r: 200, g: 225, b: 245 },
    },
  },
  {
    name: "earlyAfternoon",
    gradient: {
      zenith: { r: 75, g: 155, b: 235 },
      upper: { r: 115, g: 182, b: 240 },
      lower: { r: 165, g: 205, b: 240 },
      horizon: { r: 205, g: 220, b: 235 },
    },
  },
  {
    name: "lateAfternoon",
    gradient: {
      zenith: { r: 70, g: 140, b: 220 },
      upper: { r: 120, g: 170, b: 225 },
      lower: { r: 180, g: 195, b: 210 },
      horizon: { r: 220, g: 200, b: 180 },
    },
  },
  {
    name: "goldenHourPm",
    gradient: {
      zenith: { r: 60, g: 120, b: 200 },
      upper: { r: 110, g: 140, b: 200 },
      lower: { r: 200, g: 170, b: 140 },
      horizon: { r: 255, g: 190, b: 90 },
    },
  },
  {
    name: "sunset",
    gradient: {
      zenith: { r: 50, g: 60, b: 150 },
      upper: { r: 100, g: 80, b: 160 },
      lower: { r: 220, g: 120, b: 100 },
      horizon: { r: 255, g: 100, b: 50 },
    },
  },
  {
    name: "civilDusk",
    gradient: {
      zenith: { r: 30, g: 40, b: 110 },
      upper: { r: 60, g: 50, b: 130 },
      lower: { r: 140, g: 80, b: 120 },
      horizon: { r: 200, g: 100, b: 80 },
    },
  },
  {
    name: "nauticalDusk",
    gradient: {
      zenith: { r: 15, g: 25, b: 70 },
      upper: { r: 30, g: 30, b: 90 },
      lower: { r: 50, g: 40, b: 90 },
      horizon: { r: 70, g: 45, b: 80 },
    },
  },
  {
    name: "astronomicalDusk",
    gradient: {
      zenith: { r: 10, g: 15, b: 45 },
      upper: { r: 15, g: 20, b: 55 },
      lower: { r: 25, g: 25, b: 65 },
      horizon: { r: 35, g: 28, b: 70 },
    },
  },
];
