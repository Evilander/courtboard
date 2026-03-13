"use client";

import { useEffect } from "react";

export function DisplayLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("display-mode");
    document.body.classList.add("display-mode");

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    return () => {
      document.documentElement.classList.remove("display-mode");
      document.body.classList.remove("display-mode");
    };
  }, []);

  return <>{children}</>;
}
