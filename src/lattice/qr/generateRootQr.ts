// The ROOT QR is a real, scannable QR (spec §10: real QR only at the top level; deeper tiles are
// recursive routers, not literal nested QRs). It points at the root context URI or a configured URL.
import QRCode from "qrcode";
import type { ContextMap } from "../model/ContextNode.js";
import { nodeById } from "../storage/loadContextMap.js";

export interface QrOptions { width?: number; url?: string }

export async function generateRootQr(map: ContextMap, out: string, opts: QrOptions = {}): Promise<{ out: string; payload: string }> {
  const root = nodeById(map, map.root_id);
  const payload = opts.url || root?.marker?.payload || `ctx://${map.root_id}`;
  await QRCode.toFile(out, payload, {
    width: opts.width ?? 512,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0d12ff", light: "#ffffffff" },
  });
  return { out, payload };
}
