export default function ModelEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override dashboard layout for the editor — full-bleed, no padding
  return <>{children}</>;
}
