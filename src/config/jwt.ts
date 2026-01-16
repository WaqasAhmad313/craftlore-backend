import { env } from "./env.ts";

export const jwtConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES,
};
