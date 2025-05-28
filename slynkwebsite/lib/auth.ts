import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { setupSendgrid, sendEmail, formatVerificationEmail } from "./email";

// Define types for session and JWT
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SessionProps {
  session: { user: SessionUser };
  token: {
    id: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
}

interface JWTProps {
  token: {
    id?: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Extend NextAuth Session with our custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

// Check if we should use mock mode
const useMockApi = process.env.USE_MOCK_API === "true";

// Function to get the adapter
const getAdapter = () => {
  if (useMockApi) {
    console.log("Using mock mode - no database adapter");
    return undefined;
  }
  
  try {
    console.log("Initializing Prisma adapter...");
    const adapter = PrismaAdapter(prisma) as Adapter;
    console.log("Prisma adapter initialized successfully");
    return adapter;
  } catch (error) {
    console.error("Failed to create Prisma adapter:", error);
    console.error("This will cause authentication to fail. Check your database connection.");
    throw error; // Don't silently fail - this should be caught early
  }
};

// Get the base URL for the application
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  throw new Error('NEXTAUTH_URL environment variable is not set. This is required for production.');
};

// Configure email provider
const configureEmailProvider = () => {
  // Force production mode to send actual emails
  const isDevelopment = false; // Ignore NODE_ENV to always use production email sending
  
  // In development, use a custom provider that logs to console
  if (isDevelopment) {
    return EmailProvider({
      server: { host: 'localhost', port: 1025, secure: false },
      from: 'noreply@example.com',
      // Custom function to send emails (just log to console in development)
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log('------------------------------------------------------------');
        console.log(`🔑 Sign in link for ${identifier}:`);
        console.log(`✉️ ${url}`);
        console.log('------------------------------------------------------------');
        console.log('This link would be emailed in production, but in development you can click it directly.');
      }
    });
  }
  
  // In production, use SendGrid for email delivery
  const from = process.env.EMAIL_FROM || 'noreply@slynkapp.com';
  
  return EmailProvider({
    server: {
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    },
    from,
    sendVerificationRequest: async ({ identifier, url, provider }) => {
      // Set up SendGrid
      setupSendgrid();
      
      // Format the email
      const { text, html } = formatVerificationEmail(identifier, url);
      
      // Send the email
      const result = await sendEmail({
        to: identifier,
        subject: 'Sign in to Slynk AI',
        text,
        html,
      });
      
      if (!result.success) {
        console.error('Failed to send verification email:', result.error);
      }
    },
  });
};

// Helper to validate callback URLs
const isValidCallbackUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Safe internal callback URLs
  if (url.startsWith('/')) return true;
  
  // Check if URL matches our domain
  try {
    const baseUrl = getBaseUrl();
    const baseUrlObj = new URL(baseUrl);
    const callbackUrlObj = new URL(url);
    
    // Only allow callbacks to our domain
    return callbackUrlObj.hostname === baseUrlObj.hostname;
  } catch (error) {
    console.error('Invalid callback URL:', url);
    return false;
  }
};

export const authOptions: NextAuthOptions = {
  adapter: getAdapter(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
    verifyRequest: "/check-email",
  },
  providers: useMockApi 
    ? [
        // In mock mode, use a simple credentials provider for testing
        CredentialsProvider({
          name: 'Mock Credentials',
          credentials: {
            email: { label: "Email", type: "email" },
          },
          async authorize(credentials) {
            // Return a mock user for testing
            if (credentials?.email) {
              return {
                id: "mock-user-id",
                name: "Test User",
                email: credentials.email,
                image: "https://i.pravatar.cc/150?u=test@example.com",
              };
            }
            return null;
          }
        }),
      ]
    : [
        // In production mode, use real providers
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        configureEmailProvider(),
      ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        if (!session.user) {
          session.user = {
            id: "temp-user-id",
            name: null,
            email: null,
            image: null,
          };
        }
        
        // Ensure we always have a valid user ID
        session.user.id = (token.id as string) || `temp-${Date.now()}`;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
      }

      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // If we have a user from sign-in (first time)
        token.id = user.id;
        return token;
      }

      // In mock mode, just return the token
      if (useMockApi) {
        token.id = token.id || "mock-user-id";
        return token;
      }

      // If we already have an ID in the token, keep it
      if (token.id) {
        return token;
      }

      // Look up or create the user in the database
      if (token.email) {
        try {
          let dbUser = await prisma.user.findFirst({
            where: { email: token.email },
          });

          // If user doesn't exist, create them
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: token.email,
                name: token.name,
                image: token.picture,
              },
            });
          }

          token.id = dbUser.id;
        } catch (error) {
          console.error("Database lookup/creation error:", error);
          // Generate a fallback ID to prevent auth failure
          token.id = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log(`Redirect callback - url: ${url}, baseUrl: ${baseUrl}`);
      
      // Validate and allow only internal redirects or those to trusted domains
      if (isValidCallbackUrl(url)) {
        console.log(`Valid callback URL, redirecting to: ${url}`);
        return url;
      }
      
      // Default fallback to dashboard
      const fallbackUrl = `${baseUrl}/dashboard`;
      console.log(`Invalid callback URL, falling back to: ${fallbackUrl}`);
      return fallbackUrl;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}; 