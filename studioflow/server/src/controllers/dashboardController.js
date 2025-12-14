import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import ProjectFile from '../models/ProjectFile.js';
import storageAdapter from '../utils/storageAdapter.js';

/**
 * Get dashboard metrics
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.userId;
    const viewContext = req.query.viewContext; // 'owner' | 'client' | undefined

    // 1. Get Project Contexts
    const { ownedProjectIds, memberProjectIds } = await getProjectContexts(userId);

    // 2. Fetch Invoices based on View Context
    let invoices = [];
    let projectIdsToFetch = [];

    // Determine which projects we are interested in based on context
    if (viewContext === 'owner') {
      projectIdsToFetch = ownedProjectIds;
    } else if (viewContext === 'client') {
      projectIdsToFetch = memberProjectIds;
    } else {
      // Default / Mixed view: Fetch everything the user has access to
      projectIdsToFetch = [...ownedProjectIds, ...memberProjectIds];
    }

    if (projectIdsToFetch.length > 0) {
      invoices = await ProjectInvoice.find({ projectId: { $in: projectIdsToFetch } });
    }

    // console.log('DEBUG DASHBOARD:', {
    //   userId,
    //   viewContext,
    //   ownedLen: ownedProjectIds.length,
    //   memberLen: memberProjectIds.length,
    //   fetchedInvoices: invoices.length
    // });
    try {
      const fs = await import('fs');
      fs.appendFileSync('debug_dash.txt', JSON.stringify({
        time: new Date().toISOString(),
        userId,
        viewContext,
        ownedLen: ownedProjectIds.length,
        memberLen: memberProjectIds.length,
        fetchedInvoicesLen: invoices.length,
        // ownedProjectIds: ownedProjectIds,
        // firstInv: invoices[0]
      }) + '\n');
    } catch (e) { console.error('Log error', e); }

    // 3. Filter Invoices by Role Logic
    let ownerInvoices = [];
    let clientInvoices = [];

    if (viewContext === 'owner' || !viewContext) {
      // Owner Logic: All invoices in projects I own
      ownerInvoices = invoices.filter(inv =>
        ownedProjectIds.some(id => id.toString() === inv.projectId.toString())
      );
    }

    if (viewContext === 'client' || !viewContext) {
      // Client Logic: Invoices where I am the payer
      clientInvoices = invoices.filter(inv => {
        // Must be a project I am a member of (or just check explicit payer match)
        // Safety: Ensure it's not one of my owned projects if we want strict separation, 
        // but typically you can't be client in your own project in this app's logic?
        // Let's stick to: I am payer OR client.userId matches
        return (inv.client && inv.client.userId === userId) || (inv.payerUserId === userId);
      });
    }

    // console.log('DEBUG DASHBOARD FILTERED:', { ... });
    try {
      const fs = await import('fs');
      fs.appendFileSync('debug_dash.txt', JSON.stringify({
        msg: 'FILTERED',
        ownerInvoicesLen: ownerInvoices.length,
        clientInvoicesLen: clientInvoices.length
      }) + '\n');
    } catch (e) { }



    // 4. Calculate Metrics based on Context
    // If viewContext is 'owner', we ONLY return owner metrics
    // If viewContext is 'client', we ONLY return client metrics

    let metrics = {
      totalProjects: new Set([...ownedProjectIds.map(id => id.toString()), ...memberProjectIds.map(id => id.toString())]).size, // Total unique access
      activeProjects: 0, // Simplified for now, or fetch projects to count
      completedProjects: 0,
      unreadNotifications: 0, // Placeholder
      storageUsed: 0,
      recentActivity: []
    };

    // Fill in extra user data
    if (!viewContext) {
      // Only fetch user-level stats if full dashboard
      const [user, unreadCount] = await Promise.all([
        User.findOne({ clerkUserId: userId }).select('stats recentActivity'),
        Notification.countDocuments({ recipientId: userId, isRead: false })
      ]);
      metrics.unreadNotifications = unreadCount;
      metrics.storageUsed = user?.stats?.storageUsed || 0;
      metrics.recentActivity = user?.recentActivity || [];
    }

    // --- OWNER METRICS ---
    if (viewContext === 'owner' || !viewContext) {
      const calculateChange = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      metrics.totalBilled = ownerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.totalPaid = ownerInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.outstanding = ownerInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.overdue = ownerInvoices.filter(inv => {
        const isOverdueStatus = inv.status === 'overdue';
        const isPendingAndLate = inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) < new Date();
        return isOverdueStatus || isPendingAndLate;
      }).reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Trends
      const billedThisMonth = ownerInvoices.filter(inv => new Date(inv.createdAt) >= startOfCurrentMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const billedLastMonth = ownerInvoices.filter(inv => new Date(inv.createdAt) >= startOfLastMonth && new Date(inv.createdAt) <= endOfLastMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.totalBilledChange = calculateChange(billedThisMonth, billedLastMonth);

      const paidThisMonth = ownerInvoices.filter(inv => inv.status === 'paid' && new Date(inv.paidAt || inv.updatedAt) >= startOfCurrentMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const paidLastMonth = ownerInvoices.filter(inv => inv.status === 'paid' && new Date(inv.paidAt || inv.updatedAt) >= startOfLastMonth && new Date(inv.paidAt || inv.updatedAt) <= endOfLastMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.totalPaidChange = calculateChange(paidThisMonth, paidLastMonth);

      const overdueThisMonth = ownerInvoices.filter(inv => (inv.status === 'overdue' || (inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) < now)) && new Date(inv.dueDate) >= startOfCurrentMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      const overdueLastMonth = ownerInvoices.filter(inv => (inv.status === 'overdue' || (inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) <= endOfLastMonth)) && new Date(inv.dueDate) >= startOfLastMonth).reduce((sum, inv) => sum + (inv.total || 0), 0);
      metrics.overdueChange = calculateChange(overdueThisMonth, overdueLastMonth);
    }

    // --- CLIENT METRICS ---
    if (viewContext === 'client' || !viewContext) {
      metrics.clientMetrics = {
        totalSpent: clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        totalPaid: clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0),
        totalPending: clientInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0),
        invoiceCount: clientInvoices.length
      };
    }

    // Determine context based on Project Existence, NOT just financial activity
    const hasOwnedProjects = ownedProjectIds.length > 0;
    const hasClientProjects = memberProjectIds.length > 0;

    metrics.roleContext = viewContext || (hasOwnedProjects && hasClientProjects ? 'mixed' : (hasOwnedProjects ? 'owner' : 'client'));
    metrics.hasOwnedProjects = hasOwnedProjects;
    metrics.hasClientProjects = hasClientProjects;

    res.status(200).json({ metrics });
  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

/**
 * Get recent files across all projects
 */
export const getRecentFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole || 'owner';
    const limit = parseInt(req.query.limit) || 10;

    // 1. Find all project memberships for this user
    const memberships = await ProjectMember.find({
      userId,
      status: { $ne: 'inactive' }
    }).select('projectId');

    const memberProjectIds = memberships.map(m => m.projectId);

    // 2. Get active projects user has access to
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Only active projects
        {
          $or: [
            { ownerId: userId },
            { _id: { $in: memberProjectIds } }
          ]
        }
      ]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Get recent files calling optimized query for clients
    let files;
    if (userRole === 'client') {
      files = await ProjectFile.find({
        projectId: { $in: projectIds },
        status: 'active',
        deletedAt: null,
        'sharedWith.userId': userId
      })
        .sort({ 'sharedWith.sharedAt': -1 }) // Sort by shared date for clients
        .limit(limit)
        .lean();
    } else {
      files = await ProjectFile.find({
        projectId: { $in: projectIds },
        status: 'active',
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // No need to filter visibleFiles again as query handled it for clients
    const visibleFiles = files;

    // Generate preview URLs
    const processedFiles = await Promise.all(visibleFiles.map(async (file) => {
      let url = null;
      let previewUrl = null;

      // Priority 1: Use storageKey if available (S3/R2)
      if (file.storageKey) {
        try {
          // Generate signed URL for access (valid for 1 hour)
          url = await storageAdapter.getSignedDownloadUrl(file.storageKey, {
            filename: file.originalFilename || file.filename,
            forceDownload: false,
            contentType: file.mimeType,
            ttl: 3600,
          });
        } catch (err) {
          console.warn(`Failed to generate signed URL for file ${file._id}:`, err.message);
        }
      }

      // Priority 2: Use stored URL (Local uploads or external links)
      if (!url && file.url) {
        url = file.url;
      }

      // Generate preview URL
      if (url && file.mimeType && (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/'))) {
        previewUrl = url;
      }

      return { ...file, url, previewUrl };
    }));

    res.status(200).json({ files: processedFiles });
  } catch (error) {
    console.error('❌ Error fetching recent files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

/**
 * Get recent invoices across all projects
 */
export const getRecentInvoices = async (req, res) => {
  try {
    const userId = req.userId;
    const viewContext = req.query.viewContext; // 'owner' | 'client'
    const limit = parseInt(req.query.limit) || 10;

    const { ownedProjectIds, memberProjectIds } = await getProjectContexts(userId);
    let invoices = [];

    // Filter by context
    if (viewContext === 'owner') {
      invoices = await ProjectInvoice.find({ projectId: { $in: ownedProjectIds } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } else if (viewContext === 'client') {
      const potentialInvoices = await ProjectInvoice.find({ projectId: { $in: memberProjectIds } })
        .sort({ createdAt: -1 })
        .lean();

      // Post-filter for strict client matching
      invoices = potentialInvoices
        .filter(inv => (inv.client && inv.client.userId === userId) || (inv.payerUserId === userId))
        .slice(0, limit);
    } else {
      // Fallback or Mixed: Show both (but careful with leakage)
      // Ideally default to Owner if owner, Client if client.
      // For safety, let's fetch both but strictly filtered
      const ownerInvs = await ProjectInvoice.find({ projectId: { $in: ownedProjectIds } }).sort({ createdAt: -1 }).limit(limit).lean();
      const clientInvsRaw = await ProjectInvoice.find({ projectId: { $in: memberProjectIds } }).sort({ createdAt: -1 }).limit(limit).lean();
      const clientInvs = clientInvsRaw.filter(inv => (inv.client && inv.client.userId === userId) || (inv.payerUserId === userId));

      invoices = [...ownerInvs, ...clientInvs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    }

    // Enrich logic remains (fetching project titles)
    const allProjectIdsKey = [...new Set(invoices.map(i => i.projectId))];
    const projects = await Project.find({ _id: { $in: allProjectIdsKey } }).select('title');
    const projectMap = Object.fromEntries(projects.map(p => [p._id.toString(), p.title]));

    const enrichedInvoices = invoices.map(inv => ({
      ...inv,
      projectTitle: projectMap[inv.projectId?.toString()] || 'Unknown Project'
    }));

    res.status(200).json({ invoices: enrichedInvoices });
  } catch (error) {
    console.error('❌ Error fetching recent invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

/**
 * Get chart data for dashboard visualizations
 */
export const getChartData = async (req, res) => {
  try {
    const userId = req.userId;
    const viewContext = req.query.viewContext; // 'owner' | 'client'
    const { granularity = 'monthly' } = req.query;

    const { ownedProjectIds, memberProjectIds } = await getProjectContexts(userId);
    let invoices = [];
    let projects = []; // For progress chart, needs same scoping

    // Determine Invoices and Projects based on Context
    if (viewContext === 'owner') {
      projects = await Project.find({ _id: { $in: ownedProjectIds }, deletedAt: null });
      invoices = await ProjectInvoice.find({ projectId: { $in: ownedProjectIds } }).sort({ createdAt: 1 }).lean();
    } else if (viewContext === 'client') {
      projects = await Project.find({ _id: { $in: memberProjectIds }, deletedAt: null });
      const potentialInvoices = await ProjectInvoice.find({ projectId: { $in: memberProjectIds } }).sort({ createdAt: 1 }).lean();
      invoices = potentialInvoices.filter(inv => (inv.client && inv.client.userId === userId) || (inv.payerUserId === userId));
    } else {
      // Mixed
      const ownedProjects = await Project.find({ _id: { $in: ownedProjectIds }, deletedAt: null });
      const memberProjects = await Project.find({ _id: { $in: memberProjectIds }, deletedAt: null });
      projects = [...ownedProjects, ...memberProjects];

      const ownerInvs = await ProjectInvoice.find({ projectId: { $in: ownedProjectIds } }).lean();
      const clientInvsRaw = await ProjectInvoice.find({ projectId: { $in: memberProjectIds } }).lean();
      const clientInvs = clientInvsRaw.filter(inv => (inv.client && inv.client.userId === userId) || (inv.payerUserId === userId));
      invoices = [...ownerInvs, ...clientInvs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Generate revenue data based on granularity
    const revenueData = generateRevenueData(invoices, granularity);

    // Invoice status distribution
    const invoiceStatusData = [
      { status: 'draft', count: invoices.filter(i => i.status === 'draft').length },
      { status: 'sent', count: invoices.filter(i => i.status === 'pending' || i.status === 'sent').length },
      { status: 'paid', count: invoices.filter(i => i.status === 'paid' || i.status === 'partially_paid').length },
      { status: 'overdue', count: invoices.filter(i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate && new Date(i.dueDate) < new Date())).length },
      { status: 'cancelled', count: invoices.filter(i => i.status === 'cancelled').length },
      { status: 'failed', count: invoices.filter(i => i.status === 'failed').length }
    ];

    // Project progress by week - Filtered by relevant projects
    const projectProgressData = generateProjectProgressData(projects);

    res.status(200).json({
      revenue: revenueData,
      invoiceStatus: invoiceStatusData,
      projectProgress: projectProgressData
    });
  } catch (error) {
    console.error('❌ Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

/**
 * Helper to get project contexts for a user
 * Returns { ownedProjectIds, memberProjectIds }
 */
const getProjectContexts = async (userId) => {
  const memberships = await ProjectMember.find({
    userId,
    status: { $ne: 'inactive' }
  }).select('projectId');
  const memberProjectIds = memberships.map(m => m.projectId);

  const projects = await Project.find({
    $and: [
      { deletedAt: null },
      {
        $or: [
          { ownerId: userId },
          { _id: { $in: memberProjectIds } }
        ]
      }
    ]
  }).select('_id ownerId');

  const ownedProjectIds = projects.filter(p => p.ownerId === userId).map(p => p._id);

  // Allow user to be a member of their own project (for testing or specific workflows)
  // We strictly check if they have a membership record.
  const validMemberProjectIds = memberships.map(m => m.projectId);

  return { ownedProjectIds, memberProjectIds: validMemberProjectIds };
};

// Helper function to generate revenue data
function generateRevenueData(invoices, granularity) {
  const dataMap = new Map();
  const now = new Date();

  // Helper to format date as YYYY-MM-DD in local time
  const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  };

  // Initialize map with 0 for all periods
  if (granularity === 'daily') {
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toLocalISOString(d);
      dataMap.set(key, 0);
    }
  } else if (granularity === 'weekly') {
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      const key = toLocalISOString(weekStart);
      dataMap.set(key, 0);
    }
  } else {
    // Last 6 months (default)
    for (let i = 5; i >= 0; i--) {
      // Create date for the 1st of the month
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Key format: YYYY-MM
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      dataMap.set(key, 0);
    }
  }

  invoices.forEach(invoice => {
    // Include paid and partially_paid
    if (invoice.status !== 'paid' && invoice.status !== 'partially_paid') return;

    const date = new Date(invoice.paidAt || invoice.updatedAt || invoice.createdAt);
    let key;

    if (granularity === 'daily') {
      key = toLocalISOString(date);
    } else if (granularity === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = toLocalISOString(weekStart);
    } else {
      // Monthly: YYYY-MM
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (dataMap.has(key)) {
      // Use amountPaid if available, otherwise total (for fully paid)
      const amount = invoice.amountPaid > 0 ? invoice.amountPaid : (invoice.total || 0);
      dataMap.set(key, dataMap.get(key) + amount);
    }
  });

  // Convert to array and format for frontend
  return Array.from(dataMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => {
      // Add a display label for better UX
      let label = date;

      if (granularity === 'monthly') {
        // Parse YYYY-MM
        const [year, month] = date.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // Parse YYYY-MM-DD manually to avoid timezone shifts
        const [year, month, day] = date.split('-').map(num => parseInt(num));
        const d = new Date(year, month - 1, day);
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return { date, revenue, label };
    });
}

// Helper function to generate project progress data
function generateProjectProgressData(projects) {
  const weekMap = new Map();
  const now = new Date();

  // Generate last 8 weeks with proper dates
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
    const key = weekStart.toISOString().split('T')[0];

    // Format date for display (e.g., "Nov 1")
    const displayDate = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    weekMap.set(key, {
      week: displayDate,
      'in-progress': 0,
      'completed': 0,
      'needs-revision': 0
    });
  }

  // Count projects by status
  projects.forEach(project => {
    const date = new Date(project.createdAt);
    // Find which week it belongs to
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

/**
 * Get Real-Time KPI Stats
 * GET /api/dashboard/kpi
 */
export const getKpiStats = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId, period = 'month' } = req.query;

    const KpiAggregate = (await import('../models/KpiAggregate.js')).default;
    const ProjectMember = (await import('../models/ProjectMember.js')).default;

    // Determine Role Context
    // If projectId is provided, check user's role in that project
    // If no projectId, we need to decide what to show. 
    // Default strategy: Show aggregate across ALL projects where user is owner, vs client.
    // For MVP, simplistic approach: "Global Owner Stats" vs "Global Client Stats" 
    // But the prompt implies "Contextually aware".

    // Let's implement Global Stats for now, splitting by role.
    const ownerStats = await KpiAggregate.findOne({
      userId,
      role: 'owner',
      projectId: projectId || { $exists: true }, // Filter by project if provided
      periodType: period
    }).sort({ lastUpdatedAt: -1 }); // Get most recent if multiple (shouldn't happen with unique index but good safety)

    const clientStats = await KpiAggregate.findOne({
      userId,
      role: 'client',
      projectId: projectId || { $exists: true },
      periodType: period
    }).sort({ lastUpdatedAt: -1 });

    // Ensure we handle "no data" gracefully
    const response = {
      role: ownerStats ? 'owner' : (clientStats ? 'client' : 'viewer'),
      revenue: ownerStats ? ownerStats.revenueIncoming : 0,
      spent: clientStats ? clientStats.expenseOutgoing : 0,
      invoiceCount: (ownerStats?.invoiceCount || 0) + (clientStats?.invoiceCount || 0), // naive sum
      period
    };

    // If projectId provided, be precise
    if (projectId) {
      const member = await ProjectMember.findOne({ projectId, userId });
      const role = member ? (member.role === 'owner' ? 'owner' : 'client') : 'viewer';

      const projectStats = await KpiAggregate.findOne({
        userId,
        projectId,
        role: role === 'owner' ? 'owner' : 'client',
        periodType: period
      });

      res.json({
        role,
        revenue: role === 'owner' ? (projectStats?.revenueIncoming || 0) : 0,
        spent: role === 'client' ? (projectStats?.expenseOutgoing || 0) : 0,
        invoiceCount: projectStats?.invoiceCount || 0,
        period
      });
      return;
    }

    // Global Aggregate (Summation if not pre-aggregated)
    // If we want global stats across all projects:
    const globalOwner = await KpiAggregate.aggregate([
      { $match: { userId, role: 'owner', periodType: period } },
      { $group: { _id: null, totalRevenue: { $sum: '$revenueIncoming' }, count: { $sum: '$invoiceCount' } } }
    ]);

    const globalClient = await KpiAggregate.aggregate([
      { $match: { userId, role: 'client', periodType: period } },
      { $group: { _id: null, totalSpent: { $sum: '$expenseOutgoing' }, count: { $sum: '$invoiceCount' } } }
    ]);

    res.json({
      revenue: globalOwner[0]?.totalRevenue || 0,
      spent: globalClient[0]?.totalSpent || 0,
      invoiceCount: (globalOwner[0]?.count || 0) + (globalClient[0]?.count || 0),
      period
    });

  } catch (error) {
    console.error('❌ Error fetching KPI stats:', error);
    res.status(500).json({ error: 'Failed to fetch KPI stats' });
  }
};
