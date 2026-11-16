import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginArt } from "@/components/login-art";
import { LoginForm } from "@/components/login-form";
import { hasGoogle } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-6xl md:px-6 md:pt-10">
      <div className="grid overflow-hidden bg-background md:grid-cols-[1.05fr_1fr] md:rounded-3xl md:border">
        <LoginArt />
        <div className="flex flex-col justify-center px-4 py-6 md:px-14 md:py-12">
          <Suspense>
            <LoginForm google={hasGoogle} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
