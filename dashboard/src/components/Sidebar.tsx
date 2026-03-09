"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/compare", label: "Price Compare", icon: "💰" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/upload", label: "Upload Noon Prices", icon: "📤" },
  { href: "/scrape-status", label: "Scrape Status", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-yellow-400">Noon Minutes</h1>
        <p className="text-xs text-gray-400 mt-1">Price Monitor</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-yellow-500/20 text-yellow-400 font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">Riyadh, Saudi Arabia</p>
        <p className="text-xs text-gray-500 mb-3">Daily scrape at 6:00 AM AST</p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
