import { NextResponse } from "next/server";
import { PROVINCES } from "@/lib/wilayah-cache";

export async function GET() {
    return NextResponse.json(PROVINCES);
}
