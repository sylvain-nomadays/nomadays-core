export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Public header will go here */}
      <main>{children}</main>
      {/* Public footer will go here */}
    </div>
  )
}
