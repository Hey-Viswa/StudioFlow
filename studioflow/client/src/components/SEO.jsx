import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, name, type, image, url }) => {
    const siteTitle = 'StudioFlow | Creative Project Management Software & Client Portal';
    const defaultDescription = 'Stop chasing client feedback in emails. StudioFlow is the all-in-one project management tool for creative agencies with real-time proofing and invoicing.';
    const defaultImage = 'https://studioflow.studio/studioflowlogo.svg';
    const siteUrl = 'https://studioflow.studio';

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{title ? `${title} | StudioFlow` : siteTitle}</title>
            <meta name="description" content={description || defaultDescription} />
            <link rel="canonical" href={url || siteUrl} />

            {/* Facebook tags */}
            <meta property="og:type" content={type || 'website'} />
            <meta property="og:title" content={title ? `${title} | StudioFlow` : siteTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            <meta property="og:image" content={image || defaultImage} />
            <meta property="og:url" content={url || siteUrl} />

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name || 'StudioFlow'} />
            <meta name="twitter:card" content={type === 'article' ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={title ? `${title} | StudioFlow` : siteTitle} />
            <meta name="twitter:description" content={description || defaultDescription} />
            <meta name="twitter:image" content={image || defaultImage} />
        </Helmet>
    );
};

export default SEO;
