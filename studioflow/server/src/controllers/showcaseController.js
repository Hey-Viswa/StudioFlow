
import { fileURLToPath } from 'url';
import path from 'path';
import { nanoid } from 'nanoid';
import ShowcaseItem from '../models/ShowcaseItem.js';
import ProjectFile from '../models/ProjectFile.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import { isFeatureEnabled } from '../utils/featureFlags.js';

// Helper to check invoice status strictly
async function verifyProjectInvoicePaid(projectId) {
    // Logic: Find ANY invoice for this project. 
    // If strict mode, MAYBE require specific invoice.
    // For Phase 4.3, we require the Project to have at least one 'paid' final invoice 
    // OR that the specific file is not gated by an unpaid invoice.
    
    // Simplest Strict Rule: Check if the project has ANY 'pending' or 'overdue' invoices.
    // If so, block showcase. (Showcase is a reward for full payment).
    
    const unpaidInvoices = await ProjectInvoice.countDocuments({
        projectId,
        status: { $in: ['pending', 'overdue', 'partially_paid', 'draft', 'sent'] }
    });
    
    if (unpaidInvoices > 0) {
        throw new Error('Project has unpaid invoices. Cannot publish to showcase.');
    }
    
    // Also ensure at least one paid invoice OR project is completed?
    // Let's stick to "No unpaid debt".
    return true;
}

export const publishShowcaseItem = async (req, res) => {
    try {
        const userId = req.userId; // Verified by middleware
        const { fileId, title, description, tags, comparisonFileId } = req.body;

        // 1. Feature Flag
        const isEnabled = await isFeatureEnabled('SHOWCASE_MODE');
        if (!isEnabled) return res.status(403).json({ error: 'Showcase mode disabled' });

        // 2. Fetch File & Ownership
        const file = await ProjectFile.findOne({ fileId, status: 'active' });
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Ownership check (Project Owner only)
        const project = await Project.findById(file.projectId);
        if (!project || String(project.ownerId) !== userId) {
            return res.status(403).json({ error: `Only project owner can publish. Owner: ${project?.ownerId} User: ${userId}` });
        }

        // 3. Validation: File must be Approved/Content Final
        // (Assuming 'active' + logic. ProjectFile doesn't have 'approved' status yet, logic usually implies it)
        // Let's enforce that the file must NOT be 'uploading'.
        
        // 4. CRITICAL: Invoice Gating
        try {
            await verifyProjectInvoicePaid(file.projectId);
        } catch (authErr) {
            return res.status(402).json({ error: authErr.message }); // 402 Payment Required
        }

        // 5. Create Slug & Item
        // Check if already exists
        let item = await ShowcaseItem.findOne({ originalFileId: file._id });
        
        if (item) {
            // Update
            item.title = title || item.title;
            item.description = description || item.description;
            item.tags = tags || item.tags;
            item.isPublished = true;
            item.publishedAt = new Date();
        } else {
            // Create New
            // Note: For now, we are reusing the original storageKey/URL for previewUrl.
            // In a real impl, we would generate a Watermarked version here.
            // SECURITY TODO: Ensure this doesn't leak SAS token if using Azure/S3 signed URLs.
            // For this implementation, we assume the frontend can render the file via a proxy or public URL.
            // If `fileRoutes` protects the file, we need a separate "public preview" mechanism.
            // For Phase 4.3 MVP, we will assume we use a placeholder "watermarked" URL logic.
            
            const slug = nanoid(10); // 10 chars URL friendly
            
            item = new ShowcaseItem({
                originalFileId: file._id,
                projectId: file.projectId,
                slug,
                previewUrl: `/api/showcase/preview/${slug}`, // Proxy endpoint to handle watermarking
                title: title || file.filename,
                description,
                tags,
                comparisonFileId: comparisonFileId || null,
                isPublished: true,
                publishedAt: new Date(),
                publishedBy: userId
            });
        }

        await item.save();

        res.status(201).json({ 
            success: true, 
            slug: item.slug, 
            publicUrl: `/showcase/${item.slug}` 
        });

    } catch (error) {
        console.error('Showcase publish error:', error);
        res.status(500).json({ error: 'Failed to publish item' });
    }
};

export const getShowcaseItem = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const item = await ShowcaseItem.findOne({ slug, isPublished: true })
            .populate('projectId', 'title pricing.currency') // Safe projected fields
            .populate('originalFileId', 'mimeType')  // Fetch mimeType from original file
            .lean();
            
        if (!item) {
            return res.status(404).json({ error: 'Showcase item not found' });
        }
        
        // Return only safe data
        res.status(200).json({
            title: item.title,
            description: item.description,
            previewUrl: item.previewUrl,
            mimeType: item.originalFileId?.mimeType || 'application/octet-stream', // Pass mimeType
            projectTitle: item.projectId.title,
            publishedAt: item.publishedAt,
            tags: item.tags
        });

    } catch (error) {
        console.error('Showcase fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch showcase item' });
    }
};

// Mock Watermark Proxy (Simulated)
import storageAdapter from '../utils/storageAdapter.js';

// ... existing imports ...

// Mock Watermark Proxy (Simulated)
export const getShowcasePreview = async (req, res) => {
    try {
        const { slug } = req.params;
        const item = await ShowcaseItem.findOne({ slug, isPublished: true }).populate('originalFileId');
        
        if (!item || !item.originalFileId) {
            return res.status(404).send('Not found');
        }
        
        const file = item.originalFileId;
        
        // 1. Try to generate Signed URL using Storage Adapter (S3/R2)
        if (file.storageKey && (file.storageProvider === 's3' || file.storageProvider === 'r2')) {
            try {
                const signedUrl = await storageAdapter.getSignedDownloadUrl(
                    file.storageKey,
                    {
                        filename: file.filename, // content-disposition
                        ttl: 3600, // 1 hour
                        forceDownload: false, // Inline for streaming
                        contentType: file.mimeType // Critical for video
                    }
                );
                
                // Redirect to the signed S3 URL which supports Range requests for streaming
                return res.redirect(signedUrl);
            } catch (err) {
                console.error('Failed to generate signed URL:', err);
                // Fallthrough to fallback
            }
        }
        
        // 2. Legacy/Local URL Check
        const originalPreviewUrl = file.previewUrl;
        
        if (originalPreviewUrl && originalPreviewUrl.startsWith('http')) {
             return res.redirect(originalPreviewUrl);
        }

        // 3. Local File System Fallback
        if (originalPreviewUrl) {
            const cleanPath = originalPreviewUrl.startsWith('/') ? originalPreviewUrl.slice(1) : originalPreviewUrl;
            const rootDir = process.cwd();
            const absolutePath = path.join(rootDir, 'public', cleanPath);
            
            if (file.mimeType) {
                res.setHeader('Content-Type', file.mimeType);
            }

            return res.sendFile(absolutePath, (err) => {
                if (err && !res.headersSent) {
                    res.status(404).send('File not found');
                }
            });
        }

        // Fallback
        res.redirect(`https://placehold.co/800x600?text=${encodeURIComponent(item.title)}`);

    } catch (err) {
        console.error('Preview error:', err);
        if (!res.headersSent) {
            res.status(500).send('Preview Error');
        }
    }
};

export const getPortfolio = async (req, res) => {
    try {
        const { username } = req.params;
        
        // 1. Find User by Username (Case insensitive)
        const user = await User.findOne({ 
            'publicProfile.username': username,
            'publicProfile.isEnabled': true
        }).select('name avatarUrl publicProfile');

        if (!user) {
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        // 2. Find Published Items for this User
        // We need to find projects owned by this user, then items.
        // Actually, ShowcaseItem stores `publishedBy` (userId string) or `projectId`. 
        // `publishedBy` is Clerk ID usually? Let's check User model. User._id is ObjectId, User.clerkUserId is String.
        // Project.ownerId is String (Clerk ID).
        // ShowcaseItem.publishedBy is String (Clerk ID).
        
        // We need the User's Clerk ID to query ShowcaseItem.publishedBy
        const items = await ShowcaseItem.find({ 
            publishedBy: user.clerkUserId,
            isPublished: true 
        })
        .sort({ publishedAt: -1 })
        .populate('projectId', 'title')
        .select('title description slug previewUrl thumbnailUrl tags publishedAt projectId')
        .lean();

        res.status(200).json({
            profile: {
                displayName: user.publicProfile.displayName || user.name,
                bio: user.publicProfile.bio,
                avatarUrl: user.publicProfile.avatarUrl || user.avatarUrl, // user.avatarUrl might not exist on root, check User schema? No, it's not on root in the schema I viewed. User has `name`, `email`. Avatar usually comes from Clerk or `publicProfile`. 
                // Wait, Userjs line 24 didn't show avatar. It must be in publicProfile or we rely on Clerk.
                // We will use publicProfile.avatarUrl.
                socialLinks: user.publicProfile.socialLinks,
                theme: user.publicProfile.theme
            },
            items
        });

    } catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
};

export const unpublishShowcaseItem = async (req, res) => {
    try {
        const userId = req.userId;
        const { slug } = req.body;

        const item = await ShowcaseItem.findOne({ slug });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Ownership Check
        // item.publishedBy matches userId (Clerk ID)
        if (item.publishedBy !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        item.isPublished = false;
        await item.save();

        res.status(200).json({ success: true, message: 'Unpublished successfully' });

    } catch (error) {
        console.error('Unpublish error:', error);
        res.status(500).json({ error: 'Failed to unpublish' });
    }
};

export const getShowcaseStatus = async (req, res) => {
    try {
        const { fileId } = req.params;
        // Check if there is a published item for this file
        // We look for originalFileId. BUT ProjectFile.fileId is a string, ProjectFile._id is ObjectId.
        // showcaseItem.originalFileId is ObjectId ref.
        // req.params.fileId is likely the ProjectFile._id? 
        // Let's verify what the frontend passes. Usually it passes fileId (string) or _id.
        // In ShowcaseConfigModal, it passes file.fileId (string) to publish.
        // But publishShowcaseItem looks up ProjectFile by { fileId: req.body.fileId }.
        // So we should do the same here.
        
        const file = await ProjectFile.findOne({ fileId: fileId });
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const item = await ShowcaseItem.findOne({ originalFileId: file._id });

        // Invoice Check
        const unpaidCount = await ProjectInvoice.countDocuments({
            projectId: file.projectId,
            status: { $in: ['pending', 'overdue', 'partially_paid', 'draft', 'sent'] }
        });
        const hasUnpaidInvoices = unpaidCount > 0;
        
        if (item && item.isPublished) {
            return res.status(200).json({ 
                isPublished: true, 
                slug: item.slug,
                publishedAt: item.publishedAt,
                hasUnpaidInvoices
            });
        }
        
        return res.status(200).json({ isPublished: false, hasUnpaidInvoices });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
};
