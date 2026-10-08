import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import BrandHeader from "@/components/BrandHeader";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-md pb-24">
        <BrandHeader />
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
