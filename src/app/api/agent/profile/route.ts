import { NextResponse } from "next/server";
import { findUserWithProfile, updateUserProfile } from "@/lib/auth-queries";
import { saveBase64Image } from "@/lib/image-upload";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    try {
        const user = await findUserWithProfile(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Failed to fetch profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}



export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

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
        const dbError = error as { code?: string; constraint?: string; message?: string } | undefined;
        if (dbError?.code === "23514" && dbError?.constraint === "person_phone_number_check") {
            return NextResponse.json(
                { error: "Phone number is invalid. Use format like +628123456789." },
                { status: 400 }
            );
        }
        if (error instanceof Error && error.message.toLowerCase().includes("phone number")) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
