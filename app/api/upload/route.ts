import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload request received");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = JSON.parse(formData.get("tags") as string || "[]");
    const country = formData.get("country") as string;
    const language = formData.get("language") as string;
    const creatorId = formData.get("creator_id") as string;

    console.log("Form data parsed:", { title, creatorId, fileSize: file?.size });

    if (!file || !title || !creatorId) {
      console.error("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields (file, title, creator_id)" },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      console.error("Supabase server client not initialized");
      return NextResponse.json(
        { error: "Server not configured: missing service role key" },
        { status: 500 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty (0 bytes). Please try a different file." },
        { status: 400 }
      );
    }

    // Convert File to Buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("File converted to buffer, size:", buffer.length);

    // Upload video file to storage (server client)
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 200);
    const filename = `${Date.now()}_${sanitizedName}`;
    
    console.log("Uploading to storage:", filename);

    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from("memes")
      .upload(`videos/${filename}`, buffer, {
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      
      // Provide helpful error messages
      let errorMessage = uploadError.message;
      if (errorMessage.includes("ECONNRESET") || errorMessage.includes("fetch failed")) {
        errorMessage = `Connection to storage failed (Network error: ${uploadError.message}). Please check your internet connection.`;
      } else if (errorMessage.includes("not found")) {
        errorMessage = 'The "memes" storage bucket does not exist. Please contact an administrator.';
      } else if (errorMessage.includes("unauthorized") || errorMessage.includes("permission")) {
        errorMessage = "You don't have permission to upload. Make sure you're signed in.";
      }

      return NextResponse.json(
        { error: `Upload failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    console.log("File uploaded successfully");

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseServer.storage.from("memes").getPublicUrl(`videos/${filename}`);

    console.log("Public URL generated:", publicUrl);

    // Create meme record in database
    const { data: memeData, error: dbError } = await supabaseServer
      .from("memes")
      .insert([
        {
          title: title.trim(),
          description: description ? description.trim() : null,
          video_url: publicUrl,
          tags: tags && tags.length > 0 ? tags : [],
          country: country && country !== "All" ? country : null,
          language: language && language !== "All" ? language : null,
          creator_id: creatorId,
          views: 0,
          downloads: 0,
        },
      ])
      .select();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log("Meme record created:", memeData?.[0]?.id);

    return NextResponse.json(
      { message: "Meme uploaded successfully", meme: memeData?.[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Error: ${error?.message || "Internal server error"}` },
      { status: 500 }
    );
  }
}
