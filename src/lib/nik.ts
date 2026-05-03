/**
 * Parse the demographic bits embedded in an Indonesian NIK (16 digits).
 * Returns null when the NIK is malformed.
 *
 *   - Digits 7-8  : day of birth (+40 if female)
 *   - Digits 9-10 : month of birth
 *   - Digits 11-12: year of birth (last two digits)
 */
export function parseNikData(nik: string): { gender: "LAKI-LAKI" | "PEREMPUAN"; birthDate: string } | null {
    if (nik.length !== 16) return null;
    const dayCode = parseInt(nik.substring(6, 8));
    const monthCode = parseInt(nik.substring(8, 10));
    const yearCode = parseInt(nik.substring(10, 12));
    if (isNaN(dayCode) || isNaN(monthCode) || isNaN(yearCode)) return null;

    let gender: "LAKI-LAKI" | "PEREMPUAN" = "LAKI-LAKI";
    let day = dayCode;
    if (dayCode > 40) {
        gender = "PEREMPUAN";
        day = dayCode - 40;
    }
    const currentYearShort = new Date().getFullYear() % 100;
    const yearPrefix = yearCode > currentYearShort ? "19" : "20";
    const fullYear = `${yearPrefix}${yearCode.toString().padStart(2, "0")}`;
    const birthDate = `${fullYear}-${monthCode.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    return { gender, birthDate };
}
