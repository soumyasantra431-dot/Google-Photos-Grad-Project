type HealthResponse = {
  status: "ok";
  service: string;
  stage: string;
  checkedAt: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      const body: HealthResponse = {
        status: "ok",
        service: "photo-recall-discovery-engine",
        stage: "foundation",
        checkedAt: new Date().toISOString(),
      };

      return jsonResponse(body);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          error: "not_found",
          message: "The requested API route does not exist.",
        },
        404,
      );
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;

