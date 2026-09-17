import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[1500px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-md" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    </main>
  );
}
