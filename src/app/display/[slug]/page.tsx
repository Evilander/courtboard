import { notFound } from "next/navigation";
import { getDisplayPayload } from "@/lib/display";
import { createDisplaySessionToken } from "@/lib/security/display-session";
import { DisplayClient } from "./display-client";

export const dynamic = "force-dynamic";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const payload = getDisplayPayload(slug);
  if (!payload) {
    notFound();
  }

  const displaySessionToken = await createDisplaySessionToken(slug);

  return <DisplayClient displaySessionToken={displaySessionToken} payload={payload} />;
}
