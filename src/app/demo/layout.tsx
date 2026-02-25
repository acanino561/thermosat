export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo page is standalone — no dashboard sidebar or padding
  return <>{children}</>;
}
