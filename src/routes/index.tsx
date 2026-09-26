import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { QrStudio } from "@/components/qr-studio";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="min-h-dvh bg-bg text-ink">
      <QrStudio />
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "font-sans border border-line bg-surface text-ink shadow-none",
          },
        }}
      />
    </main>
  );
}
