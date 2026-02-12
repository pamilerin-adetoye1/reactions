"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPreviewProps {
  videoUrl: string;
  title: string;
  className?: string;
  onPlayClick?: () => void;
}

export default function VideoPreview({
  videoUrl,
  title,
  className = "",
  onPlayClick,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Detect if device supports hover (desktop) or is touch (mobile)
    const isTouchSupported = () =>
      (typeof window !== "undefined" &&
        ("ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as any).msMaxTouchPoints > 0)) ||
      false;

    setIsTouchDevice(isTouchSupported());
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      // Seek to 2 seconds for preview if possible
      if (video.duration > 2) {
        video.currentTime = 2;
      }
    };

    const handleCanPlay = () => {
      // Auto-play only on touch devices (mobile)
      // On desktop, wait for hover
      if (isTouchDevice || isHovering) {
        video.play().catch((err) => {
          // Auto-play may be blocked, that's okay
          console.log("Auto-play blocked:", err.message);
          // On mobile, if autoplay fails, we just show the poster/first frame
        });
      }
    };

    const handleError = (e: any) => {
      console.error("Video error in preview:", videoUrl, e);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl, isTouchDevice, isHovering]);

  // Handle hover for desktop devices
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsHovering(true);
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {
          // Auto-play blocked, that's okay
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsHovering(false);
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
    }
  };

  return (
    <div
      className={`relative bg-black/20 overflow-hidden group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        webkit-playsinline="true"
        x5-playsinline="true"
        className="w-full h-full object-cover group-hover:brightness-75 transition"
      />

      {/* Overlay with play button */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition cursor-pointer"
        onClick={onPlayClick}
      >
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition">
          <svg
            className="w-8 h-8 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}
