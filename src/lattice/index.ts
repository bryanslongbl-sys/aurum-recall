// Aurum Recall — Lattice (ContextQR) layer: visual context routing over the memory store.
export * from "./model/ContextNode.js";
export { loadContextMap, nodeById, childrenOf } from "./storage/loadContextMap.js";
export { validateContextMap, type ValidationResult } from "./storage/validateContextMap.js";
export { renderSvg, type RenderOptions } from "./render/renderSvg.js";
export { generateRootQr, type QrOptions } from "./qr/generateRootQr.js";
export { latticeFromStore } from "./fromStore.js";
export { PALETTE, colorHex } from "./render/colors.js";
export { BORDERS, borderFor, freshnessOpacity } from "./render/borders.js";
