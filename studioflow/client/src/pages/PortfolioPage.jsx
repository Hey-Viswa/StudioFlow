import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../lib/api';
import { ExternalLink, Globe, Twitter, Linkedin, Instagram, Dribbble, Palette } from 'lucide-react';

const PortfolioPage = () => {
    const { username } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const res = await api.get(`/showcase/p/${username}`);
                setData(res);
            } catch (err) {
                console.error(err);
                setError('Profile not found or not public.');
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground">
                <h1 className="text-2xl font-bold mb-2">404</h1>
                <p>{error || 'Portfolio not found'}</p>
            </div>
        );
    }

    const { profile, items } = data;

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Helmet>
                <title>{`${profile.displayName} | StudioFlow Portfolio`}</title>
                <meta name="description" content={profile.bio || `Check out ${profile.displayName}'s portfolio on StudioFlow.`} />
                {profile.avatarUrl && <meta property="og:image" content={profile.avatarUrl} />}
            </Helmet>

            {/* Header / Profile Section */}
            <header className="container mx-auto px-4 py-16 max-w-4xl text-center">
                <div className="mb-6 relative inline-block">
                    {profile.avatarUrl ? (
                         <img 
                            src={profile.avatarUrl} 
                            alt={profile.displayName} 
                            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg mx-auto"
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mx-auto text-4xl border-4 border-background shadow-lg">
                            {profile.displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                
                <h1 className="text-4xl font-bold tracking-tight mb-2">{profile.displayName}</h1>
                {profile.bio && <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">{profile.bio}</p>}

                {/* Social Links */}
                {profile.socialLinks && (
                    <div className="flex items-center justify-center gap-4 text-muted-foreground">
                        {profile.socialLinks.website && (
                            <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Globe className="w-5 h-5" />
                            </a>
                        )}
                         {profile.socialLinks.twitter && (
                            <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                        )}
                         {profile.socialLinks.linkedin && (
                            <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Linkedin className="w-5 h-5" />
                            </a>
                        )}
                         {profile.socialLinks.instagram && (
                            <a href={profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                )}
            </header>

            {/* Gallery Grid */}
            <main className="container mx-auto px-4 pb-20">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8 flex items-center gap-2 after:content-[''] after:h-px after:flex-1 after:bg-border">
                    <Palette className="w-4 h-4" /> Selected Works
                </h2>

                {items.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No published works yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map((item) => (
                            <a 
                                key={item.slug} 
                                href={`/showcase/${item.slug}`} 
                                className="group block"
                            >
                                <div className="aspect-video bg-muted rounded-xl overflow-hidden mb-4 relative shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
                                    <img 
                                        src={item.thumbnailUrl || item.previewUrl} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{item.title}</h3>
                                {item.tags && item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {item.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </a>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t py-12 text-center text-muted-foreground text-sm">
                <p>Created with <a href="/" className="font-semibold text-foreground hover:underline">StudioFlow</a></p>
            </footer>
        </div>
    );
};

export default PortfolioPage;
