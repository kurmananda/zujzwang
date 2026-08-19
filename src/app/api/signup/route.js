import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChessComProfile } from "@/lib/chesscom";

export async function POST(request) {
  const { email, password, name, scCode, chessComUsername } = await request.json();

  if (!email || !password || !name || !scCode || !chessComUsername) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const chessComProfile = await getChessComProfile(chessComUsername);
  if (!chessComProfile) {
    return NextResponse.json(
      { error: `No Chess.com account found for "${chessComUsername}".` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingByCode } = await admin
    .from("profiles")
    .select("id")
    .eq("sc_code", scCode)
    .maybeSingle();
  if (existingByCode) {
    return NextResponse.json({ error: "That SC code is already registered." }, { status: 400 });
  }

  const { data: existingByChessCom } = await admin
    .from("profiles")
    .select("id")
    .eq("chess_com_username", chessComProfile.username)
    .maybeSingle();
  if (existingByChessCom) {
    return NextResponse.json({ error: "That Chess.com account is already linked to another user." }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      sc_code: scCode,
      chess_com_username: chessComProfile.username, // canonical casing
      photo_url: chessComProfile.avatar ?? null,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user.id }, { status: 201 });
}
