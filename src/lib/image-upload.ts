import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveBase64Image(base64Data: string, prefix: string): Promise<string | null> {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            console.error("Invalid base64 format");
            return null;
        }

        const type = matches[1];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

        if (!allowedTypes.includes(type)) {
            console.error(`Invalid file type: ${type}`);
            return null;
        }

        const buffer = Buffer.from(matches[2], 'base64');

        // Security: Check file size (Max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
            console.error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
            return null;
        }

        const ext = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
        const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
        // Ensure strictly saving to public/uploads/verification
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "verification");

        await mkdir(uploadsDir, { recursive: true });

        // Write file
        await writeFile(path.join(uploadsDir, fileName), buffer);

        return `/uploads/verification/${fileName}`;

    } catch (e) {
        console.error("Failed to save image", e);
    }
    return null;
}
