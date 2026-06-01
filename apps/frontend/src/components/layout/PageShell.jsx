import './PageShell.css'

export default function PageShell({ sidebar, children }) {
  return (
    <div className="page-shell">
      {sidebar}
      <main className="page-shell__main">
        {children}
      </main>
    </div>
  )
}
