import React from 'react';

const ClientPortal = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pt-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold mb-6">Client Portal for Creative Agencies</h1>
                <p className="text-xl mb-8">Streamline your client communication with a dedicated, white-labeled portal.</p>

                <div className="prose dark:prose-invert max-w-none">
                    <h2>Why use a Client Portal?</h2>
                    <p>Stop using email chains to manage feedback. StudioFlow's client portal allows you to...</p>
                    {/* Content to be expanded */}
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
