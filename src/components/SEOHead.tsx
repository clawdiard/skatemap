import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  path?: string;
}

const BASE_URL = 'https://clawdiard.github.io/skatemap';

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('twitter:')) {
      el.setAttribute('property', property);
    } else {
      el.setAttribute('name', property);
    }
    document.head.appendChild(el);
  }
  el.content = content;
}

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

  useEffect(() => {
    document.title = fullTitle;

    setMeta('description', description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    setMeta('og:type', 'website');
    setMeta('og:title', ogTitle || fullTitle);
    setMeta('og:description', ogDescription || description);
    setMeta('og:image', ogImage);
    setMeta('og:url', url);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', ogTitle || fullTitle);
    setMeta('twitter:description', ogDescription || description);
    setMeta('twitter:image', ogImage);
  }, [fullTitle, description, url, ogTitle, ogDescription, ogImage]);

  return null;
}
