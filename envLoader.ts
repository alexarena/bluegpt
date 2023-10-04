import { load } from "https://deno.land/std@0.202.0/dotenv/mod.ts";

const env = await load();

function getValue(key: string) {
  return (Deno.env.get(key) || env[key]) as string | undefined;
}

function getEnv(key: string) {
  const v = getValue(key);
  if (typeof v === "string") {
    return v;
  }
  throw new Error(`Missing env var ${key}`);
}

export const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
export const APP_URL = getEnv("APP_URL");
export const SENDBLUE_API_KEY = getEnv("SENDBLUE_API_KEY");
export const SENDBLUE_API_SECRET = getEnv("SENDBLUE_API_SECRET");
export const SENDBLUE_SIGNING_SECRET = getEnv("SENDBLUE_SIGNING_SECRET");
export const YOUR_NUMBER = getValue("YOUR_NUMBER");
