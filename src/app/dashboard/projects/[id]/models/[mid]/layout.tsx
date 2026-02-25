export default function ModelEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override dashboard layout padding — editor needs full-bleed
  return (
    <div className="-m-6 md:-m-8" style={{ width: 'calc(100% + 3rem)', height: '100vh' }}>
      {children}
    </div>
  );
}
