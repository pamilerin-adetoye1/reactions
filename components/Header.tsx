// components/Header.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import Button from "./UI/Button";
import Avatar from "./UI/Avatar";
import { useState, Suspense } from "react";
import UploadModal from "./UploadModal";
import useAuth from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { motion } from "framer-motion";

export default function Header() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 py-4 px-2 sm:px-4"
      >
        <div className="flex items-center justify-between w-full">
          {/* Left group: logo */}
          <div className="logo-group flex items-center gap-3 shrink-0">
            <Link href="/" className="cursor-pointer shrink-0">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                src="/REACTiONS.svg"
                alt="MEMEiD"
                className="h-5 sm:h-6 md:h-7 lg:h-8 shrink-0"
              />
            </Link>
          </div>

          {/* Right group: upload + profile */}
          <div className="right-group flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
            {loading || profileLoading ? (
              <div className="text-sm text-muted">Loading...</div>
            ) : user ? (
              <>
                <div className="hidden sm:inline-flex">
                  <Button
                    variant="primary"
                    onClick={() => setOpen(true)}
                    className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm"
                  >
                    <img
                      src="/upload-icon.svg"
                      alt=""
                      className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"
                    />
                    <span className="hidden sm:inline">Upload reactions</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* small-screen upload shown to the left of the avatar */}
                  <div className="sm:hidden">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setOpen(true)}
                      className="px-2 py-2 text-xs whitespace-nowrap flex items-center gap-0.5 mr-1"
                    >
                      <img src="/upload-icon.svg" alt="" className="w-3 h-3" />
                      <span className="text-[10px]">Upload</span>
                    </Button>
                  </div>
                  <button
                    onClick={() => router.push("/profile")}
                    className="hover:opacity-80 transition cursor-pointer shrink-0"
                  >
                    <Avatar
                      src={
                        profile?.avatar_url ||
                        "/placeholders/default-avatar.svg"
                      }
                      alt={profile?.name || user.email || "User"}
                    />
                  </button>
                  <button
                    onClick={() => router.push("/profile")}
                    className="text-xs sm:text-sm font-bold hover:opacity-80 transition hidden sm:block cursor-pointer"
                  >
                    {profile?.name || "User"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="hidden sm:inline-flex">
                  <Button
                    variant="primary"
                    onClick={() => setOpen(true)}
                    className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm"
                  >
                    <img
                      src="/upload-icon.svg"
                      alt=""
                      className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"
                    />
                    <span className="hidden sm:inline">Upload reactions</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </div>
                {/* small-screen upload shown when not signed in */}
                <div className="sm:hidden mr-1">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setOpen(true)}
                    className="px-2 py-2 text-xs whitespace-nowrap flex items-center gap-0.5"
                  >
                    <img src="/upload-icon.svg" alt="" className="w-3 h-3" />
                    <span className="text-[10px]">Upload</span>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  style={{ background: "#0FFF75" }}
                  onClick={() => router.push("/auth")}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search Bar Row - Centered and Full Width */}
        <div className="w-full flex justify-center mt-2">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-2xl"
          >
            <Suspense
              fallback={
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              }
            >
              <SearchBar />
            </Suspense>
          </motion.div>
        </div>
      </motion.header>

      {open && <UploadModal onClose={() => setOpen(false)} />}
    </>
  );
}
