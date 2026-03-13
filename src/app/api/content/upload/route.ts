import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { saveUploadedImage } from "@/lib/uploads";
import { badRequest } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return badRequest("Image file is required.");
  }

  const imagePath = await saveUploadedImage(file);

  writeAuditLog({
    userId: user.id,
    action: "content.upload",
    entityType: "file",
    entityId: imagePath,
    details: {
      filename: file.name,
      size: file.size,
    },
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  return NextResponse.json({ imagePath }, { status: 201 });
}
