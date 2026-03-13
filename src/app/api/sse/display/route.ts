import { getRawScreenBySlug } from "@/lib/data/screens";
import { subscribeDisplayUpdates, type DisplayUpdateEvent } from "@/lib/sse/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shouldDeliverEvent(
  event: DisplayUpdateEvent,
  slug: string,
  zone: string,
) {
  const matchesScreen =
    !event.screenSlugs || event.screenSlugs.length === 0 || event.screenSlugs.includes(slug);
  const matchesZone =
    !event.zones || event.zones.length === 0 || event.zones.includes(zone as never);

  return matchesScreen && matchesZone;
}

function encodeEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("screen")?.trim();

  if (!slug) {
    return new Response("Missing screen parameter.", { status: 400 });
  }

  const screen = getRawScreenBySlug(slug);
  if (!screen) {
    return new Response("Screen not found.", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          encodeEvent("ready", {
            slug: screen.slug,
            zone: screen.zone,
            at: new Date().toISOString(),
          }),
        ),
      );

      let closed = false;

      function safeEnqueue(data: Uint8Array) {
        if (closed) {
          return false;
        }

        try {
          controller.enqueue(data);
          return true;
        } catch {
          closed = true;
          cleanup();
          return false;
        }
      }

      const unsubscribe = subscribeDisplayUpdates((event) => {
        if (!shouldDeliverEvent(event, screen.slug, screen.zone)) {
          return;
        }

        safeEnqueue(
          encoder.encode(
            encodeEvent("update", {
              ...event,
              slug: screen.slug,
            }),
          ),
        );
      });

      const ping = setInterval(() => {
        safeEnqueue(
          encoder.encode(
            encodeEvent("ping", {
              slug: screen.slug,
              at: new Date().toISOString(),
            }),
          ),
        );
      }, 15_000);

      function cleanup() {
        clearInterval(ping);
        unsubscribe();
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
