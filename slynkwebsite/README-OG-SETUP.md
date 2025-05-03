# Social Media Preview Setup for Slynk

This document explains how the social media preview (Open Graph and Twitter Cards) is set up for Slynk.

## Overview

When you share a link to Slynk on social media platforms like Twitter, Facebook, LinkedIn, etc., a preview card is shown with an image, title, and description. This is controlled by meta tags in the HTML.

## Configuration

The Open Graph and Twitter Card metadata is configured in two ways:

1. **Global Default Configuration**: In `app/layout.tsx`, which applies to all pages
2. **Page-Specific Configuration**: Using the `generateMetadata` function for individual pages

## Open Graph Image

The Open Graph image is stored at `/public/og/social-preview.png`. This image is used when links to Slynk are shared on social media.

### Generating the Open Graph Image

We've included a script to generate the Open Graph image from an HTML template:

1. Install the dependencies:
   ```bash
   pnpm install
   ```

2. Run the script:
   ```bash
   pnpm generate-og
   ```

This will generate the image at `public/og/social-preview.png`.

## Customizing for Specific Pages

For pages that need custom social previews, use the `generateMetadata` function:

```tsx
import { generateMetadata } from '@/components/meta';

// Export the metadata for this page
export const metadata = generateMetadata({
  title: "Custom Page Title | Slynk", 
  description: "A custom description for this specific page",
  image: "/og/custom-page-preview.png" // Optional custom image
});

export default function CustomPage() {
  return (
    // Page content
    <div>Your page content here</div>
  );
}
```

## Testing Social Previews

You can test how your links will appear when shared on social media using these tools:

- **Facebook**: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **Twitter**: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- **LinkedIn**: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Troubleshooting

If your social preview isn't showing correctly:

1. Make sure the site is deployed and accessible
2. Use the debugging tools above to check for errors
3. Social platforms cache previews, so use the "Scrape Again" feature in the debugging tools
4. Check that the image dimensions are correct (1200×630px for optimal display)

## Best Practices

- Keep titles under 60 characters
- Keep descriptions under 160 characters
- Use high-quality images with the correct aspect ratio (2:1)
- Include your brand name in the title
- Ensure image and text are legible at small sizes 