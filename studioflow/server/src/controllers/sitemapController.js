import User from '../models/User.js';
import ShowcaseItem from '../models/ShowcaseItem.js';

export const generateSitemap = async (req, res) => {
    try {
        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'; // Fallback for dev

        // 1. Static Pages
        const staticPages = [
            '',
            '/login',
            '/signup',
            '/features',
            '/pricing'
        ];

        // 2. Fetch Public Profiles
        const users = await User.find({ 
            'publicProfile.isEnabled': true,
            'publicProfile.username': { $exists: true, $ne: '' }
        }).select('publicProfile.username updatedAt');

        // 3. Fetch Published Showcase Items
        const items = await ShowcaseItem.find({ 
            isPublished: true 
        }).select('slug updatedAt');

        // 4. Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Add Static Pages
        staticPages.forEach(page => {
            xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

        // Add Profiles
        users.forEach(user => {
            xml += `
  <url>
    <loc>${baseUrl}/p/${user.publicProfile.username}</loc>
    <lastmod>${new Date(user.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        });

        // Add Showcase Items
        items.forEach(item => {
            xml += `
  <url>
    <loc>${baseUrl}/showcase/${item.slug}</loc>
    <lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        xml += `
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
};
