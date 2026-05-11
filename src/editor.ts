import { LitElement, html, TemplateResult, css, CSSResult } from "lit";
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

const CUSTOM_KEYS: { key: string; label: string }[] = [
  { key: "temp", label: "Temperature" },
  { key: "high", label: "High temperature" },
  { key: "low", label: "Low temperature" },
  { key: "state", label: "Condition / state" },
  { key: "icon-state", label: "Icon state" },
  { key: "precipitation", label: "Precipitation" },
  { key: "precipitation_probability", label: "Precipitation probability" },
  { key: "humidity", label: "Humidity" },
  { key: "wind_speed", label: "Wind speed" },
  { key: "wind_bearing", label: "Wind bearing" },
  { key: "pressure", label: "Pressure" },
];

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "weather" } },
  },
  { name: "name", selector: { text: {} } },
  { name: "show_name", selector: { boolean: {} } },
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
      { name: "bg", selector: { boolean: {} } },
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
  show_name: "Show name",
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

const customToMap = (
  custom: Array<Record<string, string>> = [],
): Record<string, string> =>
  Object.fromEntries(custom.map((entry) => Object.entries(entry)[0]));

const mapToCustom = (
  map: Record<string, string>,
): Array<Record<string, string>> =>
  Object.entries(map)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => ({ [k]: v }));

@customElement("simple-weather-card-editor")
export class SimpleWeatherCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: CardConfig;
  @state() private _customMap: Record<string, string> = {};

  static styles: CSSResult = css`
    ha-expansion-panel {
      margin-top: 8px;
    }
    .custom-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 16px 16px;
    }
  `;

  setConfig(config: CardConfig): void {
    this._customMap = customToMap(config.custom);
    this._config = {
      ...config,
      show_name: config.show_name ?? true,
      primary_info: toArray(config.primary_info, ["extrema"]),
      secondary_info: toArray(config.secondary_info, ["precipitation"]),
    };
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", {
      config: { ...ev.detail.value, custom: mapToCustom(this._customMap) },
    });
  }

  private _customChanged(key: string, ev: CustomEvent): void {
    const value = (ev.detail.value as string) ?? "";
    const newMap = { ...this._customMap, [key]: value };
    if (!value) delete newMap[key];
    this._customMap = newMap;
    fireEvent(this, "config-changed", {
      config: { ...this._config!, custom: mapToCustom(newMap) },
    });
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
      <ha-expansion-panel .header=${"Custom sensor overrides"} outlined>
        <div class="custom-content">
          ${CUSTOM_KEYS.map(
            ({ key, label }) => html`
              <ha-entity-picker
                .hass=${this.hass}
                .label=${label}
                .value=${this._customMap[key] ?? ""}
                @value-changed=${(ev: CustomEvent) =>
                  this._customChanged(key, ev)}
              ></ha-entity-picker>
            `,
          )}
        </div>
      </ha-expansion-panel>
    `;
  }
}
