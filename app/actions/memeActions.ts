"use server";

import { supabaseServer } from "@/lib/supabase";
import { Meme } from "@/lib/types";

// Helper to sanitize meme
const sanitizeMeme = (meme: any): Meme => ({
  ...meme,
  creator_name: meme.creator?.name || "User",
});

export const getMemesAction = async (limit = 20, offset = 0) => {
  if (!supabaseServer) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
    return [];
  }

  const { data, error } = await supabaseServer
    .from("memes")
    .select(`
      id,
      title,
      description,
      video_url,
      thumbnail_url,
      creator_id,
      created_at,
      updated_at,
      views,
      downloads,
      tags,
      country,
      language,
      creator:creator_id (name)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching memes:", error);
    throw error;
  }

  return (data as any[]).map(sanitizeMeme);
};

export const getMemeByIdAction = async (id: string) => {
  if (!supabaseServer) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
    return null;
  }

  const { data, error } = await supabaseServer
    .from("memes")
    .select(`
      id,
      title,
      description,
      video_url,
      thumbnail_url,
      creator_id,
      created_at,
      updated_at,
      views,
      downloads,
      tags,
      country,
      language,
      creator:creator_id (name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching meme:", error);
    return null;
  }

  return sanitizeMeme(data);
};

export const getMemesByIdsAction = async (ids: string[]) => {
  if (!supabaseServer) return [];
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServer
    .from("memes")
    .select(`
      id,
      title,
      description,
      video_url,
      thumbnail_url,
      creator_id,
      created_at,
      updated_at,
      views,
      downloads,
      tags,
      country,
      language,
      creator:creator_id (name)
    `)
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching memes by ids:", error);
    return [];
  }

  return (data as any[]).map(sanitizeMeme);
};

export const searchMemesAction = async (
  query: string,
  country?: string,
  language?: string
) => {
  if (!supabaseServer) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
    return [];
  }

  let q = supabaseServer
    .from("memes")
    .select(`
      id,
      title,
      description,
      video_url,
      thumbnail_url,
      creator_id,
      created_at,
      updated_at,
      views,
      downloads,
      tags,
      country,
      language,
      creator:creator_id (name)
    `)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

  if (country && country !== "All") {
    q = q.eq("country", country);
  }
  if (language && language !== "All") {
    q = q.eq("language", language);
  }

  const { data, error } = await q.order("created_at", { ascending: false });

  if (error) {
    console.error("Error searching memes:", error);
    throw error;
  }

  return (data as any[]).map(sanitizeMeme);
};
