import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardHeader } from "../ui/card";

export function ShimmerProjects() {
    return (
        <div className="p-4 md:p-8 relative space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-4 border-b pb-1">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col md:flex-row items-center gap-3">
                <Skeleton className="h-10 flex-1 w-full md:max-w-md" />
                <div className="flex gap-3 w-full md:w-auto">
                    <Skeleton className="h-10 w-full md:w-40" />
                    <Skeleton className="h-10 w-full md:w-40" />
                </div>
                <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                </div>
            </div>

            {/* Content Skeleton (Simulating Table Rows) */}
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="border shadow-none">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                            <div className="flex items-center gap-8 hidden md:flex">
                                <div className="flex -space-x-2">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-2 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-8 w-8" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
