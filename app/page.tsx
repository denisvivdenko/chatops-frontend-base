import AppLayout from '@/app/components/layout/AppLayout/AppLayout';

export const dynamic = 'force-dynamic';

export default function Page() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  return <AppLayout backendUrl={backendUrl} />;
}
