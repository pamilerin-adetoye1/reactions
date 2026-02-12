// app/api/memes/[id]/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action } = await request.json();
    const { id } = await params;
    const memeId = id;

    if (!memeId || !action) {
      return NextResponse.json(
        { error: "Invalid request. memeId and action are required." },
        { status: 400 }
      );
    }

    if (action === "increment_views") {
      // Increment views - using RPC for atomic increment if available, or service role for bypass RLS
      const { error } = await supabase.rpc("increment_views", { meme_id: memeId });

      if (error) {
        console.warn("RPC increment_views failed, falling back to manual update:", error);
        
        // Fallback to manual update if RPC is not defined
        const { data: meme, error: fetchError } = await supabase
          .from("memes")
          .select("views")
          .eq("id", memeId)
          .single();

        if (fetchError) {
          console.error("Error fetching meme:", fetchError);
          return NextResponse.json({ error: "Meme not found" }, { status: 404 });
        }

        const newViews = (meme?.views || 0) + 1;
        const { error: updateError } = await supabase
          .from("memes")
          .update({ views: newViews })
          .eq("id", memeId);

        if (updateError) {
          console.error("Error updating views:", updateError);
          return NextResponse.json({ error: "Failed to increment views" }, { status: 500 });
        }

        return NextResponse.json({ success: true, views: newViews }, { status: 200 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } else if (action === "increment_downloads") {
      // Increment downloads - requires authentication
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          { error: "Unauthorized. User session required." },
          { status: 401 }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return NextResponse.json(
          { error: "Unauthorized. Invalid session." },
          { status: 401 }
        );
      }

      const { data: meme, error: fetchError } = await supabase
        .from("memes")
        .select("downloads")
        .eq("id", memeId)
        .single();

      if (fetchError) {
        console.error("Error fetching meme:", fetchError);
        return NextResponse.json(
          { error: "Meme not found" },
          { status: 404 }
        );
      }

      const newDownloads = (meme?.downloads || 0) + 1;
      const { data, error } = await supabase
        .from("memes")
        .update({ downloads: newDownloads })
        .eq("id", memeId)
        .select();

      if (error) {
        console.error("Error updating downloads:", error);
        return NextResponse.json(
          { error: "Failed to increment downloads" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, downloads: newDownloads },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Meme API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
