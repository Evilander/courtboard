import { notFound } from "next/navigation";
import { getDisplayPayload } from "@/lib/display";
import { DisplayClient } from "./display-client";

export const dynamic = "force-dynamic";

export default function DisplayPage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const payload = getDisplayPayload(params.slug);
  if (!payload) {
    notFound();
  }

  return <DisplayClient payload={payload} />;
}
