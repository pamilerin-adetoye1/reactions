// components/SearchBar.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import countries from "../data/countries";
import languages from "../data/languages";
import { Dropdown } from "./UI/Dropdown";
import { searchMemesAction } from "@/app/actions/memeActions";
import { Meme } from "@/lib/types";

interface SearchBarProps {
  onSearch?: (q: string, country: string, language: string) => void;
}

export default function SearchBar({
  onSearch: onSearchCallback,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("All");
  const [language, setLanguage] = useState("All");
  const [section, setSection] = useState<"country" | "language">("country");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [searchString, setSearchString] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countryFilterText, setCountryFilterText] = useState("");
  const [languageFilterText, setLanguageFilterText] = useState("");
  const [suggestions, setSuggestions] = useState<Meme[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countryRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const languageRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const countryContainerRef = useRef<HTMLDivElement | null>(null);
  const languageContainerRef = useRef<HTMLDivElement | null>(null);
  const countryInputRef = useRef<HTMLInputElement | null>(null);
  const languageInputRef = useRef<HTMLInputElement | null>(null);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countryFilterText.toLowerCase()),
  );
  const filteredLanguages = languages.filter((l) =>
    l.name.toLowerCase().includes(languageFilterText.toLowerCase()),
  );

  // Focus dropdown container when it opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        if (section === "country" && countryInputRef.current) {
          countryInputRef.current.focus();
        } else if (section === "language" && languageInputRef.current) {
          languageInputRef.current.focus();
        } else {
          const containerRef =
            section === "country" ? countryContainerRef : languageContainerRef;
          if (containerRef.current) {
            containerRef.current.focus();
          }
        }
      }, 0);
    }
  }, [isDropdownOpen, section]);

  // Debounced search for suggestions
  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (!q.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    setSuggestionsLoading(true);

    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMemesAction(q, country, language);
        setSuggestions(results.slice(0, 5)); // Show top 5 results
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300); // Debounce for 300ms

    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, [q, country, language]);

  function onSearch(e?: React.FormEvent) {
    e?.preventDefault();

    // Call callback if provided (for component usage)
    if (onSearchCallback) {
      onSearchCallback(q, country, language);
    } else {
      // Use URL params for navigation (when in header)
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (country !== "All") params.set("country", country);
      if (language !== "All") params.set("language", language);

      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : "/");
    }
  }

  const clearAll = () => {
    setQ("");
    setCountry("All");
    setLanguage("All");
    router.push("/");
  };

  // Keep input in sync with URL `q` param so suggestions navigation shows in input
  useEffect(() => {
    const current = searchParams?.get("q") || "";
    setQ(current);
  }, [searchParams]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    isCountry: boolean,
  ) => {
    const now = Date.now();
    const items = isCountry ? countries : languages;
    const allItems = ["All", ...items.map((item) => item.name)];

    // Reset search string after 500ms of inactivity
    if (now - lastKeyTime > 500) {
      setSearchString("");
    }

    // Check if key is alphanumeric
    if (e.key.match(/^[a-zA-Z0-9]$/)) {
      e.preventDefault();
      const newSearch = searchString + e.key.toLowerCase();
      setSearchString(newSearch);
      setLastKeyTime(now);

      // Find first item starting with the search string
      const matchIndex = allItems.findIndex((item) =>
        item.toLowerCase().startsWith(newSearch),
      );

      if (matchIndex !== -1) {
        const refs = isCountry ? countryRefs.current : languageRefs.current;
        const button = refs[matchIndex];
        if (button) button.focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const refs = isCountry ? countryRefs.current : languageRefs.current;
      const currentIndex = refs.findIndex(
        (ref) => ref === document.activeElement,
      );
      const nextIndex = Math.min(currentIndex + 1, refs.length - 1);
      if (refs[nextIndex]) refs[nextIndex].focus();
      setSearchString("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const refs = isCountry ? countryRefs.current : languageRefs.current;
      const currentIndex = refs.findIndex(
        (ref) => ref === document.activeElement,
      );
      const prevIndex = Math.max(currentIndex - 1, 0);
      if (refs[prevIndex]) refs[prevIndex].focus();
      setSearchString("");
    } else if (e.key === "Enter") {
      const focused = document.activeElement as HTMLButtonElement;
      if (focused) {
        focused.click();
      }
      setSearchString("");
    }
  };

  return (
    <form onSubmit={onSearch} className="search-input relative">
      <Dropdown
        trigger={
          <button
            type="button"
            aria-label="filters"
            className="p-1 hover:opacity-80 transition flex items-center gap-1 cursor-pointer"
            onClick={() => setIsDropdownOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 5h18v2H3zM7 11h10v2H7zM10 17h4v2h-4z"
                fill="currentColor"
              />
            </svg>
            {(country !== "All" || language !== "All") && (
              <span className="text-xs bg-green-500 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {(country !== "All" ? 1 : 0) + (language !== "All" ? 1 : 0)}
              </span>
            )}
          </button>
        }
        align="left"
        fullWidth={false}
        customWidth={300}
      >
        {({ close }: { close: () => void }) => {
          const handleClose = () => {
            setIsDropdownOpen(false);
            close();
          };
          return (
            <div className="search-filter-dropdown flex flex-col gap-4 p-3">
              <div className="flex gap-2 mb-1 justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("country")}
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      section === "country"
                        ? "bg-white/5 text-white"
                        : "hover:bg-white/3"
                    }`}
                  >
                    Countries
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("language")}
                    className={`px-3 py-2 rounded text-sm font-medium transition ${
                      section === "language"
                        ? "bg-white/5 text-white"
                        : "hover:bg-white/3"
                    }`}
                  >
                    Languages
                  </button>
                </div>
                {(country !== "All" || language !== "All" || q) && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {section === "country" ? (
                <div>
                  <div className="text-xs text-muted mb-2">
                    Filter by country
                  </div>
                  <input
                    ref={countryInputRef}
                    type="text"
                    placeholder="Search countries..."
                    value={countryFilterText}
                    onChange={(e) => setCountryFilterText(e.target.value)}
                    className="search-filter-input px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder-muted outline-none focus:ring-1 focus:ring-white/20 mb-2"
                  />
                  <div
                    className="search-filter-list bg-transparent border border-white/6 rounded-md p-1 modal-scroll"
                    onKeyDown={(e) => handleKeyDown(e, true)}
                    tabIndex={0}
                    ref={countryContainerRef}
                  >
                    <button
                      ref={(el) => {
                        if (el) countryRefs.current[0] = el;
                      }}
                      onClick={() => {
                        setCountry("All");
                        handleClose();
                      }}
                      className={`w-full text-left px-3 py-2 rounded cursor-pointer ${
                        country === "All"
                          ? "bg-white/5 text-white"
                          : "hover:bg-white/3"
                      }`}
                    >
                      All countries
                    </button>
                    {filteredCountries.map((c, i) => (
                      <button
                        key={c.code}
                        ref={(el) => {
                          if (el) countryRefs.current[i + 1] = el;
                        }}
                        onClick={() => {
                          setCountry(c.code);
                          handleClose();
                        }}
                        className={`w-full text-left px-3 py-2 rounded cursor-pointer ${
                          country === c.code
                            ? "bg-white/5 text-white"
                            : "hover:bg-white/3"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted mb-2">
                    Filter by language
                  </div>
                  <input
                    ref={languageInputRef}
                    type="text"
                    placeholder="Search languages..."
                    value={languageFilterText}
                    onChange={(e) => setLanguageFilterText(e.target.value)}
                    className="search-filter-input px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder-muted outline-none focus:ring-1 focus:ring-white/20 mb-2"
                  />
                  <div
                    className="search-filter-list bg-transparent border border-white/6 rounded-md p-1 modal-scroll"
                    onKeyDown={(e) => handleKeyDown(e, false)}
                    tabIndex={0}
                    ref={languageContainerRef}
                  >
                    <button
                      ref={(el) => {
                        if (el) languageRefs.current[0] = el;
                      }}
                      onClick={() => {
                        setLanguage("All");
                        handleClose();
                      }}
                      className={`w-full text-left px-3 py-2 rounded cursor-pointer ${
                        language === "All"
                          ? "bg-white/5 text-white"
                          : "hover:bg-white/3"
                      }`}
                    >
                      All languages
                    </button>
                    {filteredLanguages.map((l, i) => (
                      <button
                        key={l.code}
                        ref={(el) => {
                          if (el) languageRefs.current[i + 1] = el;
                        }}
                        onClick={() => {
                          setLanguage(l.code);
                          handleClose();
                        }}
                        className={`w-full text-left px-3 py-2 rounded cursor-pointer ${
                          language === l.code
                            ? "bg-white/5 text-white"
                            : "hover:bg-white/3"
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }}
      </Dropdown>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => q && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        placeholder="Search"
        title="Search video reactions"
        className="bg-transparent outline-none flex-1 text-sm sm:text-base"
      />

      {/* Search suggestions dropdown */}
      {showSuggestions && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 border border-white/10 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto modal-scroll">
          {suggestionsLoading ? (
            <div className="p-3 text-center text-sm text-muted">Loading...</div>
          ) : suggestions.length > 0 ? (
            <div>
              {suggestions.map((meme) => (
                <button
                  key={meme.id}
                  type="button"
                  onClick={() => {
                    const newQ = meme.title;
                    setQ(newQ);
                    setShowSuggestions(false);
                    // Navigate with the new query value directly
                    const params = new URLSearchParams();
                    params.set("q", newQ);
                    if (country !== "All") params.set("country", country);
                    if (language !== "All") params.set("language", language);
                    const queryString = params.toString();
                    router.push(queryString ? `/?${queryString}` : "/");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition text-sm border-b border-white/5 last:border-0"
                >
                  <div className="truncate font-medium text-white">
                    {meme.title}
                  </div>
                  {meme.description && (
                    <div className="text-xs text-muted truncate">
                      {meme.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-muted">
              No videos found
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        className="flex items-center justify-center shrink-0 cursor-pointer w-4 h-4 sm:w-5 sm:h-5"
        onClick={() => setShowSuggestions(false)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            color: "rgba(255, 255, 255, 0.6)",
          }}
          className="w-full h-full"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </form>
  );
}
