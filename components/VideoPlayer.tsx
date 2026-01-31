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
      await fetch(`/api/memes/${memeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment_views" }),
      });
    } catch (error) {
      console.error("Error recording view:", error);
      viewsRecordedRef.current = false; // Reset on error to retry
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Record view when modal opens
      recordView();

      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";

      // Try to play the video
      const playVideo = async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            console.error("Error playing video:", error);
            // Video might require user interaction on mobile
          }
        }
      };
      playVideo();

      // Handle video events
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      if (videoRef.current) {
        videoRef.current.addEventListener('play', handlePlay);
        videoRef.current.addEventListener('pause', handlePause);
      }

      // Handle ESC key press
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleEsc);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('play', handlePlay);
          videoRef.current.removeEventListener('pause', handlePause);
          videoRef.current.pause(); // Pause when closing
        }
        window.removeEventListener("keydown", handleEsc);
        document.body.style.overflow = "auto";
      };
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

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
