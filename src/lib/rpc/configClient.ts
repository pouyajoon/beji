import { createClient } from '@connectrpc/connect';
import type { DescService } from '@bufbuild/protobuf';
import { ConfigService } from '../../proto/config/v1/config_connect';
import { GetPublicConfigRequest, GetPublicConfigResponse } from '../../proto/config/v1/config_pb';
import { transport } from './transport';

const client = createClient(ConfigService as unknown as DescService, transport);

export async function getPublicConfig(): Promise<GetPublicConfigResponse> {
  const request = new GetPublicConfigRequest({});
  
  // Type assertion is safe here - we know getPublicConfig exists and returns GetPublicConfigResponse
  const method = (client as Record<string, (req: GetPublicConfigRequest) => Promise<GetPublicConfigResponse>>).getPublicConfig;
  if (!method) {
    throw new Error('getPublicConfig method not found on ConfigService client');
  }
  
  return await method(request);
}
