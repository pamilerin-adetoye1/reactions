"use client";

import { useState, useEffect, useRef } from "react";

interface VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  creator?: string;
  memeId?: string;
}

export default function VideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  title,
  creator,
  memeId,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const viewsRecordedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Record view when video starts playing
  const recordView = async () => {
    if (!memeId || viewsRecordedRef.current) return;

    try {
      viewsRecordedRef.current = true;
      const response = await fetch(`/api/memes/${memeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment_views" }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to increment views: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error recording view:", error);
      // Reset after a delay to allow retry if playback continues/restarts
      setTimeout(() => {
        viewsRecordedRef.current = false;
      }, 5000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";

      // Handle video events
      const handlePlay = () => {
        setIsPlaying(true);
        recordView(); // Record view when playback actually starts
      };
      const handlePause = () => setIsPlaying(false);

      if (videoRef.current) {
        videoRef.current.addEventListener("play", handlePlay);
        videoRef.current.addEventListener("pause", handlePause);

        // Ensure video is loaded and try to play
        videoRef.current.load();

        // Some low-end devices need a bit of time after .load()
        const playTimer = setTimeout(async () => {
          if (videoRef.current) {
            try {
              // Try playing muted first if unmuted fails (common mobile restriction)
              await videoRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              console.log("Play failed, retrying muted...", error);
              if (videoRef.current) {
                videoRef.current.muted = true;
                try {
                  await videoRef.current.play();
                  setIsPlaying(true);
                } catch (mutedError) {
                  console.error("Muted play also failed:", mutedError);
                }
              }
            }
          }
        }, 150);

        return () => {
          clearTimeout(playTimer);
          if (videoRef.current) {
            videoRef.current.removeEventListener("play", handlePlay);
            videoRef.current.removeEventListener("pause", handlePause);
            videoRef.current.pause();
          }
        };
      }

      // Handle ESC key press
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleEsc);
      return () => {
        window.removeEventListener("keydown", handleEsc);
        document.body.style.overflow = "auto";
      };
    } else {
      document.body.style.overflow = "auto";
      viewsRecordedRef.current = false; // Reset when modal closes
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose, memeId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Blur background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal content */}
      <div
        className="relative w-full h-full max-w-6xl max-h-screen flex flex-col items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-white/10 rounded-full transition"
          aria-label="Close video"
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Video container */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
            controlsList="nodownload"
            playsInline
            preload="auto"
            webkit-playsinline="true"
            x5-playsinline="true"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video info */}
        <div className="mt-6 text-center max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          {creator && (
            <p className="text-gray-300 flex items-center justify-center gap-1">
              By{" "}
              <span className="font-bold max-w-28 truncate" title={creator}>
                {creator}
              </span>
            </p>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="mt-4 text-sm text-gray-400">
          Press <kbd className="bg-white/10 px-2 py-1 rounded">ESC</kbd> to
          close
        </div>
      </div>
    </div>
  );
}
