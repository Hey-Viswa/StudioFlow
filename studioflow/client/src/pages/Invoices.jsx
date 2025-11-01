import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Plus } from 'lucide-react';

export default function Invoices() {
  const invoices = [
    { id: 'INV-1045', project: 'Product Promo Reel', client: 'Nimbus Co.', status: 'Paid', issued: 'Aug 20', due: 'Sep 05', amount: '$3,200' },
    { id: 'INV-1046', project: 'Wedding Highlights', client: 'Carter Family', status: 'Pending', issued: 'Sep 01', due: 'Sep 15', amount: '$2,850' },
    { id: 'INV-1047', project: 'Music Video Cut', client: 'Neon Wave', status: 'Overdue', issued: 'Aug 10', due: 'Aug 25', amount: '$1,200' },
    { id: 'INV-1048', project: 'Corporate Interviews', client: 'Acme Ltd.', status: 'Pending', issued: 'Sep 06', due: 'Sep 20', amount: '$1,900' },
    { id: 'INV-1049', project: 'Brand Sizzle Reel', client: 'Nimbus Co.', status: 'Paid', issued: 'Aug 02', due: 'Aug 16', amount: '$4,150' },
    { id: 'INV-1050', project: 'Event Recap', client: 'Harbor Fest', status: 'Pending', issued: 'Sep 10', due: 'Sep 24', amount: '$950' },
  ];

  const statusConfig = {
    'Paid': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Overdue': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Invoices</h1>
          <p className="text-gray-400"><span className="text-white font-medium">12</span> total</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Create New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#1e293b] border-[#334155]">
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-2">Total Billed</p>
            <p className="text-3xl font-bold text-white mb-1">$24,300</p>
            <p className="text-xs text-gray-500">Across 12 invoices</p>
          </div>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-2">Paid</p>
            <p className="text-3xl font-bold text-white mb-1">$18,900</p>
            <p className="text-xs text-gray-500">9 invoices</p>
          </div>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-2">Outstanding</p>
            <p className="text-3xl font-bold text-white mb-1">$5,100</p>
            <p className="text-xs text-gray-500">3 invoices</p>
          </div>
        </Card>
        <Card className="bg-[#1e293b] border-[#334155]">
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-2">Overdue</p>
            <p className="text-3xl font-bold text-red-400 mb-1">$1,200</p>
            <p className="text-xs text-gray-500">1 invoice</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input placeholder="Search invoices" className="pl-10 bg-[#1e293b] border-[#334155] text-white placeholder:text-gray-500" />
        </div>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">Status</Button>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">Client</Button>
        <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300 hover:bg-[#334155] hover:text-white">Date range</Button>
      </div>

      <div className="bg-[#0f1420] border border-[#1e293b] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1e293b]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Issued</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-[#1e293b]/50 cursor-pointer transition-colors">
                <td className="px-6 py-4 text-sm text-white font-medium">{invoice.id}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{invoice.project}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{invoice.client}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className={statusConfig[invoice.status]}>{invoice.status}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{invoice.issued}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{invoice.due}</td>
                <td className="px-6 py-4 text-sm text-white font-semibold">{invoice.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-400">Showing 1–6 of 12</p>
        <div className="flex items-center gap-2">
          <Button className="bg-primary hover:bg-primary/90 text-sm px-4 py-2">Export CSV</Button>
          <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300">Previous</Button>
          <Button variant="outline" className="bg-[#1e293b] border-[#334155] text-gray-300">Next</Button>
        </div>
      </div>
    </div>
  );
}
