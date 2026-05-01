import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // #region agent log
        fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_env_or_db',location:'src/lib/authOptions.ts:authorize:entry',message:'authorize entry',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV},timestamp:Date.now()})}).catch(()=>{});
        // also emit to server logs (Vercel)
        console.error("[AUTHDBG] authorize entry", { hasDatabaseUrl: !!process.env.DATABASE_URL, hasNextAuthUrl: !!process.env.NEXTAUTH_URL, hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV });
        // #endregion agent log

        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({ where: { email } });

          // #region agent log
          fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_user_not_found',location:'src/lib/authOptions.ts:authorize:userLookup',message:'user lookup complete',data:{emailHasAt:email.includes('@'),emailLen:email.length,userFound:!!user},timestamp:Date.now()})}).catch(()=>{});
          console.error("[AUTHDBG] user lookup", { emailHasAt: email.includes("@"), emailLen: email.length, userFound: !!user });
          // #endregion agent log

          if (!user) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);

          // #region agent log
          fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_password_mismatch',location:'src/lib/authOptions.ts:authorize:compare',message:'bcrypt compare result',data:{passwordOk:ok},timestamp:Date.now()})}).catch(()=>{});
          console.error("[AUTHDBG] bcrypt compare", { passwordOk: ok });
          // #endregion agent log

          if (!ok) return null;

          return { id: user.id, email: user.email, role: user.role } as any;
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7282/ingest/da2ec3ea-4c3c-4418-91fd-68c85b934dbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'351efa'},body:JSON.stringify({sessionId:'351efa',runId:'pre-fix',hypothesisId:'H_env_or_db',location:'src/lib/authOptions.ts:authorize:catch',message:'authorize threw',data:{name:err instanceof Error?err.name:typeof err,message:err instanceof Error?String(err.message).slice(0,200):String(err).slice(0,200)},timestamp:Date.now()})}).catch(()=>{});
          console.error("[AUTHDBG] authorize threw", { name: err instanceof Error ? err.name : typeof err, message: err instanceof Error ? err.message : String(err) });
          // #endregion agent log
          throw err;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = (token as any).id;
      (session.user as any).role = (token as any).role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

