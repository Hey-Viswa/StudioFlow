import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from './ui/dropdown-menu';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from './ui/breadcrumb';
import {
    ArrowLeft,
    MoreVertical,
    Users,
    Settings,
    Share2,
    Archive,
    Trash2,
    Crown,
    CheckCircle,
    RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProjectHeader({
    project,
    userRole,
    onInvite,
    onEdit,
    onTransferOwnership,
    onApproveFinal,
    onRequestRevision
}) {
    const navigate = useNavigate();
    const isOwner = userRole === 'owner';

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'archived': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="space-y-4">
            {/* Breadcrumbs */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                            Dashboard
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard/projects">Projects</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{project.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Main Header Row */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard/projects')}
                        className="h-8 w-8 -ml-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
                            <Badge variant="outline" className={cn("capitalize px-2 py-0.5", getStatusColor(project.status))}>
                                {project.status}
                            </Badge>
                            {isOwner && (
                                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                                    <Crown className="w-3 h-3 text-yellow-500/80" />
                                    Owner
                                </Badge>
                            )}
                        </div>
                        {(project.client?.name || project.client?.email) && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                Client: {project.client.name || project.client.email}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {onApproveFinal && (
                        <Button onClick={onApproveFinal} size="sm" className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Final
                        </Button>
                    )}
                    {onRequestRevision && (
                        <Button onClick={onRequestRevision} variant="outline" size="sm" className="hidden sm:flex border-orange-500/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Request Revision
                        </Button>
                    )}
                    {isOwner && (
                        <Button onClick={onInvite} size="sm" className="hidden sm:flex">
                            <Share2 className="w-4 h-4 mr-2" />
                            Invite
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/projects/${project._id}?tab=team`)}>
                                <Users className="w-4 h-4 mr-2" />
                                Team Members
                            </DropdownMenuItem>
                            {isOwner && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onEdit}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Project Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onTransferOwnership}>
                                        <Crown className="w-4 h-4 mr-2" />
                                        Transfer Ownership
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archive Project
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
