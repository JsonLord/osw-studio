/**
 * Hugging Face Space Logs Proxy API
 *
 * GET - Streams build and run logs from Hugging Face via SSE
 */

import { logger } from '@/lib/utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  const { id: deploymentId } = await params;
  const repoId = request.nextUrl.searchParams.get('repoId');
  const token = request.nextUrl.searchParams.get('token');

  if (!repoId || !token) {
    return new Response('Missing repoId or token', { status: 400 });
  }

  const buildLogsUrl = `https://huggingface.co/api/spaces/${repoId}/logs/build`;
  const runLogsUrl = `https://huggingface.co/api/spaces/${repoId}/logs/run`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const abortController = new AbortController();
      request.signal.addEventListener('abort', () => abortController.abort());

      const proxyLogStream = async (url: string, type: 'build' | 'run') => {
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'text/event-stream',
            },
            signal: abortController.signal,
          });

          if (!response.ok) {
            const errText = await response.text();
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ type, message: `HF API error: ${response.status} ${errText}` })}\n\n`));
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) return;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Forward the SSE chunk directly
            controller.enqueue(value);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          logger.error(`[HF Logs Proxy] Error streaming ${type} logs:`, err);
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ type, message: err.message })}\n\n`));
        }
      };

      // Start with build logs, then run logs
      await proxyLogStream(buildLogsUrl, 'build');

      // Only stream run logs if the build finished (or we can stream both in parallel if needed,
      // but usually build comes first)
      await proxyLogStream(runLogsUrl, 'run');

      try { controller.close(); } catch { /* ignore */ }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
