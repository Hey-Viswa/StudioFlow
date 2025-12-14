import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import {
    Play,
    Square,
    Plus,
    Trash2,
    Clock,
    FileText,
    MoreVertical,
    Calendar as CalendarIcon,
    DollarSign,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    createTimeEntry,
    getTimeEntries,
    deleteTimeEntry,
    getProjectEarnings
} from '../api/billingApi';
import { formatINR } from '../utils/currency';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";

export default function TimeTrackingTab({ projectId, userRole }) {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState([]);
    const [earnings, setEarnings] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null); // State for delete dialog

    // New Entry Form State
    const [newEntry, setNewEntry] = useState({
        description: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        minutes: '',
        billable: true
    });

    const isClient = userRole === 'client';

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [entriesData, earningsData] = await Promise.all([
                getTimeEntries(projectId, getToken),
                !isClient ? getProjectEarnings(projectId, getToken) : Promise.resolve(null)
            ]);

            // Handle response structure from controller
            setEntries(entriesData.timeEntries || []);
            setEarnings(earningsData);
        } catch (error) {
            console.error('Failed to fetch time tracking data:', error);
            if (error.response && error.response.status === 404) {
                // Feature flag is likely off
                toast.error('Advanced billing is not enabled for this project');
            } else {
                toast.error('Failed to load time entries');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        if (!newEntry.description || (!newEntry.hours && !newEntry.minutes)) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            setSubmitting(true);

            const durationMinutes = (parseInt(newEntry.hours || 0) * 60) + parseInt(newEntry.minutes || 0);

            // Construct start/end times based on date (approximate for manual entry)
            const startTime = new Date(newEntry.date);
            startTime.setHours(9, 0, 0, 0); // Default to 9 AM
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            await createTimeEntry(projectId, {
                description: newEntry.description,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                billable: newEntry.billable
            }, getToken);

            toast.success('Time entry added successfully');
            setShowAddModal(false);
            setNewEntry({
                description: '',
                date: new Date().toISOString().split('T')[0],
                hours: '',
                minutes: '',
                billable: true
            });
            fetchData();
        } catch (error) {
            console.error('Failed to add time entry:', error);
            toast.error(error.message || 'Failed to add time entry');
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = (entryId) => {
        setDeleteId(entryId);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteTimeEntry(projectId, deleteId, getToken);
            toast.success('Time entry deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete time entry');
        } finally {
            setDeleteId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading time data...</div>;
    }

    // Calculate totals for display
    const totalUnbilledMinutes = entries
        .filter(e => e.status === 'pending' && e.billable)
        .reduce((sum, e) => sum + e.durationMinutes, 0);

    const totalUnbilledHours = Math.floor(totalUnbilledMinutes / 60);
    const totalUnbilledMinsRemainder = totalUnbilledMinutes % 60;

    return (
        <div className="space-y-6">
            {/* Earnings Overview (Owner Only) */}
            {!isClient && earnings && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatINR(earnings.totalBilled + (earnings.unbilledAmount || 0))}</div>
                            <p className="text-xs text-muted-foreground">Lifetime project value</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unbilled Hours</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.floor((earnings.unbilledMinutes || 0) / 60)}h {(earnings.unbilledMinutes || 0) % 60}m</div>
                            <p className="text-xs text-muted-foreground">
                                Est. {formatINR(earnings.unbilledAmount || 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Hourly Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatINR(earnings.hourlyRate || 0)}/hr</div>
                            <p className="text-xs text-muted-foreground">Based on current config</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Time Entries List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Time Sheet</CardTitle>
                        <CardDescription>Tracked hours for this project.</CardDescription>
                    </div>
                    {!isClient && (
                        <Button onClick={() => setShowAddModal(true)} size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Log Time
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {entries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No time entries recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {entries.map((entry) => (
                                <div key={entry._id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {entry.status === 'invoiced' ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-blue-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{entry.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span>{format(new Date(entry.startTime), 'MMM d, yyyy')}</span>
                                                <span>•</span>
                                                <span>{Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m</span>
                                                {!entry.billable && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">Non-Billable</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <Badge variant={entry.status === 'invoiced' ? 'default' : 'secondary'}>
                                                {entry.status}
                                            </Badge>
                                        </div>

                                        {!isClient && entry.status !== 'invoiced' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-destructive" onClick={() => confirmDelete(entry._id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                {/* Footer Summary */}
                <div className="p-4 bg-muted/30 border-t rounded-b-lg flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pending Billable Time:</span>
                    <span className="font-bold font-mono">{totalUnbilledHours}h {totalUnbilledMinsRemainder}m</span>
                </div>
            </Card>

            {/* Add Time Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Time</DialogTitle>
                        <DialogDescription>Add a manual time entry for this project.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddEntry} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                placeholder="What did you work on?"
                                value={newEntry.description}
                                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={newEntry.date}
                                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Billable</Label>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="billable"
                                        checked={newEntry.billable}
                                        onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="billable" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Billable Hours
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Hours</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={newEntry.hours}
                                    onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Minutes</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    placeholder="0"
                                    value={newEntry.minutes}
                                    onChange={(e) => setNewEntry({ ...newEntry, minutes: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : 'Add Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             {/* Delete Confirmation Alert */}
             <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this time entry.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function CheckCircle2({ className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}
