import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserWithProfile, updateUserProfile } from "@/lib/auth-queries";
import { saveBase64Image } from "@/lib/image-upload";

export async function GET() {
    const cookieStore = await cookies();
    // login sets session_agent_user_id; fall back to app_user_id for legacy
    const userId =
        cookieStore.get("session_agent_user_id")?.value ??
        cookieStore.get("app_user_id")?.value;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await findUserWithProfile(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const cookieStatus = cookieStore.get("session_agent_status")?.value;
        const res = NextResponse.json(user);

        // Auto-refresh cookie if status changed (e.g., admin approved them behind the scenes)
        if (cookieStatus && cookieStatus !== user.status) {
            res.cookies.set("session_agent_status", user.status, {
                httpOnly: true,
                path: "/",
                sameSite: "lax",
                maxAge: 30 * 24 * 60 * 60
            });
        }

        return res;
    } catch (error) {
        console.error("Failed to fetch profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}



export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const userId =
        cookieStore.get("session_agent_user_id")?.value ??
        cookieStore.get("app_user_id")?.value;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Minimal validation for document uploads
        if (!body.fullName && !body.ktp_image && !body.selfie_image) {
            return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
        }

        let ktpImagePath = undefined;
        if (body.ktp_image) {
            ktpImagePath = await saveBase64Image(body.ktp_image, "ktp") || undefined;
        }

        let selfieImagePath = undefined;
        if (body.selfie_image) {
            selfieImagePath = await saveBase64Image(body.selfie_image, "selfie") || undefined;
        }

        await updateUserProfile(userId, {
            fullName: body.fullName,
            phone: body.phone,
            address: body.address || "",
            birthDate: body.birthDate,
            gender: body.gender,
            nik: body.nik || "",
            ktpImagePath,
            selfieImagePath
        });

        const updatedUser = await findUserWithProfile(userId);
        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error("Failed to update profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
