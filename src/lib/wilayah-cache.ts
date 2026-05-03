import provinces from "@/data/wilayah/provinces.json";
import regencies from "@/data/wilayah/regencies.json";

// Static lists — small enough to bundle eagerly (1.4KB + 34KB)
export const PROVINCES: { code: string; name: string }[] = provinces;
export const REGENCIES: { code: string; name: string; province_code: string }[] = regencies;

// Districts (445KB) and Villages (5.7MB) are loaded lazily on the SERVER only —
// dynamic import keeps them out of the route's initial bundle and out of the
// client bundle entirely. Each list is parsed once per warm function instance.
let _districts: Promise<{ code: string; name: string; regency_code: string }[]> | null = null;
let _villages: Promise<{ code: string; name: string; district_code: string }[]> | null = null;

export function getCachedDistricts() {
    if (!_districts) {
        _districts = import("@/data/wilayah/districts.json").then((m) => m.default as any);
    }
    return _districts;
}

export function getCachedVillages() {
    if (!_villages) {
        _villages = import("@/data/wilayah/villages.json").then((m) => m.default as any);
    }
    return _villages;
}
