import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
      });
    }

    if (!startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: "Start and end times required" }),
        { status: 400 }
      );
    }

    // Create temporary directory
    const tempDir = path.join(os.tmpdir(), "video-trim-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Save uploaded file to temp location
      const inputPath = path.join(tempDir, "input.mp4");
      const outputPath = path.join(tempDir, "output.mp4");

      const buffer = await file.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(buffer));

      // Calculate duration for validation
      const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:nokey=1 "${inputPath}"`;
      const { stdout: durationStr } = await execAsync(durationCmd);
      const duration = parseFloat(durationStr.trim());

      const startNum = parseFloat(startTime);
      const endNum = parseFloat(endTime);

      // Validate times
      if (startNum < 0 || endNum > duration || startNum >= endNum) {
        return new Response(
          JSON.stringify({
            error: "Invalid trim times. Start must be >= 0, end must be <= duration, and start < end.",
          }),
          { status: 400 }
        );
      }

      // Trim video using ffmpeg
      const trimCmd = `ffmpeg -i "${inputPath}" -ss ${startNum} -to ${endNum} -c:v libx264 -c:a aac -y "${outputPath}"`;
      await execAsync(trimCmd);

      // Verify output file
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error("FFmpeg produced an empty file");
      }

      // Read trimmed video
      const trimmedBuffer = await fs.readFile(outputPath);

      // Clean up temp files
      await fs.rm(tempDir, { recursive: true, force: true });

      // Return trimmed video
      return new Response(trimmedBuffer, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="trimmed_${Date.now()}.mp4"`,
        },
      });
    } catch (error) {
      // Clean up temp files on error
      await fs.rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    console.error("Video trim error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to trim video: " + (error instanceof Error ? error.message : "Unknown error"),
      }),
      { status: 500 }
    );
  }
}
