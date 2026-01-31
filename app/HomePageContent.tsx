// app/HomePageContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MemeGrid from "../components/MemeGrid";
import { getMemesAction, searchMemesAction } from "@/app/actions/memeActions";
import { Meme } from "@/lib/types";

export default function HomePageContent() {
  const searchParams = useSearchParams();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter values from URL params
  const searchQuery = searchParams.get("q") || "";
  const country = searchParams.get("country") || "All";
  const language = searchParams.get("language") || "All";

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        setLoading(true);
        let data: Meme[] = [];

        if (searchQuery) {
          // Search with query
          data = await searchMemesAction(searchQuery, country, language);
        } else if (country !== "All" || language !== "All") {
          // Filter by country/language without search query
          data = await getMemesAction(100); // Get more to filter
          if (country !== "All") {
            data = data.filter((m) => m.country === country);
          }
          if (language !== "All") {
            data = data.filter((m) => m.language === language);
          }
        } else {
          // Get all trending memes
          data = await getMemesAction(20);
        }
        setMemes(data);
      } catch (err: any) {
        console.error("Error fetching memes:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMemes();
  }, [searchQuery, country, language]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trending Video Reactions</h1>
          <p className="text-muted mt-1">
            Discover trending reactions across countries and languages
          </p>
        </div>

        <div />
      </div>

      <div className="mt-8 grid-cards">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted">Loading memes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">Error loading memes: {error}</p>
          </div>
        ) : memes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">
              No memes found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <MemeGrid memes={memes} />
        )}
      </div>
    </section>
  );
}
