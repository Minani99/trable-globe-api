import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const maptilerApiKey = process.env.MAPTILER_API_KEY?.trim() || null;

  return NextResponse.json(
    {
      success: true,
      data: {
        provider: maptilerApiKey ? "maptiler" : "fallback",
        maptilerApiKey,
      },
      message: null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
