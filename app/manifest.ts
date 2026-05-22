import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RiskCoop Dashboard',
    short_name: 'RiskCoop',
    description: 'Dashboard predictivo para riesgo crediticio cooperativo',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#b3ff3b',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  };
}
