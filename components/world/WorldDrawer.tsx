import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Beji, World } from '../atoms';
import { Tooltip } from '../Tooltip';
import { getUserBejis } from '../../src/lib/rpc/playerClient';
import type { BejiWithWorld } from '../../src/proto/player/v1/player_pb';

type WorldDrawerProps = {
  currentWorldId: string | undefined;
};

export function WorldDrawer({ currentWorldId }: WorldDrawerProps) {
  const navigate = useNavigate();
  const [userBejis, setUserBejis] = useState<Array<Beji & { world?: World | null }>>([]);
  const [isLoadingBejis, setIsLoadingBejis] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user bejis for the drawer
  useEffect(() => {
    async function fetchUserAndBejis() {
      try {
        const userResponse = await fetch("/api/authentication/get-token", {
          credentials: 'include',
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const currentUserId = userData.userId;
          setUserId(currentUserId);

          try {
            const bejisData = await getUserBejis(currentUserId);
            const convertedBejis = (bejisData.bejis || []).map((bw: BejiWithWorld) => {
              const beji: Beji = {
                id: bw.beji.id,
                playerId: bw.beji.playerId,
                worldId: bw.beji.worldId,
                emoji: bw.beji.emoji,
                name: bw.beji.name,
                position: bw.beji.position ? { x: bw.beji.position.x, y: bw.beji.position.y } : { x: 0, y: 0 },
                target: bw.beji.target ? { x: bw.beji.target.x, y: bw.beji.target.y } : undefined,
                walk: bw.beji.walk,
                createdAt: Number(bw.beji.createdAt),
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
          }
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      } finally {
        setIsLoadingBejis(false);
      }
    }

    fetchUserAndBejis();
  }, []);

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
      <Tooltip label="Accueil">
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
          aria-label="Retour à l'accueil"
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
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-color, #000000)', opacity: 0.7, fontSize: '12px' }}>
            ⏳
          </div>
        ) : userBejis.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-color, #000000)', opacity: 0.7, fontSize: '12px' }}>
            —
          </div>
        ) : (
          userBejis.map((beji) => {
            const tooltipText = `${beji.name}${beji.world ? `\nMonde: ${beji.world.id.slice(0, 8)}...` : ''}`;
            const isActive = beji.worldId === currentWorldId;
            
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
                  aria-label={`Aller au monde de ${beji.name}`}
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

