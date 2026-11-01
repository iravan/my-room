import { SceneLoader } from "@/components/room/SceneLoader";
import { CollectionLoader } from "@/components/room/CollectionLoader";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="fixed inset-0 bg-black">
      <SceneLoader />
      <CollectionLoader />
      <Toaster position="top-center" />
    </main>
  );
}
