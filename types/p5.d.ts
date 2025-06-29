declare module 'p5' {
  export default class p5 {
    constructor(sketch: (p: p5) => void, node?: string | HTMLElement);

    // Properties
    width: number;
    height: number;

    // Core methods
    setup: () => void;
    draw: () => void;
    remove: () => void;

    // Canvas methods
    createCanvas(w: number, h: number, renderer?: p5.RENDERER): p5.Renderer;
    resizeCanvas(w: number, h: number, noRedraw?: boolean): void;

    // Math methods
    random(min: number, max: number): number;
    constrain(n: number, low: number, high: number): number;

    // Color methods
    background(v: number): void;
    fill(v: number, v1: number, v2: number): void;
    noStroke(): void;

    // Shape methods
    ellipse(x: number, y: number, w: number, h: number): void;

    // Events
    windowResized?: () => void;
  }

  namespace p5 {
    type RENDERER = P2D | WEBGL;
    type P2D = 'p2d';
    type WEBGL = 'webgl';

    class Renderer {
      parent(parent: string | HTMLElement): void;
    }
  }
}

export = p5;
export as namespace p5;
