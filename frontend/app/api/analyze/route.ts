import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/analyze`, {
      method: "POST",
      body: formData,
      cache: "no-store"
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson
      ? await response.json()
      : { error: "Unexpected backend response.", detail: await response.text() };

    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload?.detail || payload?.error || "Analysis request failed."
        },
        { status: response.status }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reach the analysis backend."
      },
      { status: 500 }
    );
  }
}
