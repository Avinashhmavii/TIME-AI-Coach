"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ClipboardPenLine,
  Mic,
  History,
} from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, tooltip: "Dashboard" },
  { href: "/prepare", label: "Prepare", icon: ClipboardPenLine, tooltip: "Prepare Interview" },
  { href: "/interview", label: "Interview", icon: Mic, tooltip: "Mock Interview" },
  { href: "/summary", label: "Results", icon: History, tooltip: "Interview Results" },
];

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <div className="flex justify-center w-full py-2">
              <Image src="/sidelogo.png" alt="TIME AI Sidebar Logo" width={48} height={48} />
            </div>
            <div className="hidden md:flex">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {links.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href}
                  tooltip={{ children: link.tooltip, side: 'right' }}
                >
                  <Link href={link.href}>
                    <span className="flex items-center gap-2">
                      <link.icon />
                      <span className="group-data-[state=collapsed]:hidden">{link.label}</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="p-4 md:hidden flex justify-end">
            <Button size="icon" variant="outline" onClick={toggleSidebar}>
                <LayoutDashboard/>
            </Button>
        </header>
        {children}
        </SidebarInset>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutInternal>{children}</AppLayoutInternal>
    </SidebarProvider>
  );
}
