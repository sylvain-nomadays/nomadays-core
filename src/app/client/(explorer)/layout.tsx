/**
 * Explorer route group layout.
 *
 * The parent layout (client/layout.tsx) already renders <SiteHeader> and
 * wraps children inside .voyageur-main-layout (content + RightSidebar).
 *
 * This layout only hides the sidebar so the Explorer page can use
 * the full width. No extra <SiteHeader> here — the parent provides it.
 */
export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Hide the RightSidebar rendered by the parent layout */}
      <style>{`
        .voyageur-main-layout { grid-template-columns: 1fr !important; }
        .voyageur-main-layout > aside { display: none !important; }
      `}</style>
      {children}
    </>
  )
}
