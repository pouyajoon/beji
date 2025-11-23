import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  playersAtom,
  bejiAtom,
  staticBejiAtom,
  worldsAtom,
  type Player,
  type Beji,
  type StaticBeji,
  type World,
} from '../../components/atoms';
import { AuthenticatedPage } from '../../components/AuthenticatedPage';
import { Map } from '../../components/Map';
import { WorldDrawer } from '../../components/world/WorldDrawer';
import { useSetAtom } from '../../lib/jotai';
import { getWorld } from '../lib/rpc/worldClient';
import type { StaticBeji as ProtoStaticBeji } from '../proto/staticbeji/v1/staticbeji_pb';

function WorldPageContent() {
  const params = useParams<{ id: string }>();
  const worldId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPlayers = useSetAtom(playersAtom);
  const setBeji = useSetAtom(bejiAtom);
  const setStaticBeji = useSetAtom(staticBejiAtom);
  const setWorlds = useSetAtom(worldsAtom);

  useEffect(() => {
    if (!worldId) {
      setError('World ID is required');
      setLoading(false);
      return;
    }

    async function loadWorld() {
      try {
        setLoading(true);
        setError(null);

        const response = await getWorld(worldId!);

        if (!response || !response.world) {
          throw new Error('World not found or invalid response structure');
        }

        const worldData = response.world;

        if (!worldData.beji || !worldData.player || !worldData.world) {
          throw new Error('Invalid world data structure');
        }

        const player: Player = {
          id: worldData.player!.id,
          emoji: worldData.player!.emoji,
          emojiCodepoints: worldData.player!.emojiCodepoints,
          bejiIds: worldData.player!.bejiIds,
          createdAt: Number(worldData.player!.createdAt),
        };

        const beji: Beji = {
          id: worldData.beji!.id,
          playerId: worldData.beji!.playerId,
          worldId: worldData.beji!.worldId,
          emoji: worldData.beji!.emoji,
          name: worldData.beji!.name,
          position:
            worldData.beji!.position &&
              typeof worldData.beji!.position.x === 'number' &&
              typeof worldData.beji!.position.y === 'number'
              ? { x: worldData.beji!.position.x, y: worldData.beji!.position.y }
              : { x: 0, y: 0 },
          target:
            worldData.beji!.target &&
              typeof worldData.beji!.target.x === 'number' &&
              typeof worldData.beji!.target.y === 'number'
              ? { x: worldData.beji!.target.x, y: worldData.beji!.target.y }
              : { x: 0, y: 0 },
          walk: worldData.beji!.walk,
          createdAt: Number(worldData.beji!.createdAt),
        };

        const world: World = {
          id: worldData.world!.id,
          mainBejiId: worldData.world!.mainBejiId,
          staticBejiIds: worldData.world!.staticBejiIds,
          createdAt: Number(worldData.world!.createdAt),
        };

        const staticBeji: StaticBeji[] = worldData.staticBeji.map(
          (sb: ProtoStaticBeji) => ({
            id: sb.id,
            worldId: sb.worldId,
            emojiCodepoint: sb.emojiCodepoint,
            emoji: sb.emoji,
            position:
              sb.position &&
                typeof sb.position.x === 'number' &&
                typeof sb.position.y === 'number'
                ? { x: sb.position.x, y: sb.position.y }
                : { x: 0, y: 0 },
            harvested: sb.harvested,
          })
        );

        setPlayers([player]);
        setWorlds([world]);
        setBeji([beji]);
        setStaticBeji(staticBeji);
      } catch (err) {
        console.error('Error loading world:', err);
        setError(err instanceof Error ? err.message : 'Failed to load world');
      } finally {
        setLoading(false);
      }
    }

    loadWorld();
  }, [worldId, setPlayers, setBeji, setStaticBeji, setWorlds]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Drawer - always visible */}
      <WorldDrawer currentWorldId={worldId} />

      {/* Map area */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ fontSize: '18px', color: '#000000' }}>Loading world...</div>
        ) : error ? (
          <div style={{ fontSize: '18px', color: '#ef4444' }}>Error: {error}</div>
        ) : (
          <div style={{ width: '100%', height: '100%' }}>
            <Map />
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorldPage() {
  return (
    <AuthenticatedPage>
      <WorldPageContent />
    </AuthenticatedPage>
  );
}

