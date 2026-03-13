import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/auth/session";
import { getIpFromHeaders } from "@/lib/request/ip";
import { writeAuditLog } from "@/lib/audit";
import { mapCsvRowsToSchedules, inferScheduleMapping, parseCsv } from "@/lib/csv";
import { createScheduleEntry } from "@/lib/data/schedules";
import { emitDisplayUpdate } from "@/lib/sse/bus";
import { badRequest } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response, user } = await requireRouteUser("editor");
  if (response || !user) {
    return response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "preview");
  const mappingRaw = formData.get("mapping");

  if (!(file instanceof File)) {
    return badRequest("CSV file is required.");
  }

  const csvText = await file.text();
  const parsed = parseCsv(csvText);
  const suggestedMapping = inferScheduleMapping(parsed.headers);

  if (mode === "preview") {
    return NextResponse.json({
      headers: parsed.headers,
      suggestedMapping,
      preview: parsed.rows.slice(0, 8),
      totalRows: parsed.rows.length,
    });
  }

  if (typeof mappingRaw !== "string") {
    return badRequest("Column mapping is required for import.");
  }

  let mapping: Record<string, string>;
  try {
    mapping = JSON.parse(mappingRaw) as Record<string, string>;
  } catch {
    return badRequest("Column mapping must be valid JSON.");
  }

  const mappedRows = mapCsvRowsToSchedules(parsed.rows, mapping);
  const imported = mappedRows.map((row) =>
    createScheduleEntry({
      ...row,
      screenId: null,
      estimatedDuration: row.estimatedDuration ?? null,
    }),
  );

  writeAuditLog({
    userId: user.id,
    action: "schedule.import",
    entityType: "schedule_entry",
    entityId: null,
    details: {
      importedCount: imported.length,
      filename: file.name,
    },
    ipAddress: getIpFromHeaders(new Headers(request.headers)),
  });

  emitDisplayUpdate({ type: "schedule.updated" });

  return NextResponse.json({ imported });
}
