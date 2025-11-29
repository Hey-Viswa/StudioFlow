import React from 'react';

const Compare = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold text-center mb-12">Compare StudioFlow</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold mb-4">StudioFlow vs Asana</h2>
                        <p className="mb-4">Why creative teams prefer StudioFlow over Asana's generic task lists.</p>
                        {/* Link to specific comparison page later */}
                    </div>
                    {/* More comparisons */}
                </div>
            </div>
        </div>
    );
};

export default Compare;
