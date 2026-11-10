import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = (formData.get("userId") as string) || "user";

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Try Supabase Storage 'avatars' bucket first
    try {
      const supabase = await createClient();
      const filePath = `${userId}/avatar-${Date.now()}.webp`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("avatars")
        .upload(filePath, buffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!storageError && storageData) {
        const { data: pubData } = supabase.storage
          .from("avatars")
          .getPublicUrl(storageData.path);

        if (pubData?.publicUrl) {
          return NextResponse.json({ url: pubData.publicUrl, source: "supabase" });
        }
      }
    } catch {
      // Fallback to local storage if Supabase storage bucket is not configured
    }

    // 2. Fallback to saving in public/uploads/avatars/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeFileName = `${userId.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}.webp`;
    const fullPath = path.join(uploadDir, safeFileName);
    await fs.writeFile(fullPath, buffer);

    const publicUrl = `/uploads/avatars/${safeFileName}`;
    return NextResponse.json({ url: publicUrl, source: "local" });
  } catch (err: any) {
    console.error("Avatar upload API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
