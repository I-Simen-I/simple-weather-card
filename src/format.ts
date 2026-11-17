import { HomeAssistant } from "./types";

type Locale = HomeAssistant["locale"] | undefined;

// The locales Home Assistant formats numbers with for each `number_format`
// (common/number/format_number.ts in the frontend)
const numberFormatLocale = (locale: Locale): string | string[] | undefined => {
  switch (locale?.number_format) {
    case "comma_decimal":
      return ["en-US", "en"]; // 1,234,567.89
    case "decimal_comma":
      return ["de", "es", "it"]; // 1.234.567,89
    case "space_comma":
      return ["fr", "sv", "cs"]; // 1 234 567,89
    case "quote_decimal":
      return ["de-CH"]; // 1'234'567.89
    case "none":
      return "en-US";
    case "system":
      return undefined;
    default:
      return locale?.language;
  }
};

// Creating an Intl.NumberFormat is slow, and the card formats every value on
// each render
const formatters = new Map<string, Intl.NumberFormat>();

// Formats a number the way Home Assistant does: with the user's decimal and
// thousands separators, at most two decimals, and the decimals of a numeric
// string (like a sensor state) kept as they are. Other strings are returned
// unchanged.
export const formatNumber = (
  value: string | number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string => {
  if (value === "" || Number.isNaN(Number(value))) return String(value);
  const opts: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    ...options,
  };
  if (typeof value === "string" && !options) {
    const digits = value.split(".")[1]?.length ?? 0;
    opts.minimumFractionDigits = opts.maximumFractionDigits = digits;
  }
  if (locale?.number_format === "none") opts.useGrouping = false;

  const lang = numberFormatLocale(locale);
  const key = JSON.stringify([lang, opts]);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(lang, opts);
    formatters.set(key, formatter);
  }
  return formatter.format(Number(value));
};
