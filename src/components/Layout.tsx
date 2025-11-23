import { IconSidebar } from "@/components/IconSidebar";
import { ContextualMenu } from "@/components/ContextualMenu";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Coluna 1: Icon Sidebar - 80px */}
      <IconSidebar />

      {/* Coluna 2: Contextual Menu - 256px */}
      <ContextualMenu />

      {/* Coluna 3: Main Content - Flex Grow */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
