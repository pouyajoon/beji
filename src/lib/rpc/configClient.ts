import { ConfigService } from '../../proto/config/v1/config_connect';
import type {
  GetPublicConfigRequest,
  GetPublicConfigResponse,
} from '../../proto/config/v1/config_pb';
import { create } from '@bufbuild/protobuf';
import { GetPublicConfigRequestSchema } from '../../proto/config/v1/config_pb';
import { transport } from './transport';
import { createServiceClient } from './clientHelpers';

const client = createServiceClient(ConfigService, transport);

export async function getPublicConfig(): Promise<GetPublicConfigResponse> {
  const request = create(GetPublicConfigRequestSchema, {});
  
  // Type assertion is safe here - we know getPublicConfig exists and returns GetPublicConfigResponse
  const method = (client as Record<string, (req: GetPublicConfigRequest) => Promise<GetPublicConfigResponse>>).getPublicConfig;
  if (!method) {
    throw new Error('getPublicConfig method not found on ConfigService client');
  }
  
  return await method(request);
}
