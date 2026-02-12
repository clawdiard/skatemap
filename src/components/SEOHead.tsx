import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  path?: string;
}

const BASE_URL = 'https://clawdiard.github.io/skatemap';

export function SEOHead({
  title = 'ParkCheck — NYC Skatepark Conditions',
  description = 'Real-time conditions for every NYC skatepark. Never waste a trip.',
  ogTitle,
  ogDescription,
  ogImage = `${BASE_URL}/icons/icon-512.png`,
  path = '/',
}: SEOHeadProps) {
  const fullTitle = title.includes('ParkCheck') ? title : `${title} | ParkCheck NYC`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
