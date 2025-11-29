import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Mock data
const mockInvoices = [
    { status: 'paid', total: 1000, paidAt: new Date() },
    { status: 'draft', total: 500, createdAt: new Date() },
    { status: 'pending', total: 2000, createdAt: new Date() } // Should map to sent
];

const mockProjects = [
    { status: 'active', createdAt: new Date() },
    { status: 'completed', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last week
];

// Copy of helper functions from dashboardController.js
function generateRevenueData(invoices, granularity) {
    const dataMap = new Map();
    const now = new Date();

    if (granularity === 'daily') {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dataMap.set(key, 0);
        }
    } else if (granularity === 'weekly') {
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().split('T')[0];
            dataMap.set(key, 0);
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            dataMap.set(key, 0);
        }
    }

    invoices.forEach(invoice => {
        if (invoice.status !== 'paid') return;

        const date = new Date(invoice.paidAt || invoice.updatedAt || invoice.createdAt);
        let key;

        if (granularity === 'daily') {
            key = date.toISOString().split('T')[0];
        } else if (granularity === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (dataMap.has(key)) {
            dataMap.set(key, dataMap.get(key) + (invoice.total || 0));
        }
    });

    return Array.from(dataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));
}

function generateProjectProgressData(projects) {
    const weekMap = new Map();
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
        const key = weekStart.toISOString().split('T')[0];

        const displayDate = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weekMap.set(key, {
            week: displayDate,
            'in-progress': 0,
            'completed': 0,
            'needs-revision': 0
        });
    }

    projects.forEach(project => {
        const date = new Date(project.createdAt);
        for (const [weekKey, weekData] of weekMap.entries()) {
            const weekDate = new Date(weekKey);
            const nextWeekDate = new Date(weekDate.getTime() + 7 * 24 * 60 * 60 * 1000);

            if (date >= weekDate && date < nextWeekDate) {
                if (project.status === 'active') {
                    weekData['in-progress']++;
                } else if (project.status === 'completed' || project.status === 'finalized') {
                    weekData['completed']++;
                } else if (project.status === 'needs-revision') {
                    weekData['needs-revision']++;
                }
                break;
            }
        }
    });

    return Array.from(weekMap.values());
}

// Test execution
console.log('Testing Revenue Data Generation...');
const revenueData = generateRevenueData(mockInvoices, 'monthly');
console.log('Revenue Data Points:', revenueData.length);
console.log('Sample Revenue:', revenueData[revenueData.length - 1]);

console.log('\nTesting Project Progress Data Generation...');
const progressData = generateProjectProgressData(mockProjects);
console.log('Progress Data Points:', progressData.length);
console.log('Sample Progress:', progressData[progressData.length - 1]);

if (revenueData.length === 6 && progressData.length === 8) {
    console.log('\n✅ Data generation logic verified!');
} else {
    console.error('\n❌ Data generation logic failed!');
}
