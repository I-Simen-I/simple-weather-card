export interface HassEntityAttributes {
  [key: string]: unknown;
  friendly_name?: string;
  unit_of_measurement?: string;
  temperature?: number;
  wind_speed?: number;
  wind_bearing?: number;
  pressure?: number;
  humidity?: number;
  forecast?: ForecastEntry[];
}

export interface HassEntity {
  state: string;
  attributes: HassEntityAttributes;
}

export interface HassConfig {
  unit_system: {
    temperature: string;
    length: string;
    mass: string;
    pressure: string;
    volume: string;
  };
  version: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: HassConfig;
  localize: (key: string, ...args: unknown[]) => string;
  resources: Record<string, Record<string, string>>;
  connection: { haVersion: string };
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => void;
}

export interface ForecastEntry {
  temperature?: number;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
}

export interface BackdropConfig {
  day: string;
  night: string;
  text: string;
  fade: boolean;
}

export interface TapAction {
  action: string;
  entity?: string;
  navigation_path?: string;
  service?: string;
  service_data?: Record<string, unknown>;
}

export interface CardConfig {
  entity: string;
  name?: string;
  bg?: boolean;
  primary_info?: string | string[];
  secondary_info?: string | string[];
  custom?: Array<Record<string, string>>;
  tap_action?: TapAction;
  backdrop?: Partial<BackdropConfig>;
}

export interface NormalizedConfig {
  entity: string;
  name?: string;
  bg: boolean;
  primary_info: string[];
  secondary_info: string[];
  custom: Array<Record<string, string>>;
  tap_action: TapAction;
  backdrop: BackdropConfig;
}

export interface CustomState {
  state: string;
  unit?: string;
}

export type CustomMap = Record<string, CustomState>;
