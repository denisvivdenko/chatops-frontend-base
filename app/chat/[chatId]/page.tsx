import ChatProvider from '@/app/context/ChatProvider';
import AppShell from '@/app/components/layout/AppShell/AppShell';

export const dynamic = 'force-dynamic';

export default function Page() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  return (
    <ChatProvider backendUrl={backendUrl}>
      <AppShell />
    </ChatProvider>
  );
}
