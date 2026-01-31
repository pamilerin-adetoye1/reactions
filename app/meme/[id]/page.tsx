// app/meme/[id]/page.tsx
"use server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import DownloadMenu from "../../../components/DownloadMenu";
import { supabase } from "@/lib/supabase";
import { sampleMemes } from "@/lib/placeholderData";

type Props = {
  params: Promise<{ id: string }>;
};

async function getMeme(id: string) {
  try {
    const { data, error } = await supabase
      .from("memes")
      .select("*")
      .eq("id", id)
      .single();
    if (data) return data;
  } catch (error) {}

  return sampleMemes.find((m) => m.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meme = await getMeme(id);

  if (!meme) {
    return {
      title: "Meme Not Found",
    };
  }

  const title = `${meme.title} - Video Meme Download`;
  const description =
    meme.description ||
    `Watch and download the ${meme.title} video meme. High quality, watermark-free reaction clip.`;

  return {
    title: meme.title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      type: "video.other",
      videos: [
        {
          url: meme.video_url,
          width: 1280,
          height: 720,
          type: "video/mp4",
        },
      ],
      images: [
        {
          url: meme.thumbnail_url || "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: meme.title,
        },
      ],
    },
    twitter: {
      card: "player",
      title: title,
      description: description,
      images: [meme.thumbnail_url || "/og-image.jpg"],
      players: [
        {
          playerUrl: meme.video_url,
          streamUrl: meme.video_url,
          width: 1280,
          height: 720,
        },
      ],
    },
  };
}

export default async function MemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meme = await getMeme(id);

  if (!meme) {
    return notFound();
  }

  // Generate JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: meme.title,
    description:
      meme.description || `Watch and download ${meme.title} - Video Meme`,
    thumbnailUrl: [meme.thumbnail_url || "https://reactions.com/og-image.jpg"],
    uploadDate: meme.created_at || new Date().toISOString(),
    contentUrl: meme.video_url,
    embedUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://reactions.com"}/meme/${meme.id}`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: meme.views || 0,
    },
  };

  // Fetch related memes
  let relatedMemes = [];
  try {
    const result = await supabase
      .from("memes")
      .select("id, title, thumbnail_url")
      .neq("id", id)
      .limit(3);
    relatedMemes = result.data || [];
  } catch (error) {
    relatedMemes = [];
  }

  return (
    <section className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-black rounded-lg overflow-hidden">
            {/* Video from Supabase Storage */}
            <video
              controls
              src={meme.video_url}
              className="w-full h-110 object-cover bg-black"
            />
          </div>
          <h1 className="text-2xl font-semibold mt-4">{meme.title}</h1>
          <div className="text-sm text-gray-400 mt-1">
            By{" "}
            <span className="font-bold text-cyan-400">
              {meme.creator_name || "User"}
            </span>
          </div>
          <div className="text-muted mt-2">
            {meme.tags &&
              Array.isArray(meme.tags) &&
              meme.tags.map((t: string) => `#${t} `)}
          </div>
          <div className="mt-4 text-sm text-muted">
            Country: {meme.country || "Unknown"} • Language:{" "}
            {meme.language || "Unknown"}
          </div>
          {meme.description && (
            <p className="mt-4 text-sm text-white">{meme.description}</p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-card p-4 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">Stats</div>
              <div className="text-sm">
                {(meme.views || 0).toLocaleString()} views
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm text-muted">
              <span>{(meme.downloads || 0).toLocaleString()} downloads</span>
            </div>
            <div className="mt-3">
              <DownloadMenu memeId={meme.id} />
            </div>
          </div>

          <div className="bg-card p-4 rounded-md">
            <div className="text-sm text-muted">Related</div>
            <div className="mt-2 space-y-2">
              {relatedMemes && relatedMemes.length > 0 ? (
                relatedMemes.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3">
                    {r.thumbnail_url && (
                      <img
                        src={r.thumbnail_url}
                        className="w-14 h-10 object-cover rounded"
                      />
                    )}
                    <div className="text-sm">{r.title}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted">No related memes</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
