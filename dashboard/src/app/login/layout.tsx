export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Login page has no sidebar — full-screen layout
  return <>{children}</>;
}
