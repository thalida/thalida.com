
export interface ILiveWindowSceneConfig {
  clock: Partial<ISceneClockConfig>;
  skybox: Partial<ISceneSkyboxConfig>;
  percipitation: Partial<IScenePercipitationConfig>;
  lightning: Partial<ISceneLightningConfig>;
  clouds: Partial<ISceneCloudsConfig>;
  useLiveWeather: boolean;
  useLiveTime: boolean;
  now?: Date;
  topMargin?: number; // Margin at the top of the scene
}

export interface ISceneClockConfig {
  enabled: boolean; // Whether the clock is enabled
  format: "analog" | "digital"; // Style of the clock
  showSeconds: boolean; // Whether to show seconds hand
}

export interface ISceneSkyboxConfig {
  enabled: boolean;
  enableScene: boolean;
  enableHTMLTheme: boolean;
  sunsetDuration: number; // Duration of sunset in milliseconds
  sunrise?: number | null; // Optional sunrise time in milliseconds
  sunset?: number | null; // Optional sunset time in milliseconds
}

export interface IScenePercipitationConfig {
  enabled: boolean;
  percipitationType: "rain" | "snow" | "fluff"; // Type of percipitation
  intensity: number;
}

export interface ISceneLightningConfig {
  enabled: boolean;
  intensity: number;
}

export interface ISceneCloudsConfig {
  enabled: boolean;
  cloudType: "mist" | "clouds";
  intensity: number; // 0 to 1, where 1 is very cloudy
}
export interface ICoords {
  x: number;
  y: number;
}

export interface IColor {
  r: number;
  g: number;
  b: number;
}
