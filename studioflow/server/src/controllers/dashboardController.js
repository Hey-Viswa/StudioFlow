import Project from '../models/Project.js';
import ProjectInvoice from '../models/ProjectInvoice.js';
import ProjectFile from '../models/ProjectFile.js';

/**
 * Get dashboard metrics
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all active (non-deleted) projects user has access to
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Only active projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    });

    const projectIds = projects.map(p => p._id);

    // Get invoice stats for active projects only
    const invoices = await ProjectInvoice.find({ projectId: { $in: projectIds } });

    // Helper to calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Date ranges for trends (This Month vs Last Month)
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate Totals (All Time)
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Outstanding: Pending invoices (sent but not yet paid)
    const outstanding = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Overdue: Status is 'overdue' OR (pending AND due date passed)
    const overdue = invoices.filter(inv => {
      const isOverdueStatus = inv.status === 'overdue';
      const isPendingAndLate = inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) < new Date();
      return isOverdueStatus || isPendingAndLate;
    }).reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate Trends (This Month vs Last Month)
    // 1. Billed Trend
    const billedThisMonth = invoices
      .filter(inv => new Date(inv.createdAt) >= startOfCurrentMonth)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const billedLastMonth = invoices
      .filter(inv => new Date(inv.createdAt) >= startOfLastMonth && new Date(inv.createdAt) <= endOfLastMonth)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalBilledChange = calculateChange(billedThisMonth, billedLastMonth);

    // 2. Paid Trend
    const paidThisMonth = invoices
      .filter(inv => inv.status === 'paid' && new Date(inv.paidAt || inv.updatedAt) >= startOfCurrentMonth)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidLastMonth = invoices
      .filter(inv => inv.status === 'paid' && new Date(inv.paidAt || inv.updatedAt) >= startOfLastMonth && new Date(inv.paidAt || inv.updatedAt) <= endOfLastMonth)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaidChange = calculateChange(paidThisMonth, paidLastMonth);

    // 3. Overdue Trend (New overdue invoices this month vs last month)
    const overdueThisMonth = invoices
      .filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return dueDate >= startOfCurrentMonth && dueDate < now && inv.status !== 'paid';
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const overdueLastMonth = invoices
      .filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return dueDate >= startOfLastMonth && dueDate <= endOfLastMonth && inv.status !== 'paid';
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const overdueChange = calculateChange(overdueThisMonth, overdueLastMonth);

    res.status(200).json({
      metrics: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalBilled,
        totalBilledChange,
        totalPaid,
        totalPaidChange,
        outstanding,
        overdue,
        overdueChange
      }
    });
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
    const limit = parseInt(req.query.limit) || 10;

    // Get active projects user has access to
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Only active projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Get recent files from active projects only
    const files = await ProjectFile.find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ files });
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
    const limit = parseInt(req.query.limit) || 10;

    // Get active projects user has access to
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Only active projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    }).select('_id title');

    const projectIds = projects.map(p => p._id);
    const projectMap = Object.fromEntries(projects.map(p => [p._id.toString(), p.title]));

    // Get recent invoices from active projects only
    const invoices = await ProjectInvoice.find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Enrich with project titles
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
    const { granularity = 'monthly' } = req.query;

    // Get active projects user has access to
    const projects = await Project.find({
      $and: [
        { deletedAt: null }, // Only active projects
        {
          $or: [
            { ownerId: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    });

    const projectIds = projects.map(p => p._id);

    // Get invoices for revenue chart
    const invoices = await ProjectInvoice.find({ projectId: { $in: projectIds } })
      .sort({ createdAt: 1 })
      .lean();

    // Generate revenue data based on granularity
    const revenueData = generateRevenueData(invoices, granularity);

    // Invoice status distribution
    const invoiceStatusData = [
      { status: 'draft', count: invoices.filter(i => i.status === 'draft').length },
      { status: 'sent', count: invoices.filter(i => i.status === 'pending').length }, // Map pending to sent
      { status: 'paid', count: invoices.filter(i => i.status === 'paid').length },
      { status: 'overdue', count: invoices.filter(i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate && new Date(i.dueDate) < new Date())).length },
      { status: 'cancelled', count: invoices.filter(i => i.status === 'cancelled').length },
      { status: 'failed', count: invoices.filter(i => i.status === 'failed').length }
    ];

    // Project progress by week
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

// Helper function to generate revenue data
function generateRevenueData(invoices, granularity) {
  const dataMap = new Map();
  const now = new Date();

  // Initialize map with 0 for all periods
  if (granularity === 'daily') {
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dataMap.set(key, 0);
    }
  } else if (granularity === 'weekly') {
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      const key = weekStart.toISOString().split('T')[0];
      dataMap.set(key, 0);
    }
  } else {
    // Last 6 months (default)
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
