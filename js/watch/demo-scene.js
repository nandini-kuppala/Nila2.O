// Demo footage for the Watch screen: an animated stand-in, not a real baby. A cot
// seen from above, and a small figure that lies still, wriggles, crawls out past
// the edge of the mattress, and comes back; near the end the "phone" is knocked.
// It is drawn on a canvas and read by the same tracker as the live camera.

export function createDemoScene(canvas) {
  const W = (canvas.width = 640);
  const H = (canvas.height = 480);
  const g = canvas.getContext('2d');
  const t0 = performance.now();
  const LOOP = 34000;

  // the figure's path through the loop, in fractions of the frame: [ms, x, y]
  const PATH = [
    [0, 0.5, 0.5], [5000, 0.5, 0.5], [7000, 0.53, 0.48], [8500, 0.48, 0.53],
    [10000, 0.5, 0.5], [16000, 0.9, 0.55], [21000, 0.9, 0.55], [25000, 0.5, 0.5], [LOOP, 0.5, 0.5],
  ];
  function where(ms) {
    for (let i = 1; i < PATH.length; i++) {
      if (ms <= PATH[i][0]) {
        const [a, ax, ay] = PATH[i - 1];
        const [b, bx, by] = PATH[i];
        const k = (ms - a) / (b - a || 1);
        const e = k * k * (3 - 2 * k);
        return { x: ax + (bx - ax) * e, y: ay + (by - ay) * e };
      }
    }
    return { x: 0.5, y: 0.5 };
  }

  function draw() {
    const ms = (performance.now() - t0) % LOOP;
    const knocked = ms > 28500 && ms < LOOP; // the phone gets knocked near the end
    g.save();
    if (knocked) {
      g.translate(-70, 30);
      g.rotate(0.06);
    }
    // floor and cot
    g.fillStyle = '#3a4340';
    g.fillRect(-100, -100, W + 200, H + 200);
    g.fillStyle = '#c9b79c';
    g.fillRect(40, 30, W - 80, H - 60);
    g.fillStyle = '#e9f1ee';
    g.fillRect(64, 54, W - 128, H - 108);
    // a few soft blanket folds so the scene is not flat
    g.strokeStyle = 'rgba(120,150,140,.25)';
    g.lineWidth = 6;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(90 + i * 100, 80);
      g.quadraticCurveTo(140 + i * 100, 240, 100 + i * 100, 400);
      g.stroke();
    }
    // bars along the top and bottom rails
    g.fillStyle = '#a8957a';
    for (let x = 52; x < W - 40; x += 28) {
      g.fillRect(x, 30, 8, 24);
      g.fillRect(x, H - 54, 8, 24);
    }
    // the figure
    const p = where(ms);
    const wiggle = ms > 5000 && ms < 21000 ? Math.sin(ms / 140) * 4 : 0;
    const x = p.x * W + wiggle;
    const y = p.y * H;
    g.fillStyle = '#9dd3c6';
    g.beginPath();
    g.ellipse(x, y + 34, 44, 58, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2c3a2';
    g.beginPath();
    g.arc(x, y - 32, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a4e3a';
    g.beginPath();
    g.arc(x, y - 44, 22, Math.PI, 0);
    g.fill();
    g.restore();
    // the label that it is a stand-in
    g.fillStyle = 'rgba(0,0,0,.55)';
    g.fillRect(W - 210, H - 34, 200, 26);
    g.fillStyle = '#fff';
    g.font = '15px system-ui, sans-serif';
    g.fillText('Demo footage · animated', W - 200, H - 16);
  }
  draw();
  // Drawn on demand by whoever reads it (the tracker tick), so the scene keeps
  // moving even when the browser pauses animation frames for a hidden tab.
  return { canvas, render: draw, stop() {} };
}
