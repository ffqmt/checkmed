import { NextRequest, NextResponse } from "next/server";
import { localStorageAdapter } from "@/server/services/storage.service";

/** Receives a raw file body for the local storage fallback using a signed, expiring token. Not used when Supabase Storage is configured — there the browser uploads straight to Supabase. */
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const filePath = searchParams.get("path");
  const expires = searchParams.get("expires");
  const token = searchParams.get("token");

  if (!bucket || !filePath || !expires || !token) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!localStorageAdapter.verifyUploadToken(bucket, filePath, expires, token)) {
    return NextResponse.json({ error: "expired_or_invalid_token" }, { status: 403 });
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  await localStorageAdapter.upload(bucket, filePath, buffer, request.headers.get("content-type") ?? "application/octet-stream");
  return NextResponse.json({ success: true });
}
