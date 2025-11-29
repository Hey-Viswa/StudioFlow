import React from 'react';

const Invoicing = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pt-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold mb-6">Invoicing & Billing for Creatives</h1>
                <p className="text-xl mb-8">Create professional invoices and get paid instantly via Razorpay.</p>

                <div className="prose dark:prose-invert max-w-none">
                    <h2>Automated Billing</h2>
                    <p>Set up recurring invoices for retainers and never chase a payment again.</p>
                    {/* Content to be expanded */}
                </div>
            </div>
        </div>
    );
};

export default Invoicing;
