import { StarfieldBg } from '@/components/auth/starfield-bg';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <StarfieldBg />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
