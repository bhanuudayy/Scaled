import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log("Backend URL:", process.env.NEXT_PUBLIC_BACKEND_URL);

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BACKEND_URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${BACKEND_URL}/compare`, {
      method: "POST",
      body: formData,
      cache: "no-store"
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON response:", text);
      throw new Error("Backend returned invalid response");
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload?.detail || payload?.error || "Compare request failed."
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
            : "Unable to reach the comparison backend."
      },
      { status: 500 }
    );
  }
}
