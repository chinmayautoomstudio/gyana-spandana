"use client";

import { useEffect, useState } from "react";

const ANNOUNCEMENT_DISMISSED_KEY = "topAnnouncementDismissed";

export function TopAnnouncementBar() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const dismissed = window.sessionStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) === "1";
      setIsVisible(!dismissed);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, "1");
    } catch {
      // Ignore storage failures and still hide locally.
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <section className="fixed top-20 left-0 right-0 z-40 w-full border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 sm:px-6 md:items-center lg:px-8">
        <p className="text-sm leading-relaxed text-amber-900 md:text-[0.95rem]">
          <span className="font-semibold">Important Update:</span> The Gyana Spardha Quiz Competition has been postponed.
          The new date is <span className="font-semibold">To Be Declared Soon.</span> Registration is still open, and
          participants can continue to register. Further date announcements will be communicated through the registered
          email address.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-800 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>
    </section>
  );
}
