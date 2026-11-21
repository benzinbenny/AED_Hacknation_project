import type { Metadata } from "next";
import { ModeratorDesk } from "@/components/ModeratorDesk";
import { SiteHeader } from "@/components/SiteHeader";
import { demoModeratorTokenForUi } from "@/services/moderator-auth";

export const metadata: Metadata = { title: "Panel moderacji" };

export default function ModerationPage() {
  return <><SiteHeader active="/moderacja" /><main id="main-content" tabIndex={-1} className="inner-page moderation-page">
    <div className="page-intro"><p className="eyebrow">KONTROLA JAKOŚCI · TRYB DEMONSTRACYJNY</p><h1>Panel moderacji</h1><p>Sprawdź pochodzenie i licencję źródła, a następnie podejmij decyzję o każdym rekordzie. Decyzje są zapisywane w historii.</p></div>
    <aside className="warning-box"><strong>Demonstracja nie ma pełnego systemu tożsamości.</strong><span>Token w tym prototypie chroni endpointy, ale nie zastępuje produkcyjnego logowania i uprawnień. Przed wdrożeniem należy podłączyć zatwierdzone uwierzytelnianie.</span></aside>
    <ModeratorDesk demoToken={demoModeratorTokenForUi()} />
  </main><footer className="site-footer"><span>Panel dostępny tylko dla uprawnionych moderatorów</span><span><a href="/">Powrót do katalogu</a></span></footer></>;
}
