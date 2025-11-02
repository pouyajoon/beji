import type { ConnectRouter } from '@connectrpc/connect';
import { registerWorldService } from './services/worldService';
import { registerConfigService } from './services/configService';
import { registerPlayerService } from './services/playerService';

export function registerPublicRoutes(router: ConnectRouter) {
  registerConfigService(router);
  registerWorldService(router);
}

export function registerAuthenticatedRoutes(router: ConnectRouter) {
  registerPlayerService(router);
}

