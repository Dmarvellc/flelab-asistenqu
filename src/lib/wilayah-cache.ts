import { getRegencies, getDistricts, getVillages } from "idn-area-data";

// Static provinces data — 38 items, bundled to avoid filesystem read
export const PROVINCES: { code: string; name: string }[] = [
    { code: "11", name: "ACEH" },
    { code: "12", name: "SUMATERA UTARA" },
    { code: "13", name: "SUMATERA BARAT" },
    { code: "14", name: "RIAU" },
    { code: "15", name: "JAMBI" },
    { code: "16", name: "SUMATERA SELATAN" },
    { code: "17", name: "BENGKULU" },
    { code: "18", name: "LAMPUNG" },
    { code: "19", name: "KEPULAUAN BANGKA BELITUNG" },
    { code: "21", name: "KEPULAUAN RIAU" },
    { code: "31", name: "DKI JAKARTA" },
    { code: "32", name: "JAWA BARAT" },
    { code: "33", name: "JAWA TENGAH" },
    { code: "34", name: "DAERAH ISTIMEWA YOGYAKARTA" },
    { code: "35", name: "JAWA TIMUR" },
    { code: "36", name: "BANTEN" },
    { code: "51", name: "BALI" },
    { code: "52", name: "NUSA TENGGARA BARAT" },
    { code: "53", name: "NUSA TENGGARA TIMUR" },
    { code: "61", name: "KALIMANTAN BARAT" },
    { code: "62", name: "KALIMANTAN TENGAH" },
    { code: "63", name: "KALIMANTAN SELATAN" },
    { code: "64", name: "KALIMANTAN TIMUR" },
    { code: "65", name: "KALIMANTAN UTARA" },
    { code: "71", name: "SULAWESI UTARA" },
    { code: "72", name: "SULAWESI TENGAH" },
    { code: "73", name: "SULAWESI SELATAN" },
    { code: "74", name: "SULAWESI TENGGARA" },
    { code: "75", name: "GORONTALO" },
    { code: "76", name: "SULAWESI BARAT" },
    { code: "81", name: "MALUKU" },
    { code: "82", name: "MALUKU UTARA" },
    { code: "91", name: "PAPUA" },
    { code: "92", name: "PAPUA BARAT" },
    { code: "93", name: "PAPUA SELATAN" },
    { code: "94", name: "PAPUA TENGAH" },
    { code: "95", name: "PAPUA PEGUNUNGAN" },
    { code: "96", name: "PAPUA BARAT DAYA" },
];

// Module-level promise singletons — CSV is read only once per function instance
let _regencies: Promise<any[]> | null = null;
let _districts: Promise<any[]> | null = null;
let _villages: Promise<any[]> | null = null;

export function getCachedRegencies(): Promise<any[]> {
    if (!_regencies) _regencies = getRegencies().catch(() => []);
    return _regencies;
}

export function getCachedDistricts(): Promise<any[]> {
    if (!_districts) _districts = getDistricts().catch(() => []);
    return _districts;
}

export function getCachedVillages(): Promise<any[]> {
    if (!_villages) _villages = getVillages().catch(() => []);
    return _villages;
}
