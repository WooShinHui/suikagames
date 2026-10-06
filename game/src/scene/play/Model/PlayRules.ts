export const FRUIT_RADII = [15, 30, 46, 56, 66, 80, 90, 106, 116, 136, 160];
export const FRUIT_SCORES = [1, 3, 6, 10, 15, 21, 28, 36, 45, 200, 500];
export const FRUIT_SOUNDS = [
    'pu_0',
    'pu_1',
    'pu_2',
    'pu_3',
    'pu_4',
    'beori',
    'nyangi',
    'tori',
    'dogi',
    'deumi',
    'clear',
];
export const WARNING_LINE_OFFSET = 60;
export const GAME_OVER_DELAY = 4000;

export function getFruitRadius(type: number): number {
    const radius = FRUIT_RADII[type];
    if (radius === undefined)
        throw new RangeError(`Unknown fruit type: ${type}`);
    return radius;
}
