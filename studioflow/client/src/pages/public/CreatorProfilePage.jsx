import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import FollowButton from '@/components/marketing/FollowButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CreatorProfilePage = () => {
    const { username } = useParams();
    const { user } = useUser();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [showcaseItems, setShowcaseItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // Fetch Profile
                const profileData = await api.get(`/u/${username}`);
                setProfile(profileData);

                // Fetch Posts (Stories)
                const postsData = await api.get(`/u/${username}/posts`);
                setPosts(postsData);

                // Fetch Showcase (Portfolio)
                try {
                    const showcaseData = await api.get(`/showcase/p/${username}`);
                    setShowcaseItems(showcaseData);
                } catch (e) {
                    console.warn('Failed to load showcase', e);
                    // Don't fail the whole page
                }

            } catch (err) {
                console.error('Profile fetch error:', err);
                setError(err.message || 'Profile not found');
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchProfileData();
        }
    }, [username]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                <div className="flex items-center gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="text-center py-24">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-muted-foreground">{error || "Creator not found"}</p>
                 <Link to="/blog">
                    <Button variant="link" className="mt-4">Back to Blog</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header / Hero */}
            <div className="border-b bg-muted/10">
                <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                        <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-lg">
                            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                            <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{profile.displayName || profile.username}</h1>
                                <p className="text-muted-foreground text-lg">@{profile.username}</p>
                            </div>
                            
                            {profile.bio && (
                                <p className="max-w-lg text-lg leading-relaxed text-foreground/80">
                                    {profile.bio}
                                </p>
                            )}

                            {user?.id === profile.userId ? (
                                <Link to="/dashboard/settings?tab=public-profile">
                                    <Button variant="outline" className="rounded-full px-6">Edit Profile</Button>
                                </Link>
                            ) : (
                                <FollowButton targetUsername={profile.username} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <Tabs defaultValue="stories" className="space-y-8">
                    <TabsList>
                        <TabsTrigger value="stories">Stories ({posts.length})</TabsTrigger>
                        <TabsTrigger value="showcase">Showcase ({showcaseItems.length})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="stories">
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <Link key={post._id} to={`/blog/${post.slug}`} className="group">
                                        <Card className="h-full border-none shadow-none bg-transparent hover:bg-muted/30 transition-colors">
                                            {post.coverImage && (
                                                <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                                                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            )}
                                            <CardHeader className="p-0 mb-2">
                                                <CardTitle className="leading-tight group-hover:text-primary transition-colors">{post.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <p className="text-muted-foreground line-clamp-2 text-sm">
                                                    {post.excerpt || "Read this story on StudioFlow."}
                                                </p>
                                                <div className="mt-4 flex items-center text-xs text-muted-foreground/60">
                                                    {format(new Date(post.createdAt), 'MMM d, yyyy')}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No stories published yet.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="showcase">
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
                            {showcaseItems.length > 0 ? (
                                showcaseItems.map(item => (
                                    <Card key={item._id} className="cursor-pointer group border-none shadow-none" onClick={() => window.open(item.previewUrl || '#', '_blank')}>
                                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-4 relative">
                                            {/* Item Preview */}
                                             {item.previewUrl && (item.mimeType?.startsWith('video') ? (
                                                 <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                                             ) : (
                                                <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                             ))}
                                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                                                 View Original
                                             </div>
                                        </div>
                                        <CardHeader className="p-0">
                                            <CardTitle className="leading-tight">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 mt-2 text-sm text-muted-foreground line-clamp-2">
                                            {item.description}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No showcase items yet.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default CreatorProfilePage;
