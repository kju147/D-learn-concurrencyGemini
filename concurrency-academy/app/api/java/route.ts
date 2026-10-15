import { env } from 'cloudflare:workers';
import { handleJavaRequest } from '@/lib/java-runner-proxy.mjs';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return handleJavaRequest(request, env);
}

export function POST(request: Request) {
  return handleJavaRequest(request, env);
}
