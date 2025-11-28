import { Skeleton } from "./ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-6 space-y-6">
                {/* Breadcrumbs Skeleton */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                </div>

                {/* Header Skeleton */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>

                {/* KPI Cards Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search and Filters Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <Skeleton className="h-10 flex-1" />
                            <Skeleton className="h-10 w-full md:w-[180px]" />
                            <Skeleton className="h-10 w-full md:w-[180px]" />
                            <Skeleton className="h-10 w-full md:w-[180px]" />
                        </div>

                        {/* Project Cards Grid Skeleton */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(6)].map((_, i) => (
                                <Card key={i} className="h-[280px]">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between gap-2">
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-5 w-3/4" />
                                                <Skeleton className="h-4 w-full" />
                                            </div>
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Skeleton className="h-5 w-16" />
                                            <Skeleton className="h-5 w-16" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-3 w-8" />
                                            </div>
                                            <Skeleton className="h-2 w-full" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                                            <div className="space-y-1">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-4 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-4 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-4 w-8" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
