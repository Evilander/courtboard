import { describe, it, expect } from "vitest";

describe("CSV Import & Parsing", () => {
  it("parses standard CSV with headers", async () => {
    const { parseCsv } = await import("@/lib/csv");

    const csv = `Case Number,Title,Type,Judge,Courtroom,Time,Date,Status
2026-CF-001,State v. Smith,Criminal,Hon. Williams,Room 3A,09:00,2026-03-12,scheduled
2026-CV-002,Doe v. Roe,Civil,Hon. Anderson,Room 2,10:30,2026-03-12,scheduled`;

    const result = parseCsv(csv);
    expect(result.headers).toEqual([
      "Case Number",
      "Title",
      "Type",
      "Judge",
      "Courtroom",
      "Time",
      "Date",
      "Status",
    ]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]["Case Number"]).toBe("2026-CF-001");
    expect(result.rows[1]["Title"]).toBe("Doe v. Roe");
  });

  it("handles quoted fields with commas and newlines", async () => {
    const { parseCsv } = await import("@/lib/csv");

    const csv = `Name,Description
"Smith, John","Case involves ""complex"" issues"
"Doe, Jane","Simple matter"`;

    const result = parseCsv(csv);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]["Name"]).toBe("Smith, John");
    expect(result.rows[0]["Description"]).toBe(
      'Case involves "complex" issues',
    );
  });

  it("infers column mapping from common header names", async () => {
    const { inferScheduleMapping } = await import("@/lib/csv");

    const headers = [
      "Case Number",
      "Defendant",
      "Type",
      "Judge",
      "Room",
      "Start Time",
      "Scheduled Date",
      "Status",
    ];

    const mapping = inferScheduleMapping(headers);
    expect(mapping.caseNumber).toBe("Case Number");
    expect(mapping.caseTitle).toBe("Defendant");
    expect(mapping.judgeName).toBe("Judge");
    expect(mapping.courtroom).toBe("Room");
    expect(mapping.scheduledTime).toBe("Start Time");
    expect(mapping.date).toBe("Scheduled Date");
  });

  it("maps CSV rows to schedule entries with validation", async () => {
    const { parseCsv, inferScheduleMapping, mapCsvRowsToSchedules } =
      await import("@/lib/csv");

    const csv = `Case,Defendant,Type,Judge,Room,Time,Date,Status
2026-CF-100,State v. Test,Criminal,Hon. Test,Courtroom 1,09:00,2026-03-12,scheduled`;

    const { headers, rows } = parseCsv(csv);
    const mapping = inferScheduleMapping(headers);
    const entries = mapCsvRowsToSchedules(rows, mapping);

    expect(entries.length).toBe(1);
    expect(entries[0].caseNumber).toBe("2026-CF-100");
    expect(entries[0].date).toBe("2026-03-12");
    expect(entries[0].status).toBe("scheduled");
  });

  it("handles empty CSV gracefully", async () => {
    const { parseCsv } = await import("@/lib/csv");

    const csv = "";
    const result = parseCsv(csv);
    expect(result.headers).toEqual([]);
    expect(result.rows.length).toBe(0);
  });
});
