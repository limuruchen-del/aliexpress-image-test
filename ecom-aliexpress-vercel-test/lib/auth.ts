import { cookies } from "next/headers";

const COOKIE_NAME = "aitool_auth";

export function isPasswordValid(password: string) {
  const expected = process.env.APP_PASSWORD || "change-me";
  return password === expected;
}

export async function setAuthCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function isAuthed() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}
