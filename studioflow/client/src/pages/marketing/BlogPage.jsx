import React, { useEffect, useState } from 'react';
import { marketingApi } from '../../lib/marketing';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight, Loader2, Trash2, Bookmark, BookmarkCheck, PenSquare, LayoutDashboard, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BlogPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletePostId, setDeletePostId] = useState(null);
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'mine' | 'bookmarks'

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                if (activeTab === 'discover') {
                    const data = await marketingApi.getPosts('blog');
                    setPosts(data);
                } else if (activeTab === 'bookmarks') {
                    if (!isSignedIn) {
                        setPosts([]);
                        return;
                    }
                    const data = await api.get('bookmarks', { getToken });
                    setPosts(data.posts || []);
                } else {
                    if (!isSignedIn) {
                        setPosts([]);
                        return;
                    }
                    const data = await api.get('/marketing/content/mine', { getToken });
                    setPosts(data);
                }
            } catch (error) {
                console.error('Failed to load specific posts', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [activeTab, isSignedIn, getToken]);

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/marketing/content/${postId}`, { getToken });
            toast.success("Story deleted");
            setPosts(posts.filter(p => p._id !== postId));
        } catch (e) {
            console.error(e);
            toast.error("Could not delete");
        } finally {
            setDeletePostId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
            {/* Universal Nav (Medium Style) */}
            <nav className="border-b border-border/40 px-6 py-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <Link to="/?noredirect=true" className="font-bold text-2xl tracking-tight font-serif flex items-center gap-2">
                        <img src="/studioflowlogo.svg" alt="StudioFlow" className="h-8 w-auto hidden dark:block" />
                        <img src="/studioflow-black.svg" alt="StudioFlow" className="h-8 w-auto block dark:hidden" />
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    {isSignedIn && (
                        <Link to="/write" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                            <PenSquare className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-medium">Write</span>
                        </Link>
                    )}

                    {isSignedIn ? (
                        <div className="flex items-center gap-3">
                            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                <LayoutDashboard className="w-4 h-4" />
                                <span className="hidden sm:inline">Dashboard</span>
                            </Link>
                            <Button variant="ghost" size="icon" className="relative" asChild>
                                <Link to="/dashboard/notifications">
                                    <Bell className="w-5 h-5" />
                                </Link>
                            </Button>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="rounded-full px-5 h-9 text-sm" asChild>
                                <Link to="/dashboard">Sign In</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Main Feed */}
                <div className="lg:col-span-8 space-y-10">
                    <header className="border-b border-border/40 pb-4 flex items-center gap-8 text-sm font-medium">
                        <button
                            onClick={() => setActiveTab('discover')}
                            className={`pb-4 transition-colors ${activeTab === 'discover' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Discover
                        </button>
                        {isSignedIn && (
                            <>
                                <button
                                    onClick={() => setActiveTab('mine')}
                                    className={`pb-4 transition-colors ${activeTab === 'mine' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    My Stories
                                </button>
                                <button
                                    onClick={() => setActiveTab('bookmarks')}
                                    className={`pb-4 transition-colors ${activeTab === 'bookmarks' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Bookmarks
                                </button>
                            </>
                        )}
                    </header>

                    {loading ? (
                        <div className="space-y-16">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-muted rounded-full"></div>
                                        <div className="h-4 bg-muted w-24 rounded"></div>
                                    </div>
                                    <div className="h-8 bg-muted w-3/4 rounded"></div>
                                    <div className="h-24 bg-muted w-full rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {posts.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground font-serif text-lg">
                                    {activeTab === 'mine' ? 'You haven\'t written any stories yet.' : 'No stories published yet.'}
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <article key={post.slug} className="group flex flex-col sm:flex-row gap-8 items-start cursor-pointer" onClick={() => navigate(`/blog/${post.slug}`)}>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80 mb-2">
                                                <span className="flex items-center gap-2 z-10">
                                                    <Avatar className="w-5 h-5">
                                                        <AvatarImage src={post.authorProfile?.avatarUrl} />
                                                        <AvatarFallback className="text-[10px]"><User className="w-3 h-3" /></AvatarFallback>
                                                    </Avatar>
                                                    <span>{post.authorProfile?.displayName || post.author || 'Me'}</span>
                                                    {post.authorProfile?.followersCount > 0 && (
                                                        <span className="text-muted-foreground">· {post.authorProfile.followersCount.toLocaleString()} {post.authorProfile.followersCount === 1 ? 'follower' : 'followers'}</span>
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground">·</span>
                                                <span className="text-muted-foreground">{post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}</span>
                                                {post.status === 'draft' && <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 rounded-full">Draft</span>}
                                            </div>

                                            <h2 className="text-2xl font-bold font-serif group-hover:underline decoration-foreground/50 underline-offset-4 decoration-1 transition-all">
                                                {post.title}
                                            </h2>
                                            <p className="text-muted-foreground font-serif text-base line-clamp-3 leading-relaxed">
                                                {post.excerpt || "No excerpt available for this story. Click to read the full content."}
                                            </p>

                                            <div className="pt-4 flex items-center gap-4">
                                                <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                                                    {post.tags?.[0] || 'Update'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">3 min read</span>

                                                {activeTab === 'mine' && (
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-muted-foreground hover:text-foreground"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/write/${post.slug}`);
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <AlertDialog open={deletePostId === post._id} onOpenChange={(open) => !open && setDeletePostId(null)}>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeletePostId(post._id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete this story?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action cannot be undone. This will permanently delete "{post.title}" from your account.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={() => handleDeletePost(post._id)}
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {post.coverImage && (
                                            <div className="w-full sm:w-40 aspect-[1.6/1] sm:aspect-square bg-muted rounded-md overflow-hidden shrink-0">
                                                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                        )}
                                    </article>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar (Desktop Only) */}
                <aside className="hidden lg:block lg:col-span-4 pl-12 border-l border-border/40 space-y-10 sticky top-24 h-fit">
                    <div className="space-y-4">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-foreground/80">Topics to explore</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Video Editing', 'Motion Graphics', 'Color Grading', 'Sound Design', 'VFX', 'Tutorials', 'Workflow Tips', 'Software Updates'].map(tag => (
                                <span key={tag} className="px-4 py-2 bg-secondary/50 text-secondary-foreground text-sm rounded-full cursor-not-allowed opacity-60 hover:opacity-80 transition-opacity">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground italic">Topic filtering coming soon</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-foreground/80">About StudioFlow Blog</h3>
                        <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                            Discover the latest video editing tips, motion graphics tutorials, and stories from creators. Learn how StudioFlow is building the future of creative collaboration.
                        </p>
                        <Button variant="outline" className="rounded-full w-full" asChild>
                            <Link to="/write">Start Writing</Link>
                        </Button>
                    </div>
                </aside>

            </main>
        </div>
    );
};

export default BlogPage;
