import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      return session
    },
    async signIn({ user }: any) {
        // Restrict to specific email if needed, or allow all and filter later
        // For now, let's just allow login and check email in the page
        return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
