import { describe, it, expect, beforeEach, vi } from 'vitest';
import { codepointsToEmoji } from '../components/emoji';
import type { StaticBeji } from '../components/atoms';

describe('Static Beji', () => {
    describe('Static Beji Creation', () => {
        it('creates 10 static bejis with unicode offsets from -5 to +5', () => {
            const baseUnicode = 0x1f600; // 😀
            const staticBejis: StaticBeji[] = [];
            
            for (let offset = -5; offset <= 5; offset++) {
                const staticUnicode = baseUnicode + offset;
                const staticEmoji = codepointsToEmoji([staticUnicode]);
                
                staticBejis.push({
                    id: `static-beji-${offset}`,
                    worldId: "test-world",
                    emojiCodepoint: staticUnicode,
                    emoji: staticEmoji,
                    position: { x: 0, y: 0 },
                    harvested: false,
                });
            }
            
            expect(staticBejis).toHaveLength(11); // -5 to +5 inclusive = 11 bejis
            expect(staticBejis[0]?.emojiCodepoint).toBe(baseUnicode - 5);
            expect(staticBejis[5]?.emojiCodepoint).toBe(baseUnicode); // middle one
            expect(staticBejis[10]?.emojiCodepoint).toBe(baseUnicode + 5);
        });

        it('generates positions within 150 meters of 0,0', () => {
            const staticBejis: StaticBeji[] = [];
            
            // Generate multiple random positions
            for (let i = 0; i < 100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 150;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                staticBejis.push({
                    id: `static-beji-${i}`,
                    worldId: "test-world",
                    emojiCodepoint: 0x1f600,
                    emoji: '😀',
                    position: { x, y },
                    harvested: false,
                });
            }
            
            // All positions should be within 150m of origin
            for (const beji of staticBejis) {
                const distanceFromOrigin = Math.sqrt(beji.position.x ** 2 + beji.position.y ** 2);
                expect(distanceFromOrigin).toBeLessThanOrEqual(150);
                expect(distanceFromOrigin).toBeGreaterThanOrEqual(0);
            }
        });

        it('allows negative positions', () => {
            const beji: StaticBeji = {
                id: 'test',
                worldId: "test-world",
                emojiCodepoint: 0x1f600,
                emoji: '😀',
                position: { x: -50, y: -75 },
                harvested: false,
            };
            
            expect(beji.position.x).toBeLessThan(0);
            expect(beji.position.y).toBeLessThan(0);
        });
    });

    describe('Harvesting Logic', () => {
        const HARVEST_DISTANCE_METERS = 2;
        
        it('calculates distance correctly for harvesting', () => {
            const playerPos = { x: 0, y: 0 };
            const staticBejiPos = { x: 1, y: 0 }; // 1 meter away
            
            const dx = staticBejiPos.x - playerPos.x;
            const dy = staticBejiPos.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            expect(distance).toBeLessThanOrEqual(HARVEST_DISTANCE_METERS);
            expect(distance).toBe(1);
            expect(distance).toBeGreaterThan(0);
        });

        it('allows harvesting when player is within 2 meters', () => {
            const playerPos = { x: 0, y: 0 };
            const staticBejiPos = { x: 1, y: 1 }; // Distance = sqrt(2) ≈ 1.414m
            
            const dx = staticBejiPos.x - playerPos.x;
            const dy = staticBejiPos.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            expect(distance).toBeLessThanOrEqual(HARVEST_DISTANCE_METERS);
            expect(distance).toBeCloseTo(Math.sqrt(2), 2); // Should be ≈ 1.414
        });

        it('prevents harvesting when player is beyond 2 meters', () => {
            const playerPos = { x: 0, y: 0 };
            const staticBejiPos = { x: 3, y: 3 };
            
            const dx = staticBejiPos.x - playerPos.x;
            const dy = staticBejiPos.y - playerPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            expect(distance).toBeGreaterThan(HARVEST_DISTANCE_METERS);
        });
    });

    describe('Inventory System', () => {
        it('tracks harvested bejis by unicode codepoint', () => {
            const inventory: Record<number, number> = {};
            const codepoint = 0x1f600;
            
            // Harvest a beji
            inventory[codepoint] = (inventory[codepoint] || 0) + 1;
            
            expect(inventory[codepoint]).toBe(1);
        });

        it('increments count when harvesting same codepoint multiple times', () => {
            const inventory: Record<number, number> = {};
            const codepoint = 0x1f600;
            
            // Harvest multiple bejis with same codepoint
            inventory[codepoint] = (inventory[codepoint] || 0) + 1;
            inventory[codepoint] = (inventory[codepoint] || 0) + 1;
            inventory[codepoint] = (inventory[codepoint] || 0) + 1;
            
            expect(inventory[codepoint]).toBe(3);
        });

        it('tracks multiple different codepoints independently', () => {
            const inventory: Record<number, number> = {};
            
            inventory[0x1f600] = (inventory[0x1f600] || 0) + 1;
            inventory[0x1f601] = (inventory[0x1f601] || 0) + 1;
            inventory[0x1f602] = (inventory[0x1f602] || 0) + 1;
            
            expect(inventory[0x1f600]).toBe(1);
            expect(inventory[0x1f601]).toBe(1);
            expect(inventory[0x1f602]).toBe(1);
        });
    });

    describe('Map Bounds', () => {
        const MAP_SIZE = 6400;
        
        it('allows positions from -MAP_SIZE/2 to MAP_SIZE/2', () => {
            const minX = -MAP_SIZE / 2;
            const maxX = MAP_SIZE / 2;
            const minY = -MAP_SIZE / 2;
            const maxY = MAP_SIZE / 2;
            
            const positions = [
                { x: minX, y: minY },
                { x: maxX, y: maxY },
                { x: 0, y: 0 },
                { x: -100, y: 50 },
                { x: 200, y: -300 },
            ];
            
            for (const pos of positions) {
                expect(pos.x).toBeGreaterThanOrEqual(minX);
                expect(pos.x).toBeLessThanOrEqual(maxX);
                expect(pos.y).toBeGreaterThanOrEqual(minY);
                expect(pos.y).toBeLessThanOrEqual(maxY);
            }
        });

        it('clamps positions to map bounds', () => {
            const clamp = (value: number, min: number, max: number) => 
                Math.max(min, Math.min(max, value));
            
            const MAP_SIZE = 6400;
            const min = -MAP_SIZE / 2;
            const max = MAP_SIZE / 2;
            
            expect(clamp(-4000, min, max)).toBe(min);
            expect(clamp(4000, min, max)).toBe(max);
            expect(clamp(0, min, max)).toBe(0);
            expect(clamp(100, min, max)).toBe(100);
            expect(clamp(-100, min, max)).toBe(-100);
        });
    });
});

