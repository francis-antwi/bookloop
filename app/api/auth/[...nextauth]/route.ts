import NextAuth from "next-auth";
import { authOptions } from "@/app/auth/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions }; // ✅ This line is required
