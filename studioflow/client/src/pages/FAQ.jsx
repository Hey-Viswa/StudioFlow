import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Search,
    CreditCard,
    User,
    Shield,
    Zap,
    Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';

const FAQ_CATEGORIES = [
    {
        id: 'general',
        title: 'General',
        icon: HelpCircle,
        questions: [
            {
                q: "What is StudioFlow?",
                a: "StudioFlow is a comprehensive project management tool designed specifically for creative agencies and freelancers to manage clients, projects, and billing in one place."
            },
            {
                q: "Is there a free trial?",
                a: "Yes! We offer a Starter plan that is free forever for up to 5 projects. We also offer a 14-day free trial for our Pro and Studio plans."
            }
        ]
    },
    {
        id: 'billing',
        title: 'Billing & Subscriptions',
        icon: CreditCard,
        questions: [
            {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, UPI, and net banking via Razorpay."
            },
            {
                q: "Can I cancel my subscription anytime?",
                a: "Yes, you can cancel your subscription at any time from your account settings. You will retain access until the end of your current billing period."
            },
            {
                q: "Do you offer refunds?",
                a: "We offer a 7-day money-back guarantee for new subscribers. If you're not satisfied, contact us within 7 days for a full refund."
            }
        ]
    },
    {
        id: 'account',
        title: 'Account & Security',
        icon: Shield,
        questions: [
            {
                q: "How secure is my data?",
                a: "We use industry-standard encryption and security practices. Payments are processed securely by Razorpay, and we never store your card details."
            },
            {
                q: "Can I invite my team?",
                a: "Yes! Depending on your plan, you can invite team members to collaborate on projects. The Studio plan supports unlimited team members."
            }
        ]
    }
];

export default function FAQ() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [openItems, setOpenItems] = useState({});

    useEffect(() => {
        document.title = 'FAQ - StudioFlow';
    }, []);

    const toggleItem = (categoryIndex, questionIndex) => {
        const key = `${categoryIndex}-${questionIndex}`;
        setOpenItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const filteredCategories = FAQ_CATEGORIES.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/')}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                        <div className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <h1 className="text-xl font-semibold">Help Center</h1>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/contact-us')}>
                        <Mail className="mr-2 h-4 w-4" />
                        Contact Support
                    </Button>
                </div>
            </header>

            <div className="container mx-auto max-w-4xl py-12 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
                    <p className="text-muted-foreground mb-8">Search our knowledge base or browse categories below</p>

                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search help articles..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-12">
                    {filteredCategories.map((category, catIdx) => (
                        <div key={category.id} className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <category.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="text-2xl font-semibold">{category.title}</h2>
                            </div>

                            <div className="grid gap-4">
                                {category.questions.map((item, qIdx) => {
                                    const isOpen = openItems[`${catIdx}-${qIdx}`];
                                    return (
                                        <Card
                                            key={qIdx}
                                            className="cursor-pointer transition-all hover:border-primary/50"
                                            onClick={() => toggleItem(catIdx, qIdx)}
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between gap-4">
                                                    <h3 className="font-medium text-lg leading-none">{item.q}</h3>
                                                    {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                                                </div>
                                                {isOpen && (
                                                    <div className="mt-4 pt-4 border-t text-muted-foreground leading-relaxed animate-in slide-in-from-top-2">
                                                        {item.a}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {filteredCategories.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No matching results found.</p>
                            <Button variant="link" onClick={() => setSearchQuery('')}>Clear search</Button>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center bg-muted/30 rounded-2xl p-12 border">
                    <h3 className="text-2xl font-semibold mb-4">Still need help?</h3>
                    <p className="text-muted-foreground mb-6">Our support team is just a click away.</p>
                    <Button size="lg" onClick={() => navigate('/contact-us')}>
                        Contact Support
                    </Button>
                </div>
            </div>
        </div>
    );
}
