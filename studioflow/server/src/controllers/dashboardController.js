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
    
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const outstanding = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const overdue = invoices.filter(inv => {
      return inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid';
    }).reduce((sum, inv) => sum + (inv.total || 0), 0);

    res.status(200).json({
      metrics: {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalBilled,
        totalPaid,
        outstanding,
        overdue
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
      { status: 'sent', count: invoices.filter(i => i.status === 'sent').length },
      { status: 'paid', count: invoices.filter(i => i.status === 'paid').length },
      { status: 'overdue', count: invoices.filter(i => {
        return i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'paid';
      }).length }
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
  
  invoices.forEach(invoice => {
    if (invoice.status !== 'paid') return;
    
    const date = new Date(invoice.paidDate || invoice.createdAt);
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
    
    const current = dataMap.get(key) || 0;
    dataMap.set(key, current + (invoice.total || 0));
  });
  
  return Array.from(dataMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

// Helper function to generate project progress data
function generateProjectProgressData(projects) {
  const weekMap = new Map();
  const now = new Date();
  
  // Generate last 8 weeks
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
    const key = weekStart.toISOString().split('T')[0];
    weekMap.set(key, {
      week: `Week ${8 - i}`,
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
      if (date >= weekDate && date < new Date(weekDate.getTime() + 7 * 24 * 60 * 60 * 1000)) {
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
