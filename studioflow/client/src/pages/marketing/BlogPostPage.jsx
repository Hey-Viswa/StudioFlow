import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marketingApi } from '../../lib/marketing';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { Calendar, User, ArrowLeft, Loader2, Share2, Bookmark, BookmarkCheck, LayoutDashboard, PenSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import api from '@/lib/api';

import ResponseSection from '../../components/marketing/ResponseSection';
import FollowButton from '../../components/marketing/FollowButton';

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await marketingApi.getPostBySlug('blog', slug, getToken);
        setPost(data);
        
        // Check bookmark status if signed in
        if (isSignedIn && data?._id) {
          try {
            const res = await api.get(`bookmark/check?postId=${data._id}`, { getToken });
            setIsBookmarked(res.bookmarked);
          } catch (e) {
            // Ignore bookmark check errors
          }
        }
      } catch (error) {
        console.error('Failed to load post', error);
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug, isSignedIn, getToken]);

  const handleBookmark = async () => {
    if (!isSignedIn || !post) return;
    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await api.delete('bookmark', { getToken, body: { postId: post._id } });
        setIsBookmarked(false);
        toast.success('Removed from bookmarks');
      } else {
        await api.post('bookmark', { postId: post._id }, { getToken });
        setIsBookmarked(true);
        toast.success('Added to bookmarks');
      }
    } catch (e) {
      console.error('Bookmark error:', e);
      toast.error('Could not update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = post?.title || 'Check out this post on StudioFlow';
    
    // Try native share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: post?.excerpt || '',
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">404 - Post not found</h1>
        <Link to="/blog" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-serif selection:bg-primary/20">
      <nav className="border-b border-border/40 px-6 py-4 flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-50 transition-all">
         <div className="flex items-center gap-4">
             <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
             </Link>
             <span className="font-serif font-bold text-lg tracking-tight ml-2">StudioFlow</span>
         </div>
         <div className="flex items-center gap-3">
             {isSignedIn && (
                 <div className="flex items-center gap-3">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`transition-colors ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={handleBookmark}
                        disabled={bookmarkLoading}
                     >
                        {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                     </Button>
                     <Link to="/write" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <PenSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Write</span>
                     </Link>
                     <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                     </Link>
                     <UserButton afterSignOutUrl="/" />
                 </div>
             )}
            {!isSignedIn && (
                <div className="flex items-center gap-3">
                     <Button variant="ghost" className="rounded-full text-sm h-9 px-5" asChild>
                        <Link to="/dashboard">Sign In</Link>
                     </Button>
                </div>
            )}
         </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-8 text-foreground leading-[1.1]">
            {post.title}
          </h1>
          
          <div className="flex items-center justify-between border-y border-border/40 py-6">
            <div className="flex items-center gap-3">
              <Link to={post.authorProfile ? `/u/${post.authorProfile.username}` : '#'}>
                 <Avatar className="w-10 h-10 border-2 border-background">
                    <AvatarImage src={post.authorProfile?.avatarUrl} />
                    <AvatarFallback>{post.author?.[0] || 'A'}</AvatarFallback>
                 </Avatar>
              </Link>
              <div className="text-left leading-tight">
                  <div className="flex items-center gap-2">
                      <Link to={post.authorProfile ? `/u/${post.authorProfile.username}` : '#'} className="font-medium text-foreground font-sans text-sm hover:underline">
                          {post.authorProfile?.displayName || post.author}
                      </Link>
                      {post.authorProfile?.followersCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                              · {post.authorProfile.followersCount.toLocaleString()} {post.authorProfile.followersCount === 1 ? 'follower' : 'followers'}
                          </span>
                      )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-sans">
                    <span>{post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}</span>
                    <span>·</span>
                    <span>4 min read</span>
                    {post.authorProfile && (
                        <FollowButton 
                            targetUsername={post.authorProfile.username} 
                            className="ml-2 h-6 px-3 text-xs" 
                            initialIsFollowing={post.isFollowing}
                        />
                    )}
                  </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-muted-foreground">
                 <Button variant="ghost" size="icon" onClick={handleShare} title="Share this post">
                    <Share2 className="w-5 h-5" />
                 </Button>
            </div>
          </div>
        </header>

        {post.coverImage && (
            <figure className="mb-12">
                <img 
                    src={post.coverImage} 
                    alt={post.title} 
                    className="w-full aspect-video object-cover rounded-md shadow-sm"
                />
                <figcaption className="text-center text-sm text-muted-foreground mt-4 font-sans italic">
                    Image via Unsplash / Custom
                </figcaption>
            </figure>
        )}

        <div className="font-serif text-lg md:text-xl leading-relaxed text-foreground/90 space-y-6">
           {/* Content Logic: Full if signed in, Excerpt if guest */}
           {isSignedIn ? (
                <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-sans prose-headings:font-bold prose-p:font-serif prose-a:text-primary prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: post.content }} />
           ) : (
               <div className="relative">
                    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-sans Prose-p:font-serif mask-image-gradient" dangerouslySetInnerHTML={{ __html: post.content.slice(0, 1000) + '...' }} />
                    
                    {/* Fade Out & CTA Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-background via-background/90 to-transparent flex flex-col items-center justify-end pb-12">
                        <div className="text-center space-y-6 max-w-md mx-auto p-8 rounded-2xl bg-gradient-to-b from-transparent to-background">
                            <h3 className="text-2xl font-bold font-sans">Read the full story</h3>
                            <p className="text-muted-foreground font-sans">
                                Sign in to read this story and access all content.
                            </p>
                            <Button size="lg" className="w-full rounded-full font-sans text-base" asChild>
                                <Link to="/dashboard">Sign In</Link>
                            </Button>
                        </div>
                    </div>
               </div>
           )}

        </div>

        <hr className="my-20 border-border/40" />
        
        <ResponseSection contentId={post._id} />

        {/* Author CTA Section */}
        {post.authorProfile && (
          <div className="bg-muted/30 p-10 rounded-2xl font-sans">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-20 h-20 border-4 border-background">
                <AvatarImage src={post.authorProfile.avatarUrl} />
                <AvatarFallback className="text-2xl">{post.authorProfile.displayName?.[0] || 'A'}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <p className="text-sm text-muted-foreground mb-1">Written by</p>
                <Link to={`/u/${post.authorProfile.username}`} className="text-xl font-bold hover:underline">
                  {post.authorProfile.displayName}
                </Link>
                {post.authorProfile.bio && (
                  <p className="text-muted-foreground mt-2 line-clamp-2">{post.authorProfile.bio}</p>
                )}
              </div>
              <FollowButton 
                  targetUsername={post.authorProfile.username} 
                  className="shrink-0" 
                  initialIsFollowing={post.authorProfile.isFollowing}
              />
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

export default BlogPostPage;
