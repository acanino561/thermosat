import Link from 'next/link';

const adminNavItems = [
  { label: 'License', href: '/dashboard/admin/license' },
  { label: 'Updates', href: '/dashboard/admin/updates' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <nav className="border-b border-white/10 px-6 py-3 flex gap-4">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
