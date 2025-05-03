import { Metadata } from 'next';

type OpenGraphType = 'website' | 'article' | 'book' | 'profile' | 'music.song' | 
                   'music.album' | 'music.playlist' | 'music.radio_station' | 
                   'video.movie' | 'video.episode' | 'video.tv_show' | 'video.other';

type MetaProps = {
  title?: string;
  description?: string;
  image?: string;
  type?: OpenGraphType;
  date?: string;
  baseUrl?: string;
};

/**
 * Creates metadata for App Router pages
 * This is for pages that need unique metadata different from the default ones in layout.tsx
 */
export function generateMetadata({
  title = 'Slynk | AI-Powered Interactive Advertisements',
  description = 'Transform static ads into engaging, conversational experiences with AI-powered personas',
  image = '/og/social-preview.png', // Default OG image
  type = 'website' as OpenGraphType,
  date,
  baseUrl = 'https://slynk.ai',
}: MetaProps): Metadata {
  const imageUrl = `${baseUrl}${image}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      ...(date && type === 'article' && { publishedTime: date }),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Example usage in a page file:
 * 
 * // In your page.tsx file
 * import { generateMetadata } from '@/components/meta';
 * 
 * export const metadata = generateMetadata({
 *   title: 'Custom Page Title | Slynk',
 *   description: 'A custom description for this specific page',
 * });
 * 
 * export default function Page() {
 *   return <div>Page content</div>;
 * }
 */ 