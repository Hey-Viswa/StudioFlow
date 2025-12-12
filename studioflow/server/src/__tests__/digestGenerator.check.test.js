import { jest } from '@jest/globals';
import { generateDigestHtml } from '../workers/notificationBatchWorker.js';

describe('Digest Generator', () => {
    it('should group notifications by link', () => {
        const notifications = [
            {
                _id: '1',
                title: 'New Comment',
                message: 'Comment 1',
                link: '/tasks/123',
                createdAt: new Date(),
                data: { resourceName: 'Task A' }
            },
            {
                _id: '2',
                title: 'New Comment',
                message: 'Comment 2',
                link: '/tasks/123',
                createdAt: new Date(),
                data: { resourceName: 'Task A' }
            },
            {
                _id: '3',
                title: 'Project Update',
                message: 'Status changed',
                link: '/projects/999',
                createdAt: new Date(),
                data: { resourceName: 'Project X' }
            }
        ];

        const html = generateDigestHtml(notifications);

        // Should contain Header for Task A
        expect(html).toContain('Task A');
        // Should contain Header for Project X
        expect(html).toContain('Project X');

        // Should contain messages
        expect(html).toContain('Comment 1');
        expect(html).toContain('Comment 2');
        expect(html).toContain('Status changed');

        // Should have 2 groups (headers)
        // We can check by counting occurences of specific unique HTML structure like "updates &rarr;"
        const groupMatches = html.match(/updates &rarr;/g);
        expect(groupMatches).toHaveLength(2);
    });

    it('should handle notifications without links', () => {
        const notifications = [
            {
                title: 'System Alert',
                message: 'Maintenance',
                createdAt: new Date()
            }
        ];

        const html = generateDigestHtml(notifications);
        expect(html).toContain('System Alert');
        expect(html).toContain('Maintenance');
    });
});
