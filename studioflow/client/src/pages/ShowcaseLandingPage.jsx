
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock } from 'lucide-react';
import api from '@/lib/api';

export default function ShowcaseLandingPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShowcaseItem();
  }, [slug]);

  const fetchShowcaseItem = async () => {
    try {
      setLoading(true);
      // Public endpoint - no auth token needed
      const response = await api.get(`/showcase/${slug}`); 
      setItem(response);
    } catch (err) {
      console.error('Failed to load showcase item:', err);
      setError(err.message || 'Item not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8 animate-pulse">
            <div className="h-64 w-full bg-neutral-800 rounded-lg"></div>
            <div className="h-8 w-1/2 bg-neutral-800 rounded"></div>
            <div className="h-4 w-1/3 bg-neutral-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="p-4 bg-red-500/10 text-red-500 rounded-full inline-block">
             <AlertCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold">Unavailable</h1>
          <p className="text-neutral-400 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-purple-500/30">
      <Helmet>
        <title>{item ? `${item.title} | StudioFlow Showcase` : 'StudioFlow Showcase'}</title>
        <meta name="description" content={item?.description || 'View this project on StudioFlow.'} />
        {item?.previewUrl && <meta property="og:image" content={item.previewUrl} />}
      </Helmet>
      
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur fixed top-0 w-full z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">S</div>
              <span className="font-semibold tracking-tight">StudioFlow Showcase</span>
           </div>
           
           {item.projectTitle && (
               <Badge variant="outline" className="border-neutral-800 text-neutral-400 hidden sm:flex">
                  {item.projectTitle}
               </Badge>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        
        {/* Title Section */}
        <div className="mb-8 text-center sm:text-left space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
                {item.title}
            </h1>
            {item.description && (
                <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
                    {item.description}
                </p>
            )}
            
            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                    {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-none">
                            #{tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>

        {/* Visual Stage */}
        <div className="relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl shadow-black/50 aspect-video group">
             {/* Mock "Watermark" or Protected Overlay if needed */}
             <div className="absolute top-4 right-4 z-10 opacity-50 pointer-events-none select-none">
                 <div className="flex items-center gap-1 text-xs font-mono text-white/30 bg-black/20 px-2 py-1 rounded backdrop-blur-sm">
                     <Lock className="w-3 h-3" /> READ ONLY PREVIEW
                 </div>
             </div>

             {/* Asset */}
             <div className="w-full h-full flex items-center justify-center">
                 {/* For MVP, we use the previewURL directly. 
                     In real implementation, this should be a protected/watermarked stream.
                 */}
                 {item.mimeType?.startsWith('video/') ? (
                    <video 
                        src={item.previewUrl} 
                        className="w-full h-full object-contain"
                        controls
                        controlsList="nodownload" // Basic deterrent
                        disablePictureInPicture // Prevent PiP download/extraction
                        onContextMenu={(e) => e.preventDefault()}
                        preload="auto" // Reduce buffering
                    />
                 ) : (
                    <img 
                        src={item.previewUrl} 
                        alt={item.title} 
                        className="max-w-full max-h-full object-contain"
                        draggable="false"
                        onContextMenu={(e) => e.preventDefault()} // Basic "No Right Click"
                    />
                 )}
             </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-neutral-900 text-center text-neutral-500 text-sm">
             <p>Published via StudioFlow Client Portfolio</p>
             <p className="mt-2 text-xs opacity-50">
                 {new Date(item.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
             </p>
        </div>

      </main>
    </div>
  );
}
