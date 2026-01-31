// components/MemeCard.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Tag from "./Tag";
import DownloadMenu from "./DownloadMenu";
import VideoPlayer from "./VideoPlayer";
import VideoPreview from "./VideoPreview";
import ReportModal from "./ReportModal";
import ShareModal from "./ShareModal";
import { useBookmarks } from "@/hooks/useBookmarks";
import useAuth from "@/hooks/useAuth";
import { compactNumber } from "../utils/format";
import { Dropdown } from "./UI/Dropdown";
import { motion } from "framer-motion";

export default function MemeCard({ meme }: { meme: any }) {
  const router = useRouter();
  const { user } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        className="meme-card p-3 flex flex-col"
      >
        {/* Video preview with play button */}
        <div className="relative w-full h-62.75 rounded-md overflow-hidden">
          <VideoPreview
            videoUrl={meme.video_url}
            title={meme.title}
            className="w-full h-full rounded-md"
            onPlayClick={() => setIsVideoPlayerOpen(true)}
          />

          {/* Options menu */}
          <div className="absolute top-2 right-2 z-10">
            <Dropdown
              trigger={
                <button className="p-1 hover:bg-white/5 rounded transition">
                  <img src="/options.svg" alt="Options" className="w-5 h-5" />
                </button>
              }
              align="right"
            >
              {({ close }: { close: () => void }) => (
                <div className="w-32 sm:w-40 py-1 px-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsShareModalOpen(true);
                      close();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 rounded-md text-xs sm:text-sm cursor-pointer transition whitespace-nowrap"
                  >
                    <img
                      src="/share-icon.svg"
                      alt=""
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="overflow-hidden text-ellipsis">Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) {
                        router.push("/auth");
                        close();
                        return;
                      }
                      await toggleBookmark(meme.id);
                      close();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 rounded-md text-xs sm:text-sm cursor-pointer transition whitespace-nowrap"
                  >
                    <img
                      src="/bookmark.svg"
                      alt=""
                      className={`w-4 h-4 shrink-0 ${
                        isBookmarked(meme.id) ? "opacity-100" : "opacity-60"
                      }`}
                    />
                    <span className="overflow-hidden text-ellipsis">
                      {isBookmarked(meme.id) ? "Unbookmark" : "Bookmark"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(true);
                      close();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 rounded-md text-xs sm:text-sm cursor-pointer transition whitespace-nowrap"
                  >
                    <img src="/flag.svg" alt="" className="w-4 h-4 shrink-0" />
                    <span className="overflow-hidden text-ellipsis">
                      Report
                    </span>
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
        </div>

        {/* Card content */}
        <div className="mt-3 flex-1">
          <h3 className="font-semibold line-clamp-2">{meme.title}</h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {meme.tags &&
              meme.tags.slice(0, 3).map((t: string) => <Tag key={t}>#{t}</Tag>)}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-muted flex items-center gap-2">
              <span className="flex items-center gap-1">
                <img src="/views.svg" alt="" className="w-3 h-3" />
                {compactNumber(meme.views || 0)}
              </span>
              •
              <span className="flex items-center gap-1">
                <img src="/downloads.svg" alt="" className="w-3 h-3" />
                {compactNumber(meme.downloads || 0)}
              </span>
            </div>
            <div className="text-sm text-muted flex items-center gap-1">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="hover:opacity-80 transition cursor-pointer"
                title="Report this meme"
              >
                <img src="/flag.svg" alt="Report" className="w-3 h-3 mr-1" />
              </button>
              By{" "}
              <Link
                href={`/profile?id=${meme.creator_id}`}
                className="text-cyan-400 font-bold hover:text-cyan-300 transition cursor-pointer max-w-18 sm:max-w-28 truncate inline-block align-bottom"
              >
                {meme.creator_name || "User"}
              </Link>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <DownloadMenu memeId={meme.id} />
          </div>
        </div>
      </motion.article>

      {/* Video player modal */}
      <VideoPlayer
        isOpen={isVideoPlayerOpen}
        onClose={() => setIsVideoPlayerOpen(false)}
        videoUrl={meme.video_url}
        title={meme.title}
        creator={meme.creator_name || "User"}
        memeId={meme.id}
      />

      {/* Share modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        memeId={meme.id}
        memeTitle={meme.title}
      />

      {/* Report modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        memeId={meme.id}
        memeTitle={meme.title}
      />
    </>
  );
}
