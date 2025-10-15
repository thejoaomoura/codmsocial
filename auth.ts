// ./auth.ts
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import { makeAppleClientSecret } from "@/lib/apple-secret";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,        // Services ID
      clientSecret: process.env.APPLE_CLIENT_SECRET || 'dev-secret',   // JWT será configurado via env
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Salva informações do Apple na primeira autorização
      if (account && account.provider === "apple") {
        token.appleId = account.providerAccountId;
        if (profile?.name && typeof profile.name === 'object') {
          const name = profile.name as { firstName?: string; lastName?: string };
          token.name = `${name.firstName || ''} ${name.lastName || ''}`.trim();
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Passa informações do token para a sessão
      if (token.appleId && session.user) {
        (session.user as any).appleId = token.appleId;
      }
      return session;
    },
  },
});