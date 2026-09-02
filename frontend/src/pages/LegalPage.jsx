import { ArrowLeft, Download, FileText, ShieldCheck } from 'lucide-react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  getLegalDocument
} from '../constants/legalDocuments.js';
import '../styles/pages/legal.css';

export default function LegalPage() {
  const { document: slug } = useParams();
  const document = getLegalDocument(slug);

  return (
    <main className="legal-page">
      <header className="legal-topbar">
        <Link className="legal-brand" to="/">
          <img src="/monoprep-logo.png" alt="" />
          <span>MonoPrep</span>
        </Link>
        <Link className="legal-back" to="/">
          <ArrowLeft aria-hidden="true" /> Home
        </Link>
      </header>

      <section className="legal-heading">
        <div>
          <span className="legal-eyebrow"><ShieldCheck aria-hidden="true" /> Legal Center</span>
          <h1>MonoPrep siyosatlari</h1>
          <p>Platformadan xavfsiz, halol va tushunarli foydalanish uchun yagona hujjatlar markazi.</p>
        </div>
        <a className="legal-download" href="/legal/monoprep-platform-policies.pdf" download>
          <Download aria-hidden="true" /> PDF yuklab olish
        </a>
      </section>

      <div className="legal-layout">
        <nav className="legal-nav" aria-label="Policy documents">
          {LEGAL_DOCUMENTS.map((item) => (
            <NavLink key={item.slug} to={`/legal/${item.slug}`}>
              <FileText aria-hidden="true" />
              <span>{item.shortTitle}</span>
            </NavLink>
          ))}
        </nav>

        <article className="legal-document">
          <header>
            <span>Effective: {LEGAL_EFFECTIVE_DATE}</span>
            <h2>{document.title}</h2>
            <p>{document.summary}</p>
          </header>
          {document.sections.map(([title, paragraphs]) => (
            <section key={title}>
              <h3>{title}</h3>
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <footer>
            <strong>Savol yoki huquqiy so‘rov</strong>
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
            <span>Tashkent, Uzbekistan</span>
          </footer>
        </article>
      </div>
    </main>
  );
}
