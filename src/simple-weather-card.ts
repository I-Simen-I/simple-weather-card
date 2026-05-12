import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import WeatherEntity from "./weather";
import getStyles from "./style";
import { handleClick } from "./handleClick";
import {
  HomeAssistant,
  HassEntity,
  ForecastEntry,
  CardConfig,
  NormalizedConfig,
  CustomMap,
} from "./types";
import { version } from "./var/version";

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      preview: boolean;
      description: string;
    }>;
  }
}

const UNITS: Record<string, string> = {
  celsius: "°C",
  fahrenheit: "°F",
};

const toArray = (
  val: string | string[] | undefined,
  fallback: string[],
): string[] => {
  if (val === undefined) return fallback;
  return typeof val === "string" ? [val] : val;
};

const INFO: Record<string, { icon: string; unit: string }> = {
  precipitation: { icon: "rainy", unit: "precipitation" },
  precipitation_probability: { icon: "rainy", unit: "%" },
  humidity: { icon: "humidity", unit: "%" },
  wind_speed: { icon: "windy", unit: "wind_speed" },
  wind_bearing: { icon: "windy", unit: "" },
  pressure: { icon: "pressure", unit: "pressure" },
};

@customElement("simple-weather-card")
export class SimpleWeatherCard extends LitElement {
  @property({ type: Object }) entity?: HassEntity;
  @state() private weather?: WeatherEntity;
  @state() private custom: CustomMap = {};

  private _hass?: HomeAssistant;
  private config!: NormalizedConfig;
  private _forecast: ForecastEntry[] = [];
  private _forecastUnsubscribe?: () => void;

  static styles = getStyles();

  static async getConfigElement(): Promise<HTMLElement> {
    await import(/* webpackMode: "eager" */ "./editor");
    return document.createElement("simple-weather-card-editor");
  }

  static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    const entity = Object.keys(hass.states).find((e) =>
      e.startsWith("weather."),
    );
    return { entity };
  }

  set hass(hass: HomeAssistant) {
    const { custom, entity } = this.config;

    this._hass = hass;
    const entityObj = hass.states[entity];
    if (entityObj && this.entity !== entityObj) {
      this.entity = entityObj;
      this._subscribeForecasts(entity);
      this.weather = new WeatherEntity(hass, entityObj, this._forecast);
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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._forecastUnsubscribe?.();
    this._forecastUnsubscribe = undefined;
  }

  private _subscribeForecasts(entityId: string): void {
    this._forecastUnsubscribe?.();
    this._forecastUnsubscribe = undefined;

    this._hass!.connection.subscribeMessage<{
      forecast: ForecastEntry[] | null;
    }>(
      (msg) => {
        this._forecast = msg.forecast ?? [];
        if (this.entity) {
          this.weather = new WeatherEntity(
            this._hass!,
            this.entity,
            this._forecast,
          );
        }
      },
      {
        type: "weather/subscribe_forecast",
        forecast_type: "daily",
        entity_id: entityId,
      },
    ).then((unsub) => {
      this._forecastUnsubscribe = unsub;
    });
  }

  private get name(): string {
    return this.config.name || this.weather?.name || "";
  }

  setConfig(config: CardConfig): void {
    if (!config.entity) throw new Error("Specify an entity.");

    this.config = {
      entity: config.entity,
      name: config.name,
      show_name: config.show_name ?? true,
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
      custom: config.custom ?? [],
      tap_action: config.tap_action ?? { action: "more-info" },
      backdrop: {
        bg: config.backdrop?.bg ?? false,
        day: "#45aaf2",
        night: "#a55eea",
        text: "var(--text-dark-color)",
        fade: false,
        ...config.backdrop,
      },
      show_forecast: config.show_forecast ?? false,
      card_mod: config.card_mod,
      uix: config.uix,
    };
    this.requestUpdate();
  }

  protected shouldUpdate(changedProps: Map<string, unknown>): boolean {
    return ["entity", "custom", "weather"].some((prop) =>
      changedProps.has(prop),
    );
  }

  protected updated(): void {
    this._applyCardMod();
    this._applyUix();
  }

  private _applyCardMod(): void {
    customElements.whenDefined("card-mod").then((CardMod: unknown) => {
      (CardMod as { applyToElement: (...args: unknown[]) => void }).applyToElement(
        this,
        "card",
        this.config.card_mod,
        { config: this.config },
        true,
        "type-custom-simple-weather-card",
      );
    });
  }

  private _applyUix(): void {
    customElements.whenDefined("uix-node").then((uix: unknown) => {
      (uix as { applyToElement: (...args: unknown[]) => void }).applyToElement(
        this,
        "card",
        this.config.uix,
        { config: this.config },
        true,
        "type-custom-simple-weather-card",
      );
    });
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        ?bg=${this.config.backdrop.bg}
        ?fade=${this.config.backdrop.fade}
        ?night=${this.weather?.isNight}
        style="--day-color: ${this.config.backdrop.day}; --night-color: ${this
          .config.backdrop.night}; --text-color: ${this.config.backdrop.text};"
        @click=${() => this.handleTap()}
      >
        <div class="weather__main">
          ${this.renderIcon()}
          <div class="weather__info">
            <span class="weather__info__title">
              ${this.renderAttr("temp")} ${this.config.show_name ? this.name : ""}
            </span>
            <span class="weather__info__state">
              ${this.renderAttr("state", false)}
            </span>
          </div>
          <div class="weather__info weather__info--add">
            ${this.renderInfoRow(this.config.primary_info)}
            ${this.renderInfoRow(this.config.secondary_info)}
          </div>
        </div>
        ${this.config.show_forecast ? this.renderForecast() : ""}
      </ha-card>
    `;
  }

  private renderIcon(): TemplateResult | string {
    const icon = this.custom["icon-state"]
      ? this.weather?.getIcon(this.custom["icon-state"].state)
      : this.weather?.icon;
    return this.weather?.hasState && icon
      ? html`<div
          class="weather__icon"
          style="background-image: url(${icon})"
        ></div>`
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
          style="background-image: url(${this.weather?.getIcon(
            INFO[attr].icon,
          )})"
        ></div>
        ${this.renderAttr(attr)}
      </span>
    `;
  }

  private renderForecast(): TemplateResult {
    const days = this._forecast.slice(1, 6);
    const tempUnit = this.getUnit("temperature");
    return html`
      <div class="weather__forecast">
        ${days.map((day) => {
          const date = day.datetime ? new Date(day.datetime) : null;
          const lang = this.hass.locale.language;
          const dayName = date
            ? date.toLocaleDateString(lang, { weekday: "short" })
            : "";
          const icon = day.condition
            ? this.weather?.getIcon(day.condition)
            : undefined;
          return html`
            <div class="weather__forecast__day">
              <span class="weather__forecast__dayname">${dayName}</span>
              ${icon
                ? html`<div
                    class="weather__icon weather__icon--forecast"
                    style="background-image: url(${icon})"
                  ></div>`
                : ""}
              <span class="weather__forecast__temp weather__forecast__temp--high">
                ${day.temperature !== undefined ? day.temperature.toFixed(1) : "--"}${tempUnit}
              </span>
              <span class="weather__forecast__temp weather__forecast__temp--low">
                ${day.templow !== undefined ? day.templow.toFixed(1) : "--"}${tempUnit}
              </span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderAttr(attr: string, uom = true): TemplateResult | undefined {
    const weatherValue = this.weather?.getAttribute(attr);
    const state = this.custom[attr] ? this.custom[attr].state : weatherValue;
    if (!state && state !== 0) return undefined;
    const unit = this.custom[attr]?.unit ?? INFO[attr]?.unit;
    return html` ${state} ${uom ? this.getUnit(unit) : ""} `;
  }

  private handleTap(): void {
    handleClick(this, this._hass!, this.config, this.config.tap_action);
  }

  private getUnit(unit = "temperature"): string {
    const attr = this.entity?.attributes;
    switch (unit) {
      case "temperature":
        return (attr?.temperature_unit as string) || UNITS.celsius;
      case "precipitation":
        return (attr?.precipitation_unit as string) || "mm";
      case "wind_speed":
        return (attr?.wind_speed_unit as string) || "km/h";
      case "pressure":
        return (attr?.pressure_unit as string) || "hPa";
      default:
        return unit;
    }
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "simple-weather-card",
  name: "Simple Weather Card",
  preview: true,
  description: "A minimalistic weather card for Home Assistant",
});

console.info(
  `%c Simple Weather Card %c ${version} `,
  "background-color: #555;color: #fff;padding: 3px 2px 3px 3px;border-radius: 14px 0 0 14px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
  "background-color: #506eac;color: #fff;padding: 3px 3px 3px 2px;border-radius: 0 14px 14px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)",
);
