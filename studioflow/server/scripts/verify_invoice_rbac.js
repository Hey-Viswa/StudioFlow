
import mongoose from 'mongoose';
import { getProjectInvoices, getAllUserInvoices } from '../src/controllers/projectInvoiceController.js';
import Project from '../src/models/Project.js';
import ProjectMember from '../src/models/ProjectMember.js';
import ProjectInvoice from '../src/models/ProjectInvoice.js';

// Mock Express objects
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// Mock Data
const MOCK_PROJECT_ID = 'proj_123';
const OWNER_ID = 'owner_1';
const CLIENT_A_ID = 'client_a';
const CLIENT_B_ID = 'client_b';

// Mock Mongoose
Project.findById = async (id) => ({
  _id: id,
  ownerId: OWNER_ID,
  isOwner: (uid) => String(uid) === String(OWNER_ID)
});

Project.find = async (query) => {
    // For getAllUserInvoices
    if (query.ownerId === OWNER_ID) return [{ _id: MOCK_PROJECT_ID }];
    return [];
};

ProjectMember.findOne = async ({ projectId, userId }) => {
  if (userId === CLIENT_A_ID) return { role: 'client', status: 'active' };
  if (userId === CLIENT_B_ID) return { role: 'client', status: 'active' };
  return null;
};

ProjectMember.find = async ({ userId }) => {
    return []; // Assume no team memberships for simplicity
};

ProjectInvoice.find = (query) => {
  return {
    sort: () => ({
      select: () => {
        // Return the query so we can inspect it
        return { queryUsed: query };
      },
      skip: () => ({
          limit: () => ({
              populate: () => ({
                  lean: async () => []
              })
          })
      })
    }),
    countDocuments: async () => 0
  };
};

const runTests = async () => {
  console.log('🧪 Verifying Invoice RBAC...');

  // Test 1: Owner fetching project invoices
  console.log('\n1. Owner fetching project invoices:');
  const ownerReq = { params: { projectId: MOCK_PROJECT_ID }, userId: OWNER_ID };
  const ownerRes = mockRes();
  
  await getProjectInvoices(ownerReq, ownerRes);
  const ownerQuery = ownerRes.data.invoices.queryUsed;
  console.log('   Query:', JSON.stringify(ownerQuery));
  
  if (ownerQuery.projectId === MOCK_PROJECT_ID && !ownerQuery['client.userId']) {
    console.log('✅ Owner sees ALL invoices (Correct)');
  } else {
    console.error('❌ Owner query incorrect');
  }

  // Test 2: Client A fetching project invoices
  console.log('\n2. Client A fetching project invoices:');
  const clientAReq = { params: { projectId: MOCK_PROJECT_ID }, userId: CLIENT_A_ID };
  const clientARes = mockRes();

  await getProjectInvoices(clientAReq, clientARes);
  const clientAQuery = clientARes.data.invoices.queryUsed;
  console.log('   Query:', JSON.stringify(clientAQuery));

  if (clientAQuery['client.userId'] === CLIENT_A_ID) {
    console.log('✅ Client A restricted to own invoices (Correct)');
  } else {
    console.error('❌ Client A sees ALL invoices (Leakage!)');
  }

  // Test 3: Client B fetching project invoices
  console.log('\n3. Client B fetching project invoices:');
  const clientBReq = { params: { projectId: MOCK_PROJECT_ID }, userId: CLIENT_B_ID };
  const clientBRes = mockRes();

  await getProjectInvoices(clientBReq, clientBRes);
  const clientBQuery = clientBRes.data.invoices.queryUsed;
  console.log('   Query:', JSON.stringify(clientBQuery));

  if (clientBQuery['client.userId'] === CLIENT_B_ID) {
    console.log('✅ Client B restricted to own invoices (Correct)');
  } else {
    console.error('❌ Client B sees ALL invoices (Leakage!)');
  }
  
  // Test 4: Client A fetching ALL invoices (Dashboard)
  console.log('\n4. Client A fetching ALL invoices (Dashboard):');
  const dashboardReq = { userId: CLIENT_A_ID, query: {} };
  const dashboardRes = mockRes();
  
  // Mock ProjectInvoice.find for getAllUserInvoices structure
  ProjectInvoice.find = (query) => ({
      sort: () => ({
          skip: () => ({
              limit: () => ({
                  populate: () => ({
                      lean: async () => {
                          console.log('   Query:', JSON.stringify(query));
                          // Check if query restricts to client.userId
                          const orClause = query.$or;
                          const clientRestriction = orClause.find(c => c['client.userId'] === CLIENT_A_ID);
                          const projectRestriction = orClause.find(c => c.projectId);
                          
                          // In this mock, client A has NO privileged projects.
                          // So projectRestriction should be empty or match empty list.
                          
                          if (clientRestriction && (!projectRestriction || projectRestriction.projectId.$in.length === 0)) {
                              console.log('✅ Dashboard query restricted to own invoices (Correct)');
                          } else {
                              console.log('❌ Dashboard query might be leaking:', JSON.stringify(query));
                          }
                          return [];
                      }
                  })
              })
          })
      }),
      countDocuments: async () => 0
  });

  await getAllUserInvoices(dashboardReq, dashboardRes);

};

runTests();
