import type { ConnectRouter } from '@connectrpc/connect';

import { registerConfigService } from './services/configService';
import { registerPlayerService } from './services/playerService';
import { registerWorldService } from './services/worldService';

export function registerPublicRoutes(router: ConnectRouter) {
  registerConfigService(router);
}

export function registerAuthenticatedRoutes(router: ConnectRouter) {
  registerWorldService(router);
  registerPlayerService(router);
}

