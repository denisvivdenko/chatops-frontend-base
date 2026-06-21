export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> },
) {
  const { chatId, messageId } = await params;

  const upstream = await fetch(
    `http://localhost:8000/chats/${chatId}/messages/${messageId}/stream`,
    { cache: 'no-store', headers: { Accept: 'text/event-stream' } },
  );

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
