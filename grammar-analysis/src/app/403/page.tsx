import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md w-full">
        <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Forbidden</h2>
        <p className="text-gray-600 mb-6">
          You do not have the required permissions to view this page.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
