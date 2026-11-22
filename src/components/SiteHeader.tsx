import Link from "next/link";

const links = [
  ["/", "Znajdź AED"],
  ["/dodaj", "Dodaj dane"],
  ["/zrodla", "Źródła danych"],
  ["/standard", "Standard danych"],
  ["/kampania", "Misja AED"],
  ["/moderacja", "Administracja"],
] as const;

export function SiteHeader({ active = "/" }: { active?: string }) {
  const navigation = links.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>);
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand" href="/">
        <img src="/punkt-zycia-logo.webp" alt="" width="42" height="42" />
        <span><strong>Punkt Życia</strong><small>Otwarte dane o AED</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Nawigacja główna">{navigation}</nav>
      <details className="mobile-nav"><summary>Menu</summary><nav aria-label="Nawigacja główna">{navigation}</nav></details>
    </div>
  </header>;
}
