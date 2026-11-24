import React from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  Activity,
  Scale,
  FileJson,
  Lock,
  ChevronRight,
  UserCheck,
  Zap,
  MapPin
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";
import { COUNTY_DATA } from "@/lib/forensic-core";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const isExpertMode = useAppState(s => s.isExpertMode);
  const toggleExpertMode = useAppState(s => s.toggleExpertMode);
  const activeCounty = useAppState(s => s.activeCounty);
  const setActiveCounty = useAppState(s => s.setActiveCounty);
  const navItems = [
    { title: isExpertMode ? "Command Dashboard" : "My Health Overview", icon: LayoutDashboard, path: "/" },
    { title: isExpertMode ? "Forensic Audit" : "Bill Checker", icon: ShieldAlert, path: "/audit" },
    { title: isExpertMode ? "Market Intelligence" : "Local Prices", icon: Activity, path: "/market" },
    { title: isExpertMode ? "Rights Wiki" : "My Rights", icon: Scale, path: "/wiki" },
  ];
  return (
    <Sidebar className="border-r border-slate-800 bg-slate-950 text-slate-200">
      <SidebarHeader className="p-4 space-y-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-glow">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white uppercase">Keystone</span>
            <span className="text-[10px] uppercase tracking-widest text-sky-400 font-mono">Forensic</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-2 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex flex-col">
            <Label htmlFor="mode-toggle" className="text-[10px] font-bold text-slate-500 uppercase">Expert Mode</Label>
            <span className="text-[9px] text-sky-500 font-mono">{isExpertMode ? "ADVANCED" : "SIMPLE"}</span>
          </div>
          <Switch 
            id="mode-toggle" 
            checked={isExpertMode} 
            onCheckedChange={toggleExpertMode}
            className="data-[state=checked]:bg-sky-500"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Operational
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  className={cn(
                    "group transition-all duration-200",
                    location.pathname === item.path
                      ? "bg-sky-500/10 text-sky-400"
                      : "hover:bg-slate-900 text-slate-400 hover:text-slate-100"
                  )}
                >
                  <Link to={item.path} className="flex items-center w-full">
                    <item.icon className={cn(
                      "size-5 transition-colors",
                      location.pathname === item.path ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    <span className="ml-3 font-medium">{item.title}</span>
                    {location.pathname === item.path && (
                      <ChevronRight className="ml-auto size-4 animate-in slide-in-from-left-2" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator className="bg-slate-800" />
        <div className="px-4 py-4 space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">My Region</Label>
          <Select value={activeCounty} onValueChange={setActiveCounty}>
            <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-xs text-slate-300">
              <MapPin className="size-3 mr-2 text-sky-500" />
              <SelectValue placeholder="Select County" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              {Object.keys(COUNTY_DATA).map(county => (
                <SelectItem key={county} value={county}>{county} County</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-4 bg-slate-900/50">
        <div className="rounded-lg border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-mono">System Integrity</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 w-[98%]" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">98%</span>
          </div>
          <p className="text-[9px] text-slate-500 italic leading-tight">
            LMP-256 Protocol Verified
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}