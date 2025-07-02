
export type TWeatherIconCode = 1 | 2 | 3 | 4 | 9 | 10 | 11 | 13 | 50;

export interface ILiveWindowSceneConfig {
  useLiveWeather: boolean;
  useLiveTime: boolean;
  useLiveLocation: boolean;
  enableGlobalTheme: boolean; // Whether to use global theme colors
  clockFormat?: "analog" | "digital"; // Format of the clock
  overrideTime?: string; // Override the time, e.g., "HH:mm"
  clockEnabled?: boolean; // Whether the clock is enabled
  cloudsEnabled?: boolean; // Whether clouds are enabled
  lightningEnabled?: boolean; // Whether lightning is enabled
  percipitationEnabled?: boolean; // Whether percipitation is enabled
  skyboxEnabled?: boolean; // Whether the skybox is enabled
  // Weather icon code https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
  overrideWeather?: TWeatherIconCode;
  overrideLocation?: {
    lat: number;
    lng: number;
  };
  topMargin?: number; // Margin at the top of the scene
}

export interface ISceneClockConfig {
  enabled: boolean; // Whether the clock is enabled
  format: "analog" | "digital"; // Style of the clock
  showSeconds: boolean; // Whether to show seconds hand
}

export interface ISceneSkyboxConfig {
  enabled: boolean;
  enableGlobalTheme: boolean; // Whether to use global theme colors
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

export interface IStore {
  location: ISceneLocation,
  weather: ISceneWeather
}

export interface ISceneLocation {
  lastFetched: number | null; // Timestamp of the last location fetch
  city: string | null; // City name
  region: string | null; // Region name
  country: string | null; // Country name
  lat: number | null; // Latitude
  lng: number | null; // Longitude
}

export interface ISceneWeather {
  lastFetched: number | null; // Timestamp of the last weather fetch
  current: {
    id: number; // Weather condition ID
    main: string; // Main weather condition (e.g., Rain, Snow)
    description: string; // Weather condition description
    icon: TWeatherIconCode; // Weather icon code
    temp: number; // Current temperature in Celsius
  } | null,
  sunrise: number | null; // Sunrise time in milliseconds
  sunset: number | null; // Sunset time in milliseconds
}
