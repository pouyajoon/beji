import { createClient } from '@connectrpc/connect';
import { ConfigService } from '../../proto/config/v1/config_connect';
import { GetPublicConfigRequest, GetPublicConfigResponse } from '../../proto/config/v1/config_pb';
import { transport } from './transport';

const client = createClient(ConfigService, transport);

export async function getPublicConfig(): Promise<GetPublicConfigResponse> {
  const request = new GetPublicConfigRequest({});
  
  // Direct access is safe here - we know getPublicConfig exists
  return await client.getPublicConfig(request);
}
