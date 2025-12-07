import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
    Users,
    Trash2,
    Crown,
    Share2,
    Copy,
    CheckCircle2,
    Mail,
    Loader2
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';

export default function TeamTab({
    project,
    members,
    isOwner,
    onGenerateInvite,
    onRemoveMember,
    inviteLink,
    generatingInvite,
    copied,
    setCopied
}) {
    const [inviteRole, setInviteRole] = useState('client');

    const copyToClipboard = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Invite Section (Owner Only) */}
            {isOwner && (
                <Card className="bg-muted/10 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary" />
                            Invite New Member
                        </CardTitle>
                        <CardDescription>
                            Generate a secure link to invite clients or team members to this project.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <Label>Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="client">Client (Restricted Access)</SelectItem>
                                        <SelectItem value="team_member">Team Member (Collaborator)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() => onGenerateInvite(inviteRole)}
                                    className="w-full sm:w-auto"
                                    disabled={generatingInvite}
                                >
                                    {generatingInvite ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Link'
                                    )}
                                </Button>
                            </div>
                        </div>

                        {inviteLink && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg border space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Invite Link</Label>
                                <div className="flex gap-2">
                                    <Input value={inviteLink} readOnly className="font-mono text-xs" />
                                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                        {copied ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Share this link with {inviteRole === 'client' ? 'clients' : 'team members'} to give them access.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Member List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Project Members ({members.length + (project.ownerId ? 1 : 0)})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="divide-y rounded-md border">
                        {/* Owner Row */}
                        {project.owner && (
                            <div className="flex items-center justify-between p-4 bg-yellow-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {project.owner.name?.[0] || project.owner.email?.[0] || 'O'}
                                    </div>
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            {project.owner.name || 'Project Owner'}
                                            <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                                <Crown className="w-3 h-3 mr-1" /> Owner
                                            </Badge>
                                        </p>
                                        <p className="text-sm text-muted-foreground">{project.owner.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Members Rows */}
                        {members.map((member) => (
                            <div key={member.userId} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground border">
                                        {member.user?.name?.[0] || member.user?.email?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            {member.user?.name || 'Unknown User'}
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {member.role?.replace('_', ' ')}
                                            </Badge>
                                        </p>
                                        <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                                    </div>
                                </div>

                                {isOwner && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemoveMember(member.userId)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {members.length === 0 && !project.owner && (
                            <div className="p-8 text-center text-muted-foreground">
                                No members found.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
