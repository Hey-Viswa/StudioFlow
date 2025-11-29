
// Mock of the updated generateRevenueData function
function generateRevenueData(invoices, granularity) {
    const dataMap = new Map();
    const now = new Date('2025-11-30T10:00:00Z'); // Fixed "now" for testing

    // Helper to format date as YYYY-MM-DD in local time
    const toLocalISOString = (date) => {
        const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().split('T')[0];
    };

    // Initialize map (simplified for test)
    if (granularity === 'daily') {
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = toLocalISOString(d);
            dataMap.set(key, 0);
        }
    }

    invoices.forEach(invoice => {
        if (invoice.status !== 'paid') return;

        const date = new Date(invoice.paidAt || invoice.updatedAt || invoice.createdAt);
        let key;

        if (granularity === 'daily') {
            key = toLocalISOString(date);
        }
        // ... other granularities omitted for test

        if (dataMap.has(key)) {
            dataMap.set(key, dataMap.get(key) + (invoice.total || 0));
        } else {
            // For test, add even if not in range
            dataMap.set(key, (dataMap.get(key) || 0) + (invoice.total || 0));
        }
    });

    return Array.from(dataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue }));
}

// Test Data
const invoices = [
    {
        status: 'paid',
        total: 100,
        paidAt: '2025-11-29T18:30:50.599Z' // Nov 30th 00:00:50 IST
    },
    {
        status: 'paid',
        total: 200,
        paidAt: '2025-11-29T10:00:00.000Z' // Nov 29th 15:30 IST
    }
];

console.log('Testing Revenue Grouping (Local Time):');
const dailyData = generateRevenueData(invoices, 'daily');
console.log(JSON.stringify(dailyData, null, 2));

// Check if Nov 30th is present
const nov30 = dailyData.find(d => d.date === '2025-11-30');
if (nov30 && nov30.revenue === 100) {
    console.log('✅ Nov 30th data correctly grouped (Local Time)');
} else {
    console.log('❌ Nov 30th data missing or incorrect');
}

const nov29 = dailyData.find(d => d.date === '2025-11-29');
if (nov29 && nov29.revenue === 200) {
    console.log('✅ Nov 29th data correctly grouped (Local Time)');
} else {
    console.log('❌ Nov 29th data missing or incorrect');
}
