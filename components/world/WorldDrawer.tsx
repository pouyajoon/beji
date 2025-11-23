import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMessages } from '../../i18n/DictionaryProvider';
import { useAtomValue } from '../../lib/jotai';
import { getUserBejis } from '../../src/lib/rpc/playerClient';
import type { BejiWithWorld } from '../../src/proto/player/v1/player_pb';
import { userSubAtom, type Beji, type World } from '../atoms';
import { HourglassLoader } from '../HourglassLoader';
import { Tooltip } from '../Tooltip';

type WorldDrawerProps = {
  currentWorldId: string | undefined;
};

export function WorldDrawer({ currentWorldId }: WorldDrawerProps) {
  const navigate = useNavigate();
  const [userBejis, setUserBejis] = useState<Array<Beji & { world?: World | null }>>([]);
  const [isLoadingBejis, setIsLoadingBejis] = useState(true);
  const userId = useAtomValue(userSubAtom); // Utiliser l'atom au lieu de refetch /get-token
  const { messages } = useMessages<{
    WorldDrawer: {
      home: string;
      homeAriaLabel: string;
      worldLabel: string;
      goToWorldAriaLabel: string;
    }
  }>();

  // Fetch user bejis for the drawer
  useEffect(() => {
    async function fetchUserBejis() {
      if (!userId) {
        setUserBejis([]);
        setIsLoadingBejis(false);
        return;
      }

      try {
        const bejisData = await getUserBejis(userId);
        const convertedBejis = (bejisData.bejis || [])
          .filter((bw: BejiWithWorld) => bw.beji != null)
          .map((bw: BejiWithWorld) => {
            const bejiData = bw.beji!; // Safe after filter
            const beji: Beji = {
              id: bejiData.id,
              playerId: bejiData.playerId,
              worldId: bejiData.worldId,
              emoji: bejiData.emoji,
              name: bejiData.name,
              position: bejiData.position ? { x: bejiData.position.x, y: bejiData.position.y } : { x: 0, y: 0 },
              target: bejiData.target ? { x: bejiData.target.x, y: bejiData.target.y } : undefined,
              walk: bejiData.walk,
              createdAt: Number(bejiData.createdAt),
            };

            const world: World | null = bw.world ? {
              id: bw.world.id,
              mainBejiId: bw.world.mainBejiId,
              staticBejiIds: [],
              createdAt: Number(bw.world.createdAt),
            } : null;

            return { ...beji, world };
          });
        setUserBejis(convertedBejis);
      } catch (error) {
        console.error("Failed to fetch bejis:", error);
        setUserBejis([]);
      } finally {
        setIsLoadingBejis(false);
      }
    }

    fetchUserBejis();
  }, [userId]); // Ne fetch que quand userId change

  const drawerWidth = '40px';

  return (
    <div
      style={{
        width: drawerWidth,
        height: '100vh',
        background: 'var(--bg, #ffffff)',
        borderRight: '1px solid var(--muted, #e5e5e5)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Home button */}
      <Tooltip label={messages.WorldDrawer?.home ?? 'Home'}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            height: '40px',
            padding: '4px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--muted, #e5e5e5)',
            cursor: 'pointer',
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--muted, #f5f5f5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label={messages.WorldDrawer?.homeAriaLabel ?? 'Return to home'}
        >
          🏠
        </button>
      </Tooltip>

      {/* Bejis list */}
      <div
        style={{
          flex: 1,
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {isLoadingBejis ? (
          <div style={{ padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <HourglassLoader text="" size={16} />
          </div>
        ) : userBejis.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-color, #000000)', opacity: 0.7, fontSize: '12px' }}>
            —
          </div>
        ) : (
          userBejis.map((beji) => {
            const worldLabel = messages.WorldDrawer?.worldLabel ?? 'World';
            const tooltipText = `${beji.name}${beji.world ? `\n${worldLabel}: ${beji.world.id.slice(0, 8)}...` : ''}`;
            const isActive = beji.worldId === currentWorldId;
            const goToWorldLabel = messages.WorldDrawer?.goToWorldAriaLabel ?? 'Go to world of';

            return (
              <Tooltip key={beji.id} label={tooltipText}>
                <button
                  onClick={() => {
                    if (beji.worldId) {
                      navigate(`/world/${beji.worldId}`);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '4px',
                    background: isActive ? 'var(--muted, #e5e5e5)' : 'transparent',
                    border: isActive ? '2px solid var(--text-color, #000000)' : 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--muted, #f5f5f5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  aria-label={`${goToWorldLabel} ${beji.name}`}
                >
                  {beji.emoji}
                </button>
              </Tooltip>
            );
          })
        )}
      </div>
    </div>
  );
}

