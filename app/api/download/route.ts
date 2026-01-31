// app/api/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processVideo } from "@/lib/videoProcessor";
import { sampleMemes } from "@/lib/placeholderData";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Audio download feature disabled for now - FFmpeg not available in Vercel serverless
const FFMPEG_AVAILABLE = true;

export async function POST(request: NextRequest) {
  let tempInputPath = "";
  let tempOutputPath = "";

  try {
    const body = await request.json();
    const { memeId, format, audioType } = body;

    if (!memeId || !format || !audioType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(`Download request: memeId=${memeId}, format=${format}, audioType=${audioType}`);

    // Try to fetch from Supabase first, then fall back to sample data
    let meme: any = null;

    // Try Supabase
    let dbMeme = null;
    try {
      const { data } = await supabase
        .from("memes")
        .select("*")
        .eq("id", memeId)
        .single();
      dbMeme = data;
      if (dbMeme) {
        console.log("Meme found in Supabase");
      }
    } catch (err) {
      console.warn("Supabase query failed:", err);
    }

    if (dbMeme) {
      meme = dbMeme;
    } else {
      // Fall back to sample data
      meme = sampleMemes.find((m: any) => m.id === memeId);
      if (meme) {
        console.log("Using sample meme data");
      }
    }

    if (!meme) {
      console.error(`Meme not found: ${memeId}`);
      return NextResponse.json(
        { error: "Meme not found" },
        { status: 404 }
      );
    }

    // Get video URL from meme
    let videoUrl = meme.video_url;
    if (!videoUrl) {
      console.error("Video URL not found for meme:", meme);
      return NextResponse.json(
        { error: "Video URL not found for meme" },
        { status: 404 }
      );
    }

    console.log("Raw video URL:", videoUrl);

    // Extract the relative path if it's a full Supabase URL
    if (videoUrl.includes("supabase.co")) {
      // Extract path after /public/memes/
      const match = videoUrl.match(/\/public\/memes\/(.+)$/);
      if (match) {
        videoUrl = match[1];
        console.log("Extracted relative path from URL:", videoUrl);
      }
    }

    console.log("Final video path for download:", videoUrl);

    // Download video from either Supabase Storage or local files
    let videoBuffer: Buffer | null = null;

    // Check if it's a local file (starts with /)
    if (videoUrl.startsWith("/")) {
      // Local file
      try {
        const localPath = path.join(process.cwd(), "public", videoUrl);
        console.log("Reading local video from:", localPath);
        videoBuffer = await fs.readFile(localPath);
        console.log("Local video loaded, size:", videoBuffer.length);
      } catch (err) {
        console.error("Failed to read local video:", err);
        return NextResponse.json(
          { error: "Failed to read local video file" },
          { status: 500 }
        );
      }
    } else {
      // Supabase Storage file
      try {
        console.log("Downloading from Supabase Storage:", videoUrl);
        const { data, error: downloadError } = await supabase
          .storage
          .from("memes")
          .download(videoUrl);

        if (downloadError || !data) {
          console.error("Supabase storage error:", downloadError);
          return NextResponse.json(
            { error: `Failed to download from storage: ${downloadError?.message || "Unknown error"}` },
            { status: 500 }
          );
        }

        // Convert Blob to Buffer
        const arrayBuffer = await data.arrayBuffer();
        videoBuffer = Buffer.from(arrayBuffer);
        console.log("Supabase video loaded, size:", videoBuffer.length);
      } catch (err) {
        console.error("Failed to download from Supabase Storage:", err);
        return NextResponse.json(
          { error: "Failed to download video from storage" },
          { status: 500 }
        );
      }
    }

    if (!videoBuffer || videoBuffer.length === 0) {
      console.error("Video buffer is empty");
      return NextResponse.json(
        { error: "Video file is empty or corrupt" },
        { status: 500 }
      );
    }

    // Process video with FFmpeg if available
    let finalBuffer = videoBuffer;
    let contentType = "video/mp4";
    let fileExtension = format.toLowerCase();

    console.log(`Processing video: format=${format}, audioType=${audioType}, FFmpegAvailable=${FFMPEG_AVAILABLE}`);

    if (FFMPEG_AVAILABLE && (format !== "MP4" || audioType === "no")) {
      // Only use FFmpeg if we need to convert format or remove audio
      const tmpDir = os.tmpdir();
      tempInputPath = path.join(tmpDir, `input-${Date.now()}-${memeId}.mp4`);
      tempOutputPath = path.join(
        tmpDir,
        `output-${Date.now()}-${memeId}.${fileExtension}`
      );

      try {
        console.log("Starting FFmpeg processing...");
        // Write buffer to temporary file
        await fs.writeFile(tempInputPath, videoBuffer);
        console.log("Input file written:", tempInputPath);

        // Process video with FFmpeg
        await processVideo(tempInputPath, tempOutputPath, format, audioType);
        console.log("FFmpeg processing completed");

        // Read the processed video
        finalBuffer = await fs.readFile(tempOutputPath);
        console.log("Processed video loaded, size:", finalBuffer.length);
      } catch (ffmpegError) {
        console.warn("FFmpeg processing failed, returning original video:", ffmpegError);
        // Fall back to original video if FFmpeg fails
        finalBuffer = videoBuffer;
        fileExtension = "mp4"; // Fallback to original format
      }
    } else {
      console.log("Returning original video (FFmpeg not needed or not available)");
    }

    // Determine content type based on final format
    const contentTypeMap: { [key: string]: string } = {
      MP4: "video/mp4",
      WEBM: "video/webm",
      GIF: "image/gif",
    };

    contentType = contentTypeMap[format.toUpperCase()] || "video/mp4";
    const filename = `${meme.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${fileExtension}`;

    console.log(`Returning: ${filename}, size: ${finalBuffer.length} bytes, type: ${contentType}`);

    return new NextResponse(finalBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": finalBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error.message || "Download failed" },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    try {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    } catch (err) {
      console.warn("Failed to clean up temp files:", err);
    }
  }
}
