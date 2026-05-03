import provinces from "@/data/wilayah/provinces.json";
import regencies from "@/data/wilayah/regencies.json";

// Static lists bundled into any consumer's chunk (1.4KB + 34KB).
// Districts and villages are NOT here — they ship as sharded files in
// /public/wilayah/{districts,villages}/<parent_code>.json so the client
// can fetch a single tiny shard from Vercel's edge CDN.
export const PROVINCES: { code: string; name: string }[] = provinces;
export const REGENCIES: { code: string; name: string; province_code: string }[] = regencies;
