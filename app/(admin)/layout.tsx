export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="min-h-screen flex-1">{children}</main>;
}
