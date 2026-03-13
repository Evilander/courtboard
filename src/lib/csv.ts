import { scheduleEntrySchema } from "@/lib/validation";

export type CsvPreviewRow = Record<string, string>;
export type CsvMapping = Record<string, string>;

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += character;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headerRow = [], ...dataRows] = rows.filter((entry) =>
    entry.some((cell) => cell.trim().length > 0),
  );
  const headers = headerRow.map((header) => header.trim());
  const preview = dataRows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );

  return { headers, rows: preview };
}

export function inferScheduleMapping(headers: string[]) {
  const targetSynonyms: Record<string, string[]> = {
    caseNumber: ["casenumber", "case", "docket", "docketnumber"],
    caseTitle: ["casetitle", "title", "defendant", "matter"],
    caseType: ["casetype", "type"],
    judgeName: ["judge", "judgename"],
    courtroom: ["courtroom", "room"],
    scheduledTime: ["time", "scheduledtime", "starttime"],
    estimatedDuration: ["duration", "estimatedduration", "minutes"],
    status: ["status"],
    date: ["date", "scheduleddate"],
  };

  return Object.fromEntries(
    Object.entries(targetSynonyms).map(([field, synonyms]) => {
      const match = headers.find((header) =>
        synonyms.includes(normalizeHeader(header)),
      );
      return [field, match ?? ""];
    }),
  );
}

export function mapCsvRowsToSchedules(rows: CsvPreviewRow[], mapping: CsvMapping) {
  return rows.map((row) => {
    const payload = {
      screenId: null,
      caseNumber: row[mapping.caseNumber] ?? "",
      caseTitle: row[mapping.caseTitle] ?? "",
      caseType: row[mapping.caseType] ?? "",
      judgeName: row[mapping.judgeName] ?? "",
      courtroom: row[mapping.courtroom] ?? "",
      scheduledTime: row[mapping.scheduledTime] ?? "",
      estimatedDuration: row[mapping.estimatedDuration]
        ? Number.parseInt(row[mapping.estimatedDuration] ?? "0", 10)
        : null,
      status:
        (row[mapping.status] ?? "scheduled").toLowerCase().replace(/\s+/g, "_"),
      date: row[mapping.date] ?? "",
    };

    return scheduleEntrySchema.parse(payload);
  });
}
