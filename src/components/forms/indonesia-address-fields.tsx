"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { PROVINCES, REGENCIES } from "@/lib/wilayah-cache";

export type Region = { code: string; name: string };
type RegionWithParent = Region & { regency_code?: string; district_code?: string; province_code?: string };

export type AddressValue = {
    addressStreet: string;
    provinceId: string;
    regencyId: string;
    districtId: string;
    villageId: string;
    postalCode: string;
};

export type AddressErrors = Partial<Record<keyof AddressValue, boolean>>;

export type AddressFieldStyle = "default" | "compact";

export type AddressLanguage = "id" | "en";

interface Props {
    value: AddressValue;
    onChange: (next: AddressValue) => void;
    errors?: AddressErrors;
    showPostalCode?: boolean;
    showStreet?: boolean;
    style?: AddressFieldStyle;
    language?: AddressLanguage;
}

// Client-side cache: districts by regency_code, villages by district_code
const districtsCache = new Map<string, RegionWithParent[]>();
const villagesCache = new Map<string, RegionWithParent[]>();

// Static shards live under /public/wilayah and are served from Vercel's
// edge CDN — no serverless function needed, no cold start, instant.
async function fetchDistricts(regencyCode: string): Promise<RegionWithParent[]> {
    if (districtsCache.has(regencyCode)) return districtsCache.get(regencyCode)!;
    const res = await fetch(`/wilayah/districts/${encodeURIComponent(regencyCode)}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const list: RegionWithParent[] = Array.isArray(data) ? data : [];
    districtsCache.set(regencyCode, list);
    return list;
}

async function fetchVillages(districtCode: string): Promise<RegionWithParent[]> {
    if (villagesCache.has(districtCode)) return villagesCache.get(districtCode)!;
    const res = await fetch(`/wilayah/villages/${encodeURIComponent(districtCode)}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const list: RegionWithParent[] = Array.isArray(data) ? data : [];
    villagesCache.set(districtCode, list);
    return list;
}

const dict = {
    id: {
        province: "Provinsi",
        regency: "Kabupaten / Kota",
        district: "Kecamatan",
        village: "Kelurahan / Desa",
        postalCode: "Kode Pos",
        street: "Jalan / Gedung / No. Rumah",
        pickProvince: "Pilih provinsi",
        pickRegency: "Pilih kabupaten/kota",
        pickDistrict: "Pilih kecamatan",
        pickVillage: "Pilih kelurahan",
        afterProvince: "Pilih provinsi dahulu",
        afterRegency: "Pilih kab/kota dahulu",
        afterDistrict: "Pilih kecamatan dahulu",
        search: "Cari",
        noResult: "Tidak ditemukan",
        loading: "Memuat",
        required: "Wajib dipilih.",
        streetPlaceholder: "Contoh: Jl. Sudirman No. 10, Blok A",
        streetRequired: "Alamat wajib diisi.",
        postalRequired: "Kode pos wajib diisi.",
    },
    en: {
        province: "Province",
        regency: "City / Regency",
        district: "District",
        village: "Village",
        postalCode: "Postal Code",
        street: "Street / House No.",
        pickProvince: "Pick province",
        pickRegency: "Pick city/regency",
        pickDistrict: "Pick district",
        pickVillage: "Pick village",
        afterProvince: "Pick province first",
        afterRegency: "Pick city/regency first",
        afterDistrict: "Pick district first",
        search: "Search",
        noResult: "No results",
        loading: "Loading",
        required: "Required.",
        streetPlaceholder: "e.g. Jl. Sudirman No. 10, Blok A",
        streetRequired: "Street is required.",
        postalRequired: "Postal code is required.",
    },
};

function SearchableSelect({
    value,
    onChange,
    items,
    placeholder,
    disabled,
    error,
    loading,
    searchPlaceholder,
    emptyText,
    triggerClassName,
}: {
    value: string;
    onChange: (code: string) => void;
    items: Region[];
    placeholder: string;
    disabled?: boolean;
    error?: boolean;
    loading?: boolean;
    searchPlaceholder: string;
    emptyText: string;
    triggerClassName?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => items.find((i) => i.code === value), [items, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between h-10 rounded-lg bg-background font-normal",
                        !selected && "text-muted-foreground",
                        error && "border-red-500",
                        disabled && "opacity-50",
                        triggerClassName,
                    )}
                >
                    <span className="truncate text-left">
                        {loading ? (
                            <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {placeholder}</span>
                        ) : selected ? selected.name : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-none" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList className="max-h-64">
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.code}
                                    value={`${item.name} ${item.code}`}
                                    onSelect={() => {
                                        onChange(item.code);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === item.code ? "opacity-100" : "opacity-0")} />
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export function IndonesiaAddressFields({
    value,
    onChange,
    errors = {},
    showPostalCode = true,
    showStreet = true,
    style = "default",
    language = "id",
}: Props) {
    const t = dict[language];
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingVillages, setLoadingVillages] = useState(false);

    const filteredRegencies = useMemo(
        () => (value.provinceId ? REGENCIES.filter((r) => r.province_code === value.provinceId) : []),
        [value.provinceId],
    );

    useEffect(() => {
        let cancelled = false;
        if (!value.regencyId) { setDistricts([]); return; }
        setLoadingDistricts(true);
        fetchDistricts(value.regencyId).then((list) => {
            if (cancelled) return;
            setDistricts(list);
        }).finally(() => { if (!cancelled) setLoadingDistricts(false); });
        return () => { cancelled = true; };
    }, [value.regencyId]);

    useEffect(() => {
        let cancelled = false;
        if (!value.districtId) { setVillages([]); return; }
        setLoadingVillages(true);
        fetchVillages(value.districtId).then((list) => {
            if (cancelled) return;
            setVillages(list);
        }).finally(() => { if (!cancelled) setLoadingVillages(false); });
        return () => { cancelled = true; };
    }, [value.districtId]);

    const update = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });

    const labelClass = style === "compact"
        ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        : "text-xs font-semibold uppercase tracking-wider text-gray-500";

    const inputHeight = style === "compact" ? "h-10 rounded-lg bg-background" : "h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-black";

    return (
        <div className="space-y-4">
            {showStreet && (
                <div className="space-y-1.5">
                    <Label className={labelClass}>{t.street} *</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            value={value.addressStreet}
                            onChange={(e) => update({ addressStreet: e.target.value })}
                            placeholder={t.streetPlaceholder}
                            className={cn(inputHeight, "pl-9", errors.addressStreet && "border-red-500")}
                        />
                    </div>
                    {errors.addressStreet && <p className="text-xs text-red-500">{t.streetRequired}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={labelClass}>{t.province} *</Label>
                    <SearchableSelect
                        value={value.provinceId}
                        items={PROVINCES}
                        placeholder={t.pickProvince}
                        searchPlaceholder={`${t.search} ${t.province.toLowerCase()}…`}
                        emptyText={t.noResult}
                        error={errors.provinceId}
                        triggerClassName={style === "compact" ? undefined : "h-12 rounded-xl bg-gray-50 border-gray-200"}
                        onChange={(code) => update({
                            provinceId: code,
                            regencyId: "",
                            districtId: "",
                            villageId: "",
                        })}
                    />
                    {errors.provinceId && <p className="text-xs text-red-500">{t.required}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label className={labelClass}>{t.regency} *</Label>
                    <SearchableSelect
                        value={value.regencyId}
                        items={filteredRegencies}
                        placeholder={value.provinceId ? t.pickRegency : t.afterProvince}
                        searchPlaceholder={`${t.search} ${t.regency.toLowerCase()}…`}
                        emptyText={t.noResult}
                        disabled={!value.provinceId}
                        error={errors.regencyId}
                        triggerClassName={style === "compact" ? undefined : "h-12 rounded-xl bg-gray-50 border-gray-200"}
                        onChange={(code) => update({
                            regencyId: code,
                            districtId: "",
                            villageId: "",
                        })}
                    />
                    {errors.regencyId && <p className="text-xs text-red-500">{t.required}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className={labelClass}>{t.district} *</Label>
                    <SearchableSelect
                        value={value.districtId}
                        items={districts}
                        placeholder={value.regencyId ? t.pickDistrict : t.afterRegency}
                        searchPlaceholder={`${t.search} ${t.district.toLowerCase()}…`}
                        emptyText={loadingDistricts ? `${t.loading}…` : t.noResult}
                        disabled={!value.regencyId}
                        loading={loadingDistricts}
                        error={errors.districtId}
                        triggerClassName={style === "compact" ? undefined : "h-12 rounded-xl bg-gray-50 border-gray-200"}
                        onChange={(code) => update({ districtId: code, villageId: "" })}
                    />
                    {errors.districtId && <p className="text-xs text-red-500">{t.required}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label className={labelClass}>{t.village} *</Label>
                    <SearchableSelect
                        value={value.villageId}
                        items={villages}
                        placeholder={value.districtId ? t.pickVillage : t.afterDistrict}
                        searchPlaceholder={`${t.search} ${t.village.toLowerCase()}…`}
                        emptyText={loadingVillages ? `${t.loading}…` : t.noResult}
                        disabled={!value.districtId}
                        loading={loadingVillages}
                        error={errors.villageId}
                        triggerClassName={style === "compact" ? undefined : "h-12 rounded-xl bg-gray-50 border-gray-200"}
                        onChange={(code) => update({ villageId: code })}
                    />
                    {errors.villageId && <p className="text-xs text-red-500">{t.required}</p>}
                </div>

                {showPostalCode && (
                    <div className="space-y-1.5">
                        <Label className={labelClass}>{t.postalCode} *</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                value={value.postalCode}
                                onChange={(e) => update({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                                placeholder="12xxx"
                                inputMode="numeric"
                                maxLength={5}
                                className={cn(inputHeight, "pl-9", errors.postalCode && "border-red-500")}
                            />
                        </div>
                        {errors.postalCode && <p className="text-xs text-red-500">{t.postalRequired}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

// Async helper for forms saving the full address as a single string. Uses the
// shared client cache, so once the user has picked the values, the lookup is free.
export async function resolveAddressNames(value: AddressValue) {
    const province = PROVINCES.find((p) => p.code === value.provinceId)?.name ?? "";
    const regency = REGENCIES.find((r) => r.code === value.regencyId)?.name ?? "";
    let district = "";
    let village = "";
    if (value.regencyId && value.districtId) {
        const dList = await fetchDistricts(value.regencyId);
        district = dList.find((d) => d.code === value.districtId)?.name ?? "";
    }
    if (value.districtId && value.villageId) {
        const vList = await fetchVillages(value.districtId);
        village = vList.find((v) => v.code === value.villageId)?.name ?? "";
    }
    return { province, regency, district, village };
}

export function formatFullAddress(parts: { province: string; regency: string; district: string; village: string }, street: string, postalCode: string) {
    const segments = [street, parts.village, parts.district, parts.regency, parts.province].filter(Boolean);
    return `${segments.join(", ")}${postalCode ? ` ${postalCode}` : ""}`;
}
