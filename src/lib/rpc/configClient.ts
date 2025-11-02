import { createClient } from '@connectrpc/connect';
import { ConfigService } from '../../proto/config/v1/config_connect';
import type {
  GetPublicConfigResponse,
} from '../../proto/config/v1/config_pb';
import { create } from '@bufbuild/protobuf';
import { GetPublicConfigRequestSchema } from '../../proto/config/v1/config_pb';
import { transport } from './transport';

const client = createClient(ConfigService as any, transport);

export async function getPublicConfig(): Promise<GetPublicConfigResponse> {
  const request = create(GetPublicConfigRequestSchema, {});
  const response = await (client as any).getPublicConfig(request);
  return response as GetPublicConfigResponse;
}
