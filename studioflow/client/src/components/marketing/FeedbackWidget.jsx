import React, { useState } from 'react';
import { marketingApi } from '../../lib/marketing';
import { toast } from 'sonner';
import { MessageSquarePlus, X, Send, Loader2, Bug, Lightbulb, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth(); // Optional auth for context

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message) return;

    setLoading(true);
    try {
      await marketingApi.submitFeedback({
        type,
        message,
        rating: 5, // Default for now, could add star rater
        pageUrl: window.location.pathname,
        userAgent: navigator.userAgent
      }, getToken);
      
      toast.success('Feedback sent. Thank you!');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-card text-card-foreground border shadow-lg rounded-xl w-80 p-4 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-sm">Send Feedback</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2 justify-between">
              {[
                { id: 'bug', icon: Bug, label: 'Bug' },
                { id: 'feature', icon: Lightbulb, label: 'Idea' },
                { id: 'love', icon: Heart, label: 'Love' },
                { id: 'general', icon: MessageCircle, label: 'Other' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border w-full transition-all ${
                    type === item.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-muted/30 border-transparent hover:bg-muted text-muted-foreground'
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquarePlus className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default FeedbackWidget;
