import Link from "next/link";

const links = [
  ["/", "Znajdź AED"],
  ["/dodaj", "Dodaj dane"],
  ["/zrodla", "Źródła danych"],
  ["/standard", "Standard danych"],
  ["/kampania", "Misja AED"],
  ["/moderacja", "Moderacja"],
] as const;

export function SiteHeader({ active = "/" }: { active?: string }) {
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand" href="/">
        <img src="/punkt-zycia.svg" alt="" width="42" height="42" />
        <span><strong>Punkt Życia</strong><small>Otwarte dane o AED</small></span>
      </Link>
      <nav aria-label="Nawigacja główna">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}
      </nav>
    </div>
  </header>;
}
