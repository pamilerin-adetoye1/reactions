"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useAuth from "@/hooks/useAuth";
import { Meme } from "@/lib/types";
import { getMemesByIdsAction } from "@/app/actions/memeActions";

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarkedMemes, setBookmarkedMemes] = useState<Meme[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's bookmarked memes
  const fetchBookmarks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get bookmarked meme IDs
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from("bookmarks")
        .select("meme_id")
        .eq("user_id", user.id);

      if (bookmarksError) throw bookmarksError;

      const ids = new Set(bookmarks?.map((b) => b.meme_id) || []);
      setBookmarkedIds(ids);

      // Fetch full meme data for bookmarked memes
      if (ids.size > 0) {
        const memes = await getMemesByIdsAction(Array.from(ids));
        setBookmarkedMemes(memes || []);
      } else {
        setBookmarkedMemes([]);
      }
    } catch (err: any) {
      console.error("Error fetching bookmarks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [user]);

  // Add bookmark
  const addBookmark = async (memeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        meme_id: memeId,
      });

      if (error) throw error;

      // Update local state
      setBookmarkedIds((prev) => new Set([...prev, memeId]));

      // Refetch bookmarks
      await fetchBookmarks();
    } catch (err: any) {
      console.error("Error adding bookmark:", err);
      throw err;
    }
  };

  // Remove bookmark
  const removeBookmark = async (memeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("meme_id", memeId);

      if (error) throw error;

      // Update local state
      setBookmarkedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memeId);
        return newSet;
      });

      // Refetch bookmarks
      await fetchBookmarks();
    } catch (err: any) {
      console.error("Error removing bookmark:", err);
      throw err;
    }
  };

  // Check if meme is bookmarked
  const isBookmarked = (memeId: string) => bookmarkedIds.has(memeId);

  // Toggle bookmark (add or remove)
  const toggleBookmark = async (memeId: string) => {
    try {
      if (isBookmarked(memeId)) {
        await removeBookmark(memeId);
      } else {
        await addBookmark(memeId);
      }
      return { success: true };
    } catch (err: any) {
      console.error("Error toggling bookmark:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    bookmarkedMemes,
    bookmarkedIds,
    loading,
    error,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
    refetch: fetchBookmarks,
  };
};

export default useBookmarks;
