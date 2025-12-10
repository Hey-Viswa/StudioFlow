import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            // Show banner after a short delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-semibold mb-2">We value your privacy 🍪</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                        By clicking "Accept All", you consent to our use of cookies.
                        <Link to="/privacy-policy" className="text-primary hover:underline ml-1">
                            Read our Privacy Policy
                        </Link>.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" onClick={handleDecline} className="flex-1 md:flex-none">
                        Decline
                    </Button>
                    <Button onClick={handleAccept} className="flex-1 md:flex-none bg-primary text-primary-foreground hover:bg-primary/90">
                        Accept All
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
