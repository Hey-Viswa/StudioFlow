import { Skeleton } from "../ui/skeleton";
import { Card, CardHeader, CardContent } from "../ui/card";

export function ShimmerProjectDetail() {
    return (
        <div className="min-h-screen bg-background">
            {/* Top Header / Breadcrumbs */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center px-4 gap-4">
                    <Skeleton className="h-8 w-8" /> {/* Back Button */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 lg:p-8 max-w-7xl space-y-8">
                {/* Project Header Area */}
                <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                    <div className="space-y-4 flex-1 w-full">
                        <Skeleton className="h-10 w-3/4" />
                        <div className="flex gap-4">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                        <div className="space-y-2 pt-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    </div>
                    <Card className="w-full md:w-80 shrink-0">
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                            <div className="flex -space-x-2 pt-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="space-y-6">
                    <div className="flex gap-2 border-b">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>

                    {/* Content Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Column */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-24 w-full" />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Side Column */}
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
