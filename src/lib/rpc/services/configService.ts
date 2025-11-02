import type { ConnectRouter, ServiceImpl } from '@connectrpc/connect';
import type { Message } from '@bufbuild/protobuf';

// Helper function to create proto messages (compatible with v1 API)
function create<T extends Message<T>>(MessageClass: new (data?: any) => T, data?: any): T {
  return new MessageClass(data);
}
import { ConfigService } from '../../../proto/config/v1/config_connect';
import { GetPublicConfigResponse } from '../../../proto/config/v1/config_pb';

function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

export function registerConfigService(router: ConnectRouter) {
  router.service(
    ConfigService,
    {
      async getPublicConfig(_req): Promise<GetPublicConfigResponse> {
        try {
          const googleClientId = getEnvVar('GOOGLE_CLIENT_ID');
          if (!googleClientId) {
            console.error('[ConfigService.getPublicConfig] Google Client ID not configured');
            throw new Error('Google Client ID not configured');
          }

          return create(GetPublicConfigResponse, { googleClientId });
        } catch (error) {
          console.error('[ConfigService.getPublicConfig] Error:', error);
          throw error;
        }
      },
    }
  );
}

