import { HomeAssistant, NormalizedConfig, TapAction } from "./types";

export const handleClick = (
  node: Element,
  hass: HomeAssistant,
  config: NormalizedConfig,
  actionConfig: TapAction,
): void => {
  switch (actionConfig.action) {
    case "more-info": {
      const e = new CustomEvent("hass-more-info", {
        composed: true,
        detail: { entityId: actionConfig.entity || config.entity },
      });
      node.dispatchEvent(e);
      break;
    }
    case "navigate": {
      if (!actionConfig.navigation_path) return;
      history.pushState(null, "", actionConfig.navigation_path);
      const e = new CustomEvent("location-changed", {
        composed: true,
        detail: { replace: false },
      });
      window.dispatchEvent(e);
      break;
    }
    case "perform_action":
    case "call-service": {
      const action = actionConfig.perform_action;
      if (!action) return;
      const [domain, service] = action.split(".", 2);
      const serviceData = actionConfig.data;
      hass.callService(domain, service, { ...serviceData });
      break;
    }
  }
};
