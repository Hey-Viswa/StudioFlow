import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";

export function ShimmerInvoices() {
    return (
        <div className="p-4 md:p-8 relative space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
            </div>

            {/* Table */}
            <div className="border rounded-md">
                <div className="h-12 border-b bg-muted/50 px-4 flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-16 border-b px-4 flex items-center gap-4">
                        <Skeleton className="h-4 w-20" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}
