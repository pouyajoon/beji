"use client";

type MapGridProps = {
    mapSize: number;
    cellSize: number;
};

type MapCell = {
    x: number;
    y: number;
};

export function MapGrid({ mapSize, cellSize }: MapGridProps) {
    const gridColumns = mapSize / cellSize;
    const gridRows = mapSize / cellSize;

    const cells: MapCell[] = [];
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridColumns; col++) {
            cells.push({ x: col * cellSize, y: row * cellSize });
        }
    }

    return (
        <g>
            {cells.map((cell, idx) => (
                <rect
                    key={idx}
                    x={cell.x}
                    y={cell.y}
                    width={cellSize}
                    height={cellSize}
                    fill="#f9fafb"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            ))}
        </g>
    );
}

