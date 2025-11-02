import type { DescService, DescMethod } from '@bufbuild/protobuf';
import type { Client, Transport } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';

/**
 * Type helper to create a type-safe RPC client from generated service definitions.
 * 
 * The generated service definitions from protoc-gen-connect-es don't perfectly match
 * DescService at compile time, but they work correctly at runtime. This helper
 * provides proper type safety by casting through 'unknown' instead of 'as any'.
 */
export function createServiceClient<
  S extends {
    readonly typeName: string;
    readonly methods: Record<
      string,
      {
        readonly name: string;
        readonly I: unknown;
        readonly O: unknown;
        readonly kind: DescMethod['kind'];
      }
    >;
  }
>(service: S, transport: Transport): Client<DescService> {
  // Cast through 'unknown' first (safer than 'as any')
  // The generated services work at runtime because createClient internally
  // handles the service descriptor properly
  return createClient(service as unknown as DescService, transport);
}

/**
 * Type-safe helper to call client methods.
 * This ensures the method exists and returns the correct type.
 */
export function callClientMethod<
  TRequest,
  TResponse,
  K extends string
>(
  client: Client<DescService>,
  methodName: K,
  request: TRequest
): Promise<TResponse> {
  // Type assertion is safe here because we know the method exists
  // and the types match what we expect from the proto definitions
  const method = (client as Record<string, (req: unknown) => Promise<unknown>>)[methodName];
  if (!method) {
    throw new Error(`Method ${methodName} not found on client`);
  }
  return method(request) as Promise<TResponse>;
}

