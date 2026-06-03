import { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { requireAuth, SessionPayload } from "../middleware/auth";

export async function authRoutes(fastify: FastifyInstance) {
  const oauthClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Redirect to Google OAuth
  fastify.get("/auth/google", async (_request, reply) => {
    const url = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    return reply.redirect(url);
  });

  // OAuth callback
  fastify.get<{ Querystring: { code?: string; error?: string } }>(
    "/auth/callback",
    async (request, reply) => {
      const { code, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }

      try {
        const { tokens } = await oauthClient.getToken(code);
        oauthClient.setCredentials(tokens);

        const ticket = await oauthClient.verifyIdToken({
          idToken: tokens.id_token!,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload()!;
        const googleId = payload.sub;

        const authorizedId = process.env.AUTHORIZED_GOOGLE_USER_ID?.trim();
        if (googleId.trim() !== authorizedId) {
          fastify.log.warn(
            `Rejected login: got googleId="${googleId}" (len ${googleId.length}) ` +
              `vs AUTHORIZED_GOOGLE_USER_ID="${authorizedId}" (len ${authorizedId?.length}) ` +
              `email=${payload.email}`
          );
          return reply.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized`);
        }

        const sessionPayload: SessionPayload = {
          googleId,
          email: payload.email!,
          name: payload.name!,
          picture: payload.picture!,
        };

        const token = jwt.sign(sessionPayload, process.env.JWT_SECRET!, {
          expiresIn: "30d",
        });

        // Host-only cookie: frontend and API are served from the same domain,
        // so no `domain` attribute is needed (and it stays scoped to this host).
        reply.setCookie("session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return reply.redirect(`${process.env.FRONTEND_URL}/`);
      } catch (err) {
        fastify.log.error(err);
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
      }
    }
  );

  // Get current user
  fastify.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    return { user: request.user };
  });

  // Logout
  fastify.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie("session", { path: "/" });
    return { ok: true };
  });
}
