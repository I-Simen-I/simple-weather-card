import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { HomeAssistant, CardConfig } from "./types";

const fireEvent = (node: EventTarget, type: string, detail?: unknown): void => {
  node.dispatchEvent(
    new CustomEvent(type, { bubbles: true, composed: true, detail }),
  );
};

const INFO_OPTIONS = [
  { value: "extrema", label: "High / Low" },
  { value: "precipitation", label: "Precipitation" },
  { value: "precipitation_probability", label: "Precipitation probability" },
  { value: "humidity", label: "Humidity" },
  { value: "wind_speed", label: "Wind speed" },
  { value: "wind_bearing", label: "Wind bearing" },
  { value: "pressure", label: "Pressure" },
];

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "weather" } },
  },
  { name: "name", selector: { text: {} } },
  { name: "bg", selector: { boolean: {} } },
  {
    name: "primary_info",
    selector: {
      select: { multiple: true, mode: "list", options: INFO_OPTIONS },
    },
  },
  {
    name: "secondary_info",
    selector: {
      select: { multiple: true, mode: "list", options: INFO_OPTIONS },
    },
  },
  {
    type: "expandable",
    name: "backdrop",
    title: "Backdrop",
    schema: [
      { name: "day", selector: { text: {} } },
      { name: "night", selector: { text: {} } },
      { name: "text", selector: { text: {} } },
      { name: "fade", selector: { boolean: {} } },
    ],
  },
];

const LABELS: Record<string, string> = {
  entity: "Weather entity",
  name: "Name",
  bg: "Show backdrop",
  primary_info: "Primary info",
  secondary_info: "Secondary info",
  backdrop: "Backdrop",
  day: "Day color",
  night: "Night color",
  text: "Text color",
  fade: "Fade effect",
};

const toArray = (val: string | string[] | undefined, fallback: string[]) =>
  val === undefined ? fallback : typeof val === "string" ? [val] : val;

@customElement("simple-weather-card-editor")
export class SimpleWeatherCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = {
      ...config,
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
    };
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabel(schema: { name: string; title?: string }): string {
    return LABELS[schema.name] ?? schema.title ?? schema.name;
  }

  protected render(): TemplateResult | string {
    if (!this._config || !this.hass) return "";
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}
