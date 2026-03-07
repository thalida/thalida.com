import type {
  PrecipConfig,
  AtmosphereConfig,
  AtmosphereParticleConfig,
  WindLevel,
  CloudDensity,
  CloudConfig,
  CloudShape,
  WeatherEffectConfig,
  PrecipLayer,
  LightningVariant,
} from "./weather-types";

export const SWAY_NAMES = ["sway-sm", "sway", "sway-lg"] as const;

export const PRECIP_CONFIG: Record<string, PrecipConfig> = {
  lightRain: {
    count: 28,
    fallSpeed: "6s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [50, 70],
    hasSway: false,
  },
  rain: {
    count: 35,
    fallSpeed: "2s",
    shape: "drop",
    sizeW: [3, 4],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [70, 100],
    hasSway: false,
  },
  snow: {
    count: 32,
    fallSpeed: "6s",
    shape: "round",
    sizeW: [3, 7],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [50, 100],
    hasSway: true,
  },
  sleet: {
    count: 30,
    fallSpeed: "5s",
    shape: "round",
    sizeW: [3, 6],
    aspectRatio: 1,
    color: "#a0cfff",
    opacityRange: [50, 90],
    hasSway: true,
  },
  drizzle: {
    count: 22,
    fallSpeed: "8s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [40, 65],
    hasSway: false,
  },
  showerRain: {
    count: 38,
    fallSpeed: "1.5s",
    shape: "drop",
    sizeW: [3, 5],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [75, 100],
    hasSway: false,
  },
  freezingRain: {
    count: 32,
    fallSpeed: "2.5s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3.5,
    color: "#7ec8f0",
    opacityRange: [65, 95],
    hasSway: false,
  },
  lightSnow: {
    count: 20,
    fallSpeed: "8s",
    shape: "round",
    sizeW: [2, 5],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [40, 80],
    hasSway: true,
  },
  heavySnow: {
    count: 45,
    fallSpeed: "4s",
    shape: "round",
    sizeW: [4, 9],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [60, 100],
    hasSway: true,
  },
  showerSnow: {
    count: 40,
    fallSpeed: "3s",
    shape: "round",
    sizeW: [3, 7],
    aspectRatio: 1,
    color: "#fff",
    opacityRange: [55, 95],
    hasSway: true,
  },
  drizzleLight: {
    count: 16,
    fallSpeed: "10s",
    shape: "drop",
    sizeW: [1, 2],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [30, 55],
    hasSway: false,
  },
  drizzleHeavy: {
    count: 28,
    fallSpeed: "6s",
    shape: "drop",
    sizeW: [2, 4],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [55, 80],
    hasSway: false,
  },
  showerDrizzle: {
    count: 25,
    fallSpeed: "4s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [45, 70],
    hasSway: false,
  },
  heavyRain: {
    count: 42,
    fallSpeed: "1.8s",
    shape: "drop",
    sizeW: [4, 5],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [80, 100],
    hasSway: false,
  },
  extremeRain: {
    count: 50,
    fallSpeed: "1.2s",
    shape: "drop",
    sizeW: [4, 6],
    aspectRatio: 2,
    color: "#28afff",
    opacityRange: [85, 100],
    hasSway: false,
  },
  showerSleet: {
    count: 35,
    fallSpeed: "3s",
    shape: "round",
    sizeW: [3, 6],
    aspectRatio: 1,
    color: "#a0cfff",
    opacityRange: [55, 90],
    hasSway: true,
  },
};

export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  mist: { color: ["#c8c8c8", "#5a6280"], opacity: 0.15, layers: 2 },
  fog: { color: ["#b0b0b0", "#485070"], opacity: 0.35, layers: 3 },
  smoke: { color: ["#8b7355", "#3e3548"], opacity: 0.3, layers: 3 },
  haze: { color: ["#d4c89a", "#5a5570"], opacity: 0.2, layers: 2 },
  sand: { color: ["#c4a050", "#5a4838"], opacity: 0.3, layers: 3 },
  dust: { color: ["#8a7560", "#423840"], opacity: 0.22, layers: 2 },
  dustWhirls: { color: ["#c4a86a", "#5a4838"], opacity: 0.35, layers: 3 },
  volcanicAsh: { color: ["#555555", "#2a2a38"], opacity: 0.4, layers: 3 },
  squalls: { color: ["#888888", "#3a4058"], opacity: 0.3, layers: 3 },
  tornado: { color: ["#666666", "#2a3048"], opacity: 0.45, layers: 3 },
  stormDark: { color: ["#1a1a2e", "#0e0e1a"], opacity: 0.2, layers: 2 },
};

export const ATMO_PARTICLE_CONFIG: Record<string, AtmosphereParticleConfig> = {
  mistWisps: {
    count: 6,
    color: ["#d0d0d0", "#687890"],
    sizeRange: [40, 80],
    opacityRange: [8, 20],
    speed: "16s",
    drift: "float",
    aspectRatio: 4,
    blur: 30,
  },
  fogBanks: {
    count: 4,
    color: ["#c0c0c0", "#586880"],
    sizeRange: [100, 160],
    opacityRange: [20, 40],
    speed: "22s",
    drift: "float",
    aspectRatio: 1.3,
    blur: 50,
  },
  smokeWisps: {
    count: 10,
    color: ["#7a6548", "#3a3040"],
    sizeRange: [35, 65],
    opacityRange: [15, 35],
    speed: "11s",
    drift: "rise",
    aspectRatio: 0.8,
    blur: 25,
  },
  dustSwirl: {
    count: 20,
    color: ["#a08860", "#504838"],
    sizeRange: [2, 5],
    opacityRange: [30, 55],
    speed: "5s",
    drift: "swirl",
  },
  sandSwirl: {
    count: 28,
    color: ["#c4a050", "#5a4838"],
    sizeRange: [2, 4],
    opacityRange: [40, 65],
    speed: "3.5s",
    drift: "swirl",
  },
  ashFall: {
    count: 18,
    color: ["#444444", "#222238"],
    sizeRange: [3, 6],
    opacityRange: [35, 65],
    speed: "7s",
    drift: "fall",
  },
  debrisSwirl: {
    count: 15,
    color: ["#5a5040", "#2a2830"],
    sizeRange: [3, 8],
    opacityRange: [30, 55],
    speed: "4s",
    drift: "swirl",
  },
  iceGlint: {
    count: 12,
    color: ["#e0f0ff", "#8898b8"],
    sizeRange: [1, 3],
    opacityRange: [40, 80],
    speed: "3s",
    drift: "float",
  },
};

export const CLOUD_CONFIGS: Record<Exclude<CloudDensity, "none">, CloudConfig> = {
  light: { count: 2, sizeRange: [15, 22], opacityRange: [60, 80], yRange: [20, 60] },
  medium: { count: 4, sizeRange: [15, 25], opacityRange: [65, 90], yRange: [10, 65] },
  heavy: { count: 6, sizeRange: [18, 30], opacityRange: [70, 95], yRange: [5, 70] },
  storm: { count: 9, sizeRange: [20, 35], opacityRange: [80, 100], yRange: [0, 75] },
};

export const FLOAT_NAMES = ["cloud-float-1", "cloud-float-2", "cloud-float-3"] as const;

/** Curated cloud shapes based on the original hand-crafted clouds. */
export const CLOUD_SHAPES: CloudShape[] = [
  {
    // Based on cloud-sm: rounded body with one right bump
    bodyRadius: "50% 50% 0 50%",
    extensions: [{ side: "right", width: 50, height: 55, offset: -45, radius: "50% 50% 50% 0" }],
  },
  {
    // Based on cloud-md: flat-bottom body with bumps on both sides
    bodyRadius: "40% 50% 0 0",
    extensions: [
      { side: "left", width: 60, height: 70, offset: -50, radius: "40% 50% 0 50%" },
      { side: "right", width: 50, height: 55, offset: -45, radius: "30% 50% 50% 0" },
    ],
  },
  {
    // Based on cloud-lg: rounded body with one tall right bump
    bodyRadius: "30% 50% 0 50%",
    extensions: [{ side: "right", width: 50, height: 75, offset: -45, radius: "30% 50% 50% 0" }],
  },
];

/** Day and night cloud colors per density: [day, night]. */
export const CLOUD_COLORS: Record<string, [string, string]> = {
  light: ["#ffffff", "#6a7292"],
  medium: ["#ffffff", "#6a7292"],
  heavy: ["#c5c9d6", "#404862"],
  storm: ["#585e78", "#252b48"],
};

/** How much sky tint to apply per density when the sun is near the horizon. Thinner clouds catch more light. */
export const SKY_TINT_STRENGTH: Record<string, number> = {
  light: 0.55,
  medium: 0.45,
  heavy: 0.35,
  storm: 0.2,
};

function fx(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: {
    lightning?: LightningVariant;
    atmosphere?: AtmosphereConfig;
    wind?: WindLevel;
    atmosphereParticles?: AtmosphereParticleConfig;
  },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    wind: opts?.wind ?? "none",
    atmosphereParticles: opts?.atmosphereParticles ?? null,
  };
}

function p(type: string, intensityScale = 1.0): PrecipLayer {
  return { type, intensityScale };
}

export const WEATHER_EFFECTS: Record<number, WeatherEffectConfig> = {
  // 2xx Thunderstorm
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: "distant" }),
  201: fx("storm", [p("rain")], { lightning: "standard" }),
  202: fx("storm", [p("heavyRain")], {
    lightning: "intense",
    atmosphere: ATMOSPHERE_CONFIG.stormDark,
    wind: "moderate",
  }),
  210: fx("heavy", [], { lightning: "distant" }),
  211: fx("storm", [], { lightning: "standard" }),
  212: fx("storm", [], { lightning: "intense", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  221: fx("storm", [p("lightRain", 0.4)], { lightning: "standard" }),
  230: fx("heavy", [p("drizzle")], { lightning: "standard" }),
  231: fx("storm", [p("drizzle", 1.4)], { lightning: "standard" }),
  232: fx("storm", [p("drizzle", 1.8)], {
    lightning: "intense",
    atmosphere: ATMOSPHERE_CONFIG.stormDark,
    wind: "moderate",
  }),

  // 3xx Drizzle
  300: fx("light", [p("drizzleLight")]),
  301: fx("medium", [p("drizzle")]),
  302: fx("medium", [p("drizzleHeavy")]),
  310: fx("medium", [p("drizzle", 0.6), p("lightRain", 0.4)]),
  311: fx("medium", [p("drizzle", 0.7), p("lightRain", 0.7)]),
  312: fx("medium", [p("drizzleHeavy", 0.8), p("rain", 0.7)]),
  313: fx("medium", [p("showerRain", 0.7), p("drizzle", 0.5)], { wind: "light" }),
  314: fx("heavy", [p("showerRain", 1.2), p("drizzleHeavy", 0.6)], { wind: "moderate" }),
  321: fx("medium", [p("showerDrizzle")], { wind: "light" }),

  // 5xx Rain
  500: fx("medium", [p("lightRain", 0.6)]),
  501: fx("medium", [p("rain")]),
  502: fx("heavy", [p("heavyRain")]),
  503: fx("heavy", [p("heavyRain", 1.3)], { wind: "light" }),
  504: fx("storm", [p("extremeRain")], { wind: "moderate", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  511: fx("heavy", [p("freezingRain")], { atmosphereParticles: ATMO_PARTICLE_CONFIG.iceGlint }),
  520: fx("medium", [p("showerRain", 0.6)], { wind: "light" }),
  521: fx("medium", [p("showerRain")], { wind: "light" }),
  522: fx("heavy", [p("showerRain", 1.4)], { wind: "moderate" }),
  531: fx("medium", [p("showerRain", 0.5), p("lightRain", 0.3)]),

  // 6xx Snow
  600: fx("medium", [p("lightSnow", 0.6)]),
  601: fx("medium", [p("snow")]),
  602: fx("heavy", [p("heavySnow", 1.4)]),
  611: fx("medium", [p("sleet")]),
  612: fx("medium", [p("showerSleet", 0.6)], { wind: "light" }),
  613: fx("medium", [p("showerSleet")], { wind: "light" }),
  615: fx("medium", [p("lightRain", 0.5), p("lightSnow", 0.5)]),
  616: fx("heavy", [p("rain", 0.7), p("snow", 0.7)]),
  620: fx("medium", [p("showerSnow", 0.6)], { wind: "light" }),
  621: fx("medium", [p("showerSnow")], { wind: "light" }),
  622: fx("heavy", [p("showerSnow", 1.4)], { wind: "moderate" }),

  // 7xx Atmosphere
  701: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.mist, atmosphereParticles: ATMO_PARTICLE_CONFIG.mistWisps }),
  711: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.smoke, atmosphereParticles: ATMO_PARTICLE_CONFIG.smokeWisps }),
  721: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.haze }),
  731: fx("none", [], {
    atmosphere: ATMOSPHERE_CONFIG.dustWhirls,
    atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl,
  }),
  741: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.fog, atmosphereParticles: ATMO_PARTICLE_CONFIG.fogBanks }),
  751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.sand, atmosphereParticles: ATMO_PARTICLE_CONFIG.sandSwirl }),
  761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust, atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl }),
  762: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.volcanicAsh, atmosphereParticles: ATMO_PARTICLE_CONFIG.ashFall }),
  771: fx("heavy", [p("heavyRain")], { atmosphere: ATMOSPHERE_CONFIG.squalls, wind: "strong" }),
  781: fx("storm", [p("heavyRain")], {
    atmosphere: ATMOSPHERE_CONFIG.tornado,
    wind: "strong",
    atmosphereParticles: ATMO_PARTICLE_CONFIG.debrisSwirl,
  }),

  // 800+ Clear/Clouds
  800: fx("none", []),
  801: fx("light", []),
  802: fx("medium", []),
  803: fx("heavy", []),
  804: fx("heavy", []),
};
