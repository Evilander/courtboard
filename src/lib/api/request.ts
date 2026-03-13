import { badRequest } from "@/lib/api/response";

export async function readJsonBody(request: Request) {
  try {
    return {
      data: (await request.json()) as unknown,
      response: null,
    };
  } catch {
    return {
      data: null,
      response: badRequest("Invalid JSON body."),
    };
  }
}
