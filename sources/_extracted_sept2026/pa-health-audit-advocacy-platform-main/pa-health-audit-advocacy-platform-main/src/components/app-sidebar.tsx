import React from "react";
import { Home, Calculator, Map, ShieldAlert, FileText, Search, BookOpen, FileCode } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { RATING_AREAS } from "@/data/ratingAreas";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const menuItems = [
    { title: "Command Center", icon: Home, path: "/" },
    { title: "Market Guide", icon: BookOpen, path: "/guide" },
  ];
  const ratingAreaLinks = RATING_AREAS
    .map((area) => ({
      title: area.name.replace(/^Rating Area\s\d+\s\(/, '').replace(/\)$/, ''),
      id: area.id,
      path: `/area/${area.id}`
    }));
  const tools = [
    { title: "EOB Auditor", icon: ShieldAlert, path: "/tools/audit" },
    { title: "Subsidy Calculator", icon: Calculator, path: "/tools/subsidy" },
    { title: "Appeal Generator", icon: FileText, path: "/tools/appeal" },
    { title: "Report Parser", icon: FileCode, path: "/tools/parser" },
  ];
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none uppercase tracking-wider">PA Health Audit</span>
            <span className="text-[10px] text-muted-foreground font-medium">Forensic Market Intel</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                  <Link to={item.path}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>PA Rating Areas</SidebarGroupLabel>
          <SidebarMenu>
            {ratingAreaLinks.map((area) => (
              <SidebarMenuItem key={area.path}>
                <SidebarMenuButton asChild isActive={location.pathname === area.path}>
                  <Link to={area.path}>
                    <Map className="size-4" />
                    <span className="truncate">Area {area.id}: {area.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Forensic Tools</SidebarGroupLabel>
          <SidebarMenu>
            {tools.map((tool) => (
              <SidebarMenuItem key={tool.path}>
                <SidebarMenuButton asChild isActive={location.pathname === tool.path}>
                  <Link to={tool.path}>
                    <tool.icon className="size-4" />
                    <span>{tool.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 bg-muted/50 rounded-lg mx-2 mb-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status: 2026 Intel</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium">Live Market Data</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}