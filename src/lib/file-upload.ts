import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveDocument(file: File, prefix: string): Promise<string | null> {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        // Security: Check file size (Max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            console.error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
            return null;
        }

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            console.error(`Invalid file type: ${file.type}`);
            return null;
        }

        const ext = file.name.split('.').pop();
        const fileName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");

        await mkdir(uploadsDir, { recursive: true });

        // Write file
        await writeFile(path.join(uploadsDir, fileName), buffer);

        return `/uploads/documents/${fileName}`;

    } catch (e) {
        console.error("Failed to save document", e);
    }
    return null;
}
