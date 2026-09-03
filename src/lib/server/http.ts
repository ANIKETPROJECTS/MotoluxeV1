import "@tanstack/react-start/server-only";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function readJson(request: Request) {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
