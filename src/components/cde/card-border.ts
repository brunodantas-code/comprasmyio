import type { CSSProperties } from "react";
import { useCdeStandards } from "./cde-button";
import { CARD_BORDER_GROUP, parseCardBorders, resolveCardBorder, type CardBorderConfig, type CardClassification } from "./card-border-config";

export function useCardClassificationBorder(classification?: CardClassification, preview?: CardBorderConfig) {
  const { data } = useCdeStandards();
  const config = preview ?? parseCardBorders(data?.selected.find(s => s.group_key === CARD_BORDER_GROUP && s.is_primary)?.variant_key);
  const border = resolveCardBorder(config, classification);
  return {
    attributes: border ? { "data-card-border-color": border.color, "data-card-border-edge": border.edge } : {},
    style: border ? { "--classification-border-width": `${border.width}px` } as CSSProperties : {},
  };
}