import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

export interface SessionPayload {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionPayload;
  }
}

const DEV_USER: SessionPayload = {
  googleId: "dev",
  email: "dev@localhost",
  name: "Dev User",
  picture: "",
};

export function isBypassMode(): boolean {
  return process.env.DEV_BYPASS_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (isBypassMode()) {
    request.user = DEV_USER;
    return;
  }

  const token = request.cookies?.session;
  if (!token) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as SessionPayload;
    if (payload.googleId.trim() !== process.env.AUTHORIZED_GOOGLE_USER_ID?.trim()) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    request.user = payload;
  } catch {
    return reply.code(401).send({ error: "Invalid session" });
  }
}
