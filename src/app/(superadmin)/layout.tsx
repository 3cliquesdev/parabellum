export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen" style={{ background: "#000000", fontFamily: "var(--font-sans)" }}>{children}</div>;
}
