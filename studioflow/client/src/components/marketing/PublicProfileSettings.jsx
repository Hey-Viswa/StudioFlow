import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth, useUser } from '@clerk/clerk-react';

const PublicProfileSettings = () => {
    const { getToken } = useAuth();
    const { user } = useUser(); // Get User from Clerk
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    
    useEffect(() => {
        const fetchProfile = async () => {
             try {
                 const data = await api.get('/me/profile', { getToken });
                 if (data && data._id) {
                     setUsername(data.username || '');
                     setDisplayName(data.displayName || '');
                     setBio(data.bio || '');
                     setIsPublic(data.isPublic || false);
                 }
             } catch (error) {
                 console.error('Failed to load profile settings', error);
                 toast.error(`Could not load profile settings: ${error.message}`);
             } finally {
                 setLoading(false);
             }
        };
        fetchProfile();
    }, [getToken]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/me/profile', {
                username,
                displayName,
                bio,
                isPublic,
                avatarUrl: user?.imageUrl // Sync Avatar URL from Clerk
            }, { getToken });
            toast.success('Profile updated');
        } catch (error) {
            console.error('Save error', error);
            toast.error(error.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Creator Profile</CardTitle>
                <CardDescription>
                    Manage how you appear on the public blog and showcase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="flex items-center gap-2">
                         <span className="text-muted-foreground text-sm">studioflow.studio/u/</span>
                         <Input 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            placeholder="yourname"
                            className="max-w-xs" 
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">Unique URL for your profile.</p>
                </div>

                <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)} 
                        placeholder="Your Name"
                        className="max-w-md" 
                    />
                </div>

                <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea 
                        value={bio} 
                        onChange={e => setBio(e.target.value)} 
                        placeholder="Tell your story in 160 characters..."
                        maxLength={160}
                        className="max-w-md" 
                    />
                    <p className="text-xs text-muted-foreground text-right max-w-md">{bio.length}/160</p>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/10 max-w-md">
                    <div className="space-y-0.5">
                        <Label className="text-base">Public Visibility</Label>
                        <p className="text-sm text-muted-foreground">
                            Enable your public profile page.
                        </p>
                    </div>
                    <Switch 
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                    />
                </div>

                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>

            </CardContent>
        </Card>
    );
};

export default PublicProfileSettings;
