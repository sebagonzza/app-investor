"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  TrendingUp,
  ListOrdered,
  ArrowLeftRight,
  PieChart,
  FileText,
  Settings,
  LineChart,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/carteras", label: "Carteras", icon: Briefcase },
  { href: "/inversiones", label: "Inversiones", icon: TrendingUp },
  { href: "/operaciones", label: "Operaciones", icon: ListOrdered },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/rendimientos", label: "Rendimientos", icon: PieChart },
  { href: "/reportes", label: "Reportes", icon: FileText },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-gray-200 bg-white h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <LineChart className="text-white" size={18} />
        </div>
        <span className="font-semibold text-sm">Gestor de Inversiones</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
