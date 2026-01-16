import { OAuth2Client } from "google-auth-library";
import { env } from "./env.ts";

export const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
