"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SimliAgent from "@/components/SimliAgent";

const demoPersona = {
  name: "Demo Avatar",
  description: "A sample AI persona for live demo.",
  systemPrompt: undefined,
  firstMessage: undefined,
  faceId: "tmp9i8bbq7c",
  voice: "default",
  useCustomVoice: false,
};

export default function LiveDemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/live-demo");
    } else if (status === "authenticated") {
      setLoading(false);
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-pink-500 animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading live demo...</p>
        </div>
      </div>
    );
  }

  // Generate systemPrompt/firstMessage as in chat page
  const systemPrompt = demoPersona.systemPrompt ||
    `You are a virtual spokesperson for ${demoPersona.name}. ${demoPersona.description || ''}. Keep your responses friendly, helpful, and concise.`;
  const firstMessage = demoPersona.firstMessage ||
    `Hello! I'm ${demoPersona.name}. How can I help you today?`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-purple-50">
      <div className="container mx-auto max-w-6xl px-4 pt-24 pb-16">
        <SimliAgent
          personaId="demo"
          personaData={{
            name: demoPersona.name,
            systemPrompt,
            firstMessage,
            faceId: demoPersona.faceId,
            voice: demoPersona.voice,
            useCustomVoice: demoPersona.useCustomVoice,
          }}
        />
      </div>
    </div>
  );
} 