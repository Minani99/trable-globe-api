import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        commit:
          process.env.VERCEL_GIT_COMMIT_SHA ??
          process.env.RENDER_GIT_COMMIT ??
          null,
        environment:
          process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      },
      message: null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
