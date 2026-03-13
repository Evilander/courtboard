import type { Metadata } from "next";
import { DisplayLayoutClient } from "./display-layout-client";

export const metadata: Metadata = {
  title: "CourtBoard Display",
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DisplayLayoutClient>{children}</DisplayLayoutClient>;
}
