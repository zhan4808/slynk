"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SimliAgent from "@/components/SimliAgent";

const samplePersona = {
  id: "demo",
  name: "Demo Avatar",
  productName: "Slynk AI",
  systemPrompt: "You are a demo assistant for Slynk. Be engaging and helpful.",
  firstMessage: "Hi! I'm a live demo of Slynk's AI technology. Try talking to me!",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-purple-50">
      <div className="container mx-auto max-w-6xl px-4 pt-24 pb-16">
        <SimliAgent personaId={samplePersona.id} personaData={samplePersona} />
      </div>
    </div>
  );
} 