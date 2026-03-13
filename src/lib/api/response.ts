import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      issues: error.flatten(),
    },
    { status: 400 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
