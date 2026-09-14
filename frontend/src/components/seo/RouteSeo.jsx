import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const siteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || "https://monoprep.vercel.app").replace(/\/$/, "");
const launchMode = import.meta.env.VITE_LAUNCH_MODE === "true";
const defaultDescription = "Prepare for the Digital SAT with personalized practice, realistic tests, performance analytics, and a study experience designed to help you improve efficiently.";

function metadataFor(pathname) {
  if (pathname === "/") {
    return {
      title: launchMode ? "MonoPrep — Digital SAT Preparation Launch" : "MonoPrep — Smarter Digital SAT Preparation",
      description: defaultDescription,
      index: true,
    };
  }
  if (pathname === "/products") {
    return {
      title: "MonoPrep Products — SAT Practice and Preparation",
      description: "Choose a MonoPrep preparation workspace for realistic practice, focused learning, and clear performance analytics.",
      index: true,
    };
  }
  if (pathname.startsWith("/legal/")) {
    return {
      title: "MonoPrep Policies and Terms",
      description: "Read MonoPrep's terms of use, privacy practices, academic integrity rules, and platform policies.",
      index: true,
    };
  }
  return {
    title: "MonoPrep",
    description: "Secure MonoPrep account workspace.",
    index: false,
  };
}

export default function RouteSeo() {
  const { pathname } = useLocation();
  const metadata = metadataFor(pathname);
  const canonicalPath = metadata.index ? pathname : "/";
  const canonical = `${siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`;
  const robots = metadata.index ? "index, follow" : "noindex, nofollow";
  const structuredData = pathname === "/" ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "MonoPrep",
        url: siteUrl,
        logo: `${siteUrl}/monoprep-logo.png`,
        email: "monoprepsupport@gmail.com",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "MonoPrep",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "EducationalApplication",
        name: "MonoPrep",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: defaultDescription,
        provider: { "@id": `${siteUrl}/#organization` },
      },
    ],
  } : null;

  return (
    <Helmet>
      <html lang="en" />
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="MonoPrep" />
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={`${siteUrl}/monoprep-logo.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metadata.title} />
      <meta name="twitter:description" content={metadata.description} />
      <meta name="twitter:image" content={`${siteUrl}/monoprep-logo.png`} />
      {structuredData ? (
        <script type="application/ld+json">{JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>
      ) : null}
    </Helmet>
  );
}

