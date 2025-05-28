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
  const from = process.env.EMAIL_FROM || 'noreply@slynk.studio';
  
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
    // Use NextAuth's default email template with our custom styling
    sendVerificationRequest: async ({ identifier, url, provider, theme }) => {
      console.log(`🔄 Sending verification email to: ${identifier}`);
      console.log(`📧 Magic link URL: ${url}`);
      
      // Use NextAuth's built-in Nodemailer transport to ensure tokens work correctly
      const { createTransport } = await import('nodemailer');
      const transport = createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
      
      const html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">✨ Slynk</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Sign in to your account</p>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Ready to continue?</h2>
              <p style="color: #666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Click the button below to sign in to your Slynk account. This link will expire in 24 hours for your security.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);">
                  🚀 Sign in to Slynk
                </a>
              </div>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Security note:</strong> If you didn't request this sign-in link, you can safely ignore this email. 
                  The link will expire automatically.
                </p>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  Need help? Contact us at <a href="mailto:support@slynk.studio" style="color: #ff6b6b; text-decoration: none;">support@slynk.studio</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const text = `Sign in to Slynk\n\nClick this link to sign in to your account:\n${url}\n\nThis link will expire in 24 hours for your security.\n\nIf you didn't request this sign-in link, you can safely ignore this email.`;
      
      try {
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: 'Sign in to Slynk AI',
          text,
          html,
        });
        console.log(`✅ Verification email sent successfully to: ${identifier}`);
      } catch (error) {
        console.error(`❌ Failed to send verification email to ${identifier}:`, error);
        throw error;
      }
    },
  });
};

// Helper to validate callback URLs
const isValidCallbackUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Safe internal callback URLs
  if (url.startsWith('/')) return true;
  
  // Check if URL matches our domain or localhost
  try {
    const callbackUrlObj = new URL(url);
    
    // Allow any localhost URL regardless of port (for development)
    if (callbackUrlObj.hostname === 'localhost') {
      return true;
    }
    
    // Allow production domain
    if (callbackUrlObj.hostname === 'slynk.studio') {
      return true;
    }
    
    // Check if URL matches our configured domain
    const baseUrl = getBaseUrl();
    const baseUrlObj = new URL(baseUrl);
    
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
    strategy: "database",
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
          allowDangerousEmailAccountLinking: true, // Allow linking multiple Google accounts
        }),
        configureEmailProvider(),
      ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Always allow sign in - let the adapter handle user creation/linking
      return true;
    },
    async session({ session, user }) {
      // For database strategy, user comes from database
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log(`Redirect callback - url: ${url}, baseUrl: ${baseUrl}`);
      
      // Handle production vs development URL normalization
      if (process.env.NODE_ENV === 'production') {
        // In production, ensure we use HTTPS and the correct domain
        if (url.startsWith('http://') && baseUrl.includes('slynk.studio')) {
          url = url.replace('http://', 'https://');
          console.log(`Fixed protocol for production, new url: ${url}`);
        }
      } else {
        // Handle the port mismatch issue in development
        if (url.includes('localhost:3000') && baseUrl.includes('localhost:3003')) {
          url = url.replace('localhost:3000', 'localhost:3003');
          console.log(`Fixed port mismatch, new url: ${url}`);
        }
      }
      
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