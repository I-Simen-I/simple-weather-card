import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import WeatherEntity from "./weather";
import getStyles from "./style";
import { handleClick } from "./handleClick";
import {
  HomeAssistant,
  HassEntity,
  CardConfig,
  NormalizedConfig,
  CustomMap,
} from "./types";
import {version} from "./var/version";

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; preview: boolean; description: string }>;
  }
}

const UNITS: Record<string, string> = {
  celsius: "°C",
  fahrenheit: "°F",
};

const INFO: Record<string, { icon: string; unit: string }> = {
  precipitation: { icon: "rainy", unit: "length" },
  precipitation_probability: { icon: "rainy", unit: "%" },
  humidity: { icon: "humidity", unit: "%" },
  wind_speed: { icon: "windy", unit: "speed" },
  wind_bearing: { icon: "windy", unit: "" },
  pressure: { icon: "pressure", unit: "hPa" },
};

@customElement("simple-weather-card")
class SimpleWeatherCard extends LitElement {
  @property({ type: Object }) entity?: HassEntity;
  @state() private weather?: WeatherEntity;
  @state() private custom: CustomMap = {};

  private _hass?: HomeAssistant;
  private config!: NormalizedConfig;

  static styles = getStyles();

  set hass(hass: HomeAssistant) {
    const { custom, entity } = this.config;

    this._hass = hass;
    const entityObj = hass.states[entity];
    if (entityObj && this.entity !== entityObj) {
      this.entity = entityObj;
      this.weather = new WeatherEntity(hass, entityObj);
    }
    const newCustom: CustomMap = {};
    custom.forEach((ele) => {
      const [key, sensor] = Object.entries(ele)[0];
      if (hass.states[sensor]) {
        const entry = hass.states[sensor];
        if (this.custom[key]?.state !== entry.state) {
          newCustom[key] = {
            state: entry.state,
            unit: entry.attributes.unit_of_measurement as string | undefined,
          };
        }
      }
    });
    if (Object.keys(newCustom).length > 0) {
      this.custom = { ...this.custom, ...newCustom };
    }
  }

  get hass(): HomeAssistant {
    return this._hass!;
  }

  private get name(): string {
    return this.config.name || this.weather?.name || "";
  }

  setConfig(config: CardConfig): void {
    if (!config.entity) throw new Error("Specify an entity.");

    const toArray = (val: string | string[] | undefined, fallback: string[]): string[] => {
      if (val === undefined) return fallback;
      return typeof val === "string" ? [val] : val;
    };

    this.config = {
      entity: config.entity,
      name: config.name,
      bg: config.bg ?? Boolean(config.backdrop),
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
      custom: config.custom ?? [],
      tap_action: config.tap_action ?? { action: "more-info" },
      backdrop: {
        day: "#45aaf2",
        night: "#a55eea",
        text: "var(--text-dark-color)",
        fade: false,
        ...config.backdrop,
      },
    };
  }

  protected shouldUpdate(changedProps: Map<string, unknown>): boolean {
    return ["entity", "custom"].some((prop) => changedProps.has(prop));
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        ?bg=${this.config.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather?.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${this.config.backdrop.night}; --text-color: ${this.config.backdrop.text};"
        @click=${() => this.handleTap()}
      >
        ${this.renderIcon()}
        <div class="weather__info">
          <span class="weather__info__title">
            ${this.renderAttr("temp")} ${this.name}
          </span>
          <span class="weather__info__state">
            ${this.renderAttr("state", false)}
          </span>
        </div>
        <div class="weather__info weather__info--add">
          ${this.renderInfoRow(this.config.primary_info)}
          ${this.renderInfoRow(this.config.secondary_info)}
        </div>
      </ha-card>
    `;
  }

  private renderIcon(): TemplateResult | string {
    const icon = this.custom["icon-state"]
      ? this.weather?.getIcon(this.custom["icon-state"].state)
      : this.weather?.icon;
    return this.weather?.hasState && icon
      ? html`<div class="weather__icon" style="background-image: url(${icon})"></div>`
      : "";
  }

  private renderExtrema(): TemplateResult | string {
    const high = this.custom.high?.state ?? this.weather?.high;
    const low = this.custom.low?.state ?? this.weather?.low;
    return high || low
      ? html`
          <span class="weather__info__item">
            ${this.renderAttr("low")} ${high && low ? " / " : ""}
            ${this.renderAttr("high")}
          </span>
        `
      : "";
  }

  private renderInfoRow(attrs: string[]): TemplateResult {
    return html`
      <div class="weather__info__row">
        ${attrs.map((attr) => this.renderInfo(attr))}
      </div>
    `;
  }

  private renderInfo(attr: string): TemplateResult | string {
    if (attr === "extrema") return this.renderExtrema();
    return html`
      <span class="weather__info__item">
        <div
          class="weather__icon weather__icon--small"
          style="background-image: url(${this.weather?.getIcon(INFO[attr].icon)})"
        ></div>
        ${this.renderAttr(attr)}
      </span>
    `;
  }

  private renderAttr(attr: string, uom = true): TemplateResult | undefined {
    const weatherValue = (this.weather as unknown as Record<string, unknown>)?.[attr];
    const state = this.custom[attr] ? this.custom[attr].state : weatherValue;
    if (!state && state !== 0) return undefined;
    const unit = this.custom[attr]?.unit ?? INFO[attr]?.unit;
    return html` ${state} ${uom ? this.getUnit(unit) : ""} `;
  }

  private handleTap(): void {
    handleClick(this, this._hass!, this.config, this.config.tap_action);
  }

  private getUnit(unit = "temperature"): string {
    const target = unit === "speed" ? "length" : unit;
    const res = this._hass!.config.unit_system[target as keyof HomeAssistant["config"]["unit_system"]];
    if (unit === "temperature") return res || UNITS.celsius;
    if (unit === "length") return res === "km" ? "mm" : "in";
    if (unit === "speed") return res ? `${res}/h` : "km/h";
    return unit;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simple-weather-card",
  name: "Simple Weather Card",
  preview: false,
  description: "A minimalistic weather card for Home Assistant",
});

console.info(
    `%c Simple Weather Card %c ${version} `,
    'background-color: #555;color: #fff;padding: 3px 2px 3px 3px;border-radius: 14px 0 0 14px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)',
    'background-color: #506eac;color: #fff;padding: 3px 3px 3px 2px;border-radius: 0 14px 14px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)'
);
