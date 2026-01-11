import { useEffect } from 'react';
import { getCanonicalUrl, toAbsoluteUrl } from '@/lib/publicSiteUrl';

interface SocialShareMetaProps {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

export const SocialShareMeta = ({ title, description, image, type = 'website' }: SocialShareMetaProps) => {
  useEffect(() => {
    const previousTitle = document.title;

    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const setCanonical = (href: string) => {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = href;
    };

    const canonicalUrl = getCanonicalUrl();

    // Title
    if (title) {
      document.title = title;
      updateMetaTag('og:title', title);
      updateMetaTag('twitter:title', title);
    }

    // Description
    updateMetaTag('og:description', description);
    updateMetaTag('twitter:description', description);

    // URL
    updateMetaTag('og:url', canonicalUrl);
    setCanonical(canonicalUrl);

    // Type
    updateMetaTag('og:type', type);

    // Images
    const absoluteImage = toAbsoluteUrl(image);
    if (absoluteImage) {
      updateMetaTag('og:image', absoluteImage);
      updateMetaTag('twitter:image', absoluteImage);
    }

    // Twitter card
    updateMetaTag('twitter:card', 'summary_large_image');

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image, type]);

  return null;
};

