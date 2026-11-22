import type { Metadata } from "next";
import { ModeratorDesk } from "@/components/moderation/ModeratorDesk";
import "@/components/moderation/moderation.css";
import { SiteHeader } from "@/components/SiteHeader";
import { demoModeratorTokenForUi } from "@/services/moderator-auth";

export const metadata: Metadata = { title: "Panel administratora" };

export default function ModerationPage() {
  return <><SiteHeader active="/moderacja" /><main id="main-content" tabIndex={-1} className="inner-page moderation-page">
    <div className="page-intro"><h1>Panel administratora</h1><p>Zarządzaj źródłami, porównuj wpisy z publikacjami dysponentów i rozpatruj nowe zgłoszenia AED.</p></div>
    <ModeratorDesk demoToken={demoModeratorTokenForUi()} />
  </main><footer className="site-footer"><span>Panel dostępny tylko dla administratora</span><span><a href="/">Powrót do katalogu</a></span></footer></>;
}
