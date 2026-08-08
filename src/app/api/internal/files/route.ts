import { NextRequest, NextResponse } from "next/server";
import { localStorageAdapter } from "@/server/services/storage.service";

/** Serves files from the local storage fallback using a signed, expiring token. Not used when Supabase Storage is configured. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const filePath = searchParams.get("path");
  const expires = searchParams.get("expires");
  const token = searchParams.get("token");

  if (!bucket || !filePath || !expires || !token) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!localStorageAdapter.verifyToken(bucket, filePath, expires, token)) {
    return NextResponse.json({ error: "expired_or_invalid_token" }, { status: 403 });
  }

  try {
    const buffer = await localStorageAdapter.download(bucket, filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
