import type { ConnectRouter } from '@connectrpc/connect';
import { ConfigService } from '../../../proto/config/v1/config_connect';
import type { GetPublicConfigRequest, GetPublicConfigResponse } from '../../../proto/config/v1/config_pb';
import { create } from '@bufbuild/protobuf';
import { GetPublicConfigResponseSchema } from '../../../proto/config/v1/config_pb';
import { registerService } from './typeHelpers';

function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

export function registerConfigService(router: ConnectRouter) {
  registerService(router, ConfigService, {
    async getPublicConfig(_req: GetPublicConfigRequest): Promise<GetPublicConfigResponse> {
      const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
      if (!googleClientId) {
        throw new Error('Google Client ID not configured');
      }

      return create(GetPublicConfigResponseSchema, { googleClientId });
    },
  });
}

