'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Beaker,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Plus,
  Users,
  UserCog,
  FileText,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { UnitsToggle } from './units-toggle';
import { CreateOrgDialog } from './create-org-dialog';

interface Org {
  id: string;
  name: string;
  slug: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Beaker, label: 'Materials', href: '/dashboard/materials' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrgs(data);
        }
      })
      .catch(() => {});
  }, []);

  const orgNavItems = selectedOrg
    ? [
        { icon: UserCog, label: 'Members', href: `/dashboard/org/${selectedOrg.id}` },
        { icon: Users, label: 'Teams', href: `/dashboard/org/${selectedOrg.id}/teams` },
        { icon: FileText, label: 'Audit Log', href: `/dashboard/org/${selectedOrg.id}/audit-log` },
      ]
    : [];

  const handleOrgCreated = (org: Org) => {
    setOrgs((prev) => [...prev, org]);
    setSelectedOrg(org);
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col h-screen bg-space-surface border-r border-white/10 shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 h-16">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Logo size="sm" />
              </motion.div>
            )}
          </AnimatePresence>
          {collapsed && <Logo size="sm" showText={false} />}
        </div>

        <Separator className="bg-white/10" />

        {/* Org Switcher */}
        {orgs.length > 0 && !collapsed && (
          <div className="px-3 pt-3 pb-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-left">
                <span className="truncate font-medium">
                  {selectedOrg ? selectedOrg.name : 'Personal'}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedOrg(null)}>
                  Personal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {orgs.map((org) => (
                  <DropdownMenuItem key={org.id} onClick={() => setSelectedOrg(org)}>
                    {org.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                  isActive
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-accent-blue')} />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}

          {/* Org nav items */}
          {selectedOrg && !collapsed && (
            <>
              <Separator className="bg-white/10 my-3" />
              <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Organization
              </p>
              {orgNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                      isActive
                        ? 'bg-accent-blue/10 text-accent-blue'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-accent-blue')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Units toggle */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <Separator className="bg-white/10 mb-3" />
            <UnitsToggle />
          </div>
        )}

        {/* User section */}
        <div className="px-3 pb-4">
          <Separator className="bg-white/10 mb-4" />
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-accent-blue to-accent-cyan text-white text-xs">
                TE
              </AvatarFallback>
            </Avatar>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <div className="text-sm font-medium truncate">Thermal Engineer</div>
                  <div className="text-xs text-muted-foreground truncate">engineer@verixos.io</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link
            href="/login"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors mt-1',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 -right-3 z-10 p-1 rounded-full bg-space-surface border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </motion.aside>

      <CreateOrgDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onCreated={handleOrgCreated}
      />
    </>
  );
}
