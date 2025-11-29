import React from 'react';
import { Link } from 'react-router-dom';

const Features = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold text-center mb-12">StudioFlow Features</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold mb-4">Client Portal</h2>
                        <p className="mb-4">Give your clients a professional space to review files and pay invoices.</p>
                        <Link to="/features/client-portal" className="text-indigo-600 hover:text-indigo-500">Learn more &rarr;</Link>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold mb-4">Invoicing & Billing</h2>
                        <p className="mb-4">Get paid faster with integrated Razorpay invoicing and automated reminders.</p>
                        <Link to="/features/invoicing" className="text-indigo-600 hover:text-indigo-500">Learn more &rarr;</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;
