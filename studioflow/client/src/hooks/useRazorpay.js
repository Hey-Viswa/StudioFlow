import { useState, useCallback } from 'react';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export default function useRazorpay() {
    const [isLoaded, setIsLoaded] = useState(false);

    const loadScript = useCallback(() => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                setIsLoaded(true);
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = RAZORPAY_SCRIPT_URL;
            script.onload = () => {
                setIsLoaded(true);
                resolve(true);
            };
            script.onerror = () => {
                setIsLoaded(false);
                resolve(false);
            };
            document.body.appendChild(script);
        });
    }, []);

    const displayRazorpay = useCallback(async (options) => {
        const res = await loadScript();

        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        const rzp = new window.Razorpay(options);
        rzp.open();
        return rzp;
    }, [loadScript]);

    return { isLoaded, displayRazorpay };
}
