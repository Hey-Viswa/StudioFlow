import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { getBillingConfig, updateBillingConfig } from '../../api/billingApi';

export default function BillingSettings({ projectId }) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        hourlyRate: 0,
        features: {
            hourlyBilling: false,
            autoDiscounts: false
        },
        discounts: []
    });

    useEffect(() => {
        fetchConfig();
    }, [projectId]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await getBillingConfig(projectId, getToken);
            if (response && response.config) {
                const data = response.config;
                // Ensure structure exists even if DB returns partial
                setConfig({
                    hourlyRate: data.hourlyRate || 0,
                    features: {
                        hourlyBilling: data.features?.hourlyBilling || false,
                        autoDiscounts: data.features?.autoDiscounts || false
                    },
                    discounts: data.discounts || []
                });
            }
        } catch (error) {
            console.error('Failed to load billing config:', error);
            if (error.response?.status === 404) {
                toast.error('Advanced Billing is currently disabled on the server.');
            } else {
                toast.error('Failed to load billing settings');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await updateBillingConfig(projectId, config, getToken);

            if (response.success) {
                toast.success('Billing settings saved successfully');
                if (response.config) {
                    setConfig(response.config);
                }
            } else {
                // Assuming the API returns { success: false, error: "Some error message" }
                toast.error(response.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save billing config:', error);
            if (error.response?.status === 404) {
                toast.error('Advanced Billing is disabled. Please check ENABLE_ADVANCED_BILLING env var and restart server.');
            } else {
                toast.error(error.response?.data?.error || 'Failed to save settings');
            }
        } finally {
            setSaving(false);
        }
    };

    const addDiscount = () => {
        setConfig(prev => ({
            ...prev,
            discounts: [...prev.discounts, { code: '', type: 'percentage', value: 0, active: true }]
        }));
    };

    const removeDiscount = (index) => {
        setConfig(prev => ({
            ...prev,
            discounts: prev.discounts.filter((_, i) => i !== index)
        }));
    };

    const updateDiscount = (index, field, value) => {
        setConfig(prev => ({
            ...prev,
            discounts: prev.discounts.map((d, i) => i === index ? { ...d, [field]: value } : d)
        }));
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Billing Configuration</CardTitle>
                    <CardDescription>Configure how you charge for this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Hourly Billing Section */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Hourly Billing</Label>
                            <p className="text-sm text-muted-foreground">Enable time tracking and hourly rates for this project.</p>
                        </div>
                        <Switch
                            checked={config.features.hourlyBilling}
                            onCheckedChange={(checked) => setConfig(prev => ({
                                ...prev,
                                features: { ...prev.features, hourlyBilling: checked }
                            }))}
                        />
                    </div>

                    {config.features.hourlyBilling && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Default Hourly Rate (₹)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={config.hourlyRate.toString()}
                                onChange={(e) => setConfig(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                                className="max-w-xs"
                            />
                        </div>
                    )}

                    <Separator />

                    {/* Discounts Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Automatic Discounts</Label>
                                <p className="text-sm text-muted-foreground">Configure rules for automatically applying discounts.</p>
                            </div>
                            <Switch
                                checked={config.features.autoDiscounts}
                                onCheckedChange={(checked) => setConfig(prev => ({
                                    ...prev,
                                    features: { ...prev.features, autoDiscounts: checked }
                                }))}
                            />
                        </div>

                        {config.features.autoDiscounts && (
                            <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="text-sm font-medium">Discount Rules</Label>
                                    <Button variant="outline" size="sm" onClick={addDiscount}>
                                        <Plus className="w-3 h-3 mr-1" /> Add Rule
                                    </Button>
                                </div>

                                {config.discounts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No discount rules configured.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {config.discounts.map((discount, index) => (
                                            <div key={index} className="flex gap-2 items-start bg-background p-2 rounded border">
                                                <div className="flex-1 space-y-2">
                                                    <Input
                                                        placeholder="Code (e.g. LOYALTY)"
                                                        value={discount.code}
                                                        onChange={(e) => updateDiscount(index, 'code', e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="w-24 space-y-2">
                                                    <Select
                                                        value={discount.type}
                                                        onValueChange={(val) => updateDiscount(index, 'type', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="percentage">% Off</SelectItem>
                                                            <SelectItem value="fixed">Fixed</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-20 space-y-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Val"
                                                        value={discount.value}
                                                        onChange={(e) => updateDiscount(index, 'value', parseFloat(e.target.value))}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="pt-1">
                                                    <Switch
                                                        checked={discount.active}
                                                        onCheckedChange={(checked) => updateDiscount(index, 'active', checked)}
                                                        className="scale-75"
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeDiscount(index)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Configuration
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
