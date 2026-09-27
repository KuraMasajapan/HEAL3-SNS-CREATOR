// Test edge profile with blur
const targetW = 160;
const targetH = 284;

const lum = new Float32Array(targetW * targetH);

// Background: vertical gradient 160 -> 240
for (let y = 0; y < targetH; y++) {
  const bgL = 160 + (240 - 160) * (y / targetH);
  for (let x = 0; x < targetW; x++) {
    lum[y * targetW + x] = bgL;
  }
}

// Map Card: x in [7, 76], y in [42, 218] (w = 70, h = 176)
// Card color: lum = 50 (contrast ~ 120-150 with background!)
const cardX1 = 7, cardX2 = 76;
const cardY1 = 42, cardY2 = 218;

for (let y = cardY1; y <= cardY2; y++) {
  for (let x = cardX1; x <= cardX2; x++) {
    lum[y * targetW + x] = 50;
  }
}

// Add high-contrast internal GOAL badge: x in [20, 52], y in [60, 82]
// lum = 250 (contrast with card = 200!)
for (let y = 60; y <= 82; y++) {
  for (let x = 20; x <= 52; x++) {
    lum[y * targetW + x] = 250;
  }
}

// Add road lines inside card: x around 35..45, y in [90..190], lum = 180
for (let y = 90; y <= 190; y++) {
  const x = Math.round(35 + Math.sin(y * 0.1) * 8);
  for (let dx = -1; dx <= 1; dx++) {
    lum[y * targetW + (x + dx)] = 180;
  }
}

// Now compare:
// 1. Without blur: where are the maximum gradients?
// Let's compute vertical gradient along row y in [50..90]
console.log('--- Unblurred gradients ---');
let maxGradX = 0, bestXUnblurred = 0;
for (let x = 1; x < 80; x++) {
  let gSum = 0;
  for (let y = 50; y <= 90; y++) {
    gSum += Math.abs(lum[y * targetW + (x + 1)] - lum[y * targetW + (x - 1)]);
  }
  if (gSum > maxGradX) {
    maxGradX = gSum;
    bestXUnblurred = x;
  }
}
console.log('Unblurred best X in [50..90]:', bestXUnblurred); // will be 20 or 52 (GOAL badge!)

// 2. With heavy blur:
const blurR = 5;
const tempL = new Float32Array(targetW * targetH);
const blurL = new Float32Array(targetW * targetH);

for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    let s = 0, c = 0;
    for (let k = -blurR; k <= blurR; k++) {
      const px = x + k;
      if (px >= 0 && px < targetW) { s += lum[y * targetW + px]; c++; }
    }
    tempL[y * targetW + x] = s / c;
  }
}
for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    let s = 0, c = 0;
    for (let k = -blurR; k <= blurR; k++) {
      const py = y + k;
      if (py >= 0 && py < targetH) { s += tempL[py * targetW + x]; c++; }
    }
    blurL[y * targetW + x] = s / c;
  }
}

console.log('--- Blurred gradients ---');
// But notice: even with blur, if GOAL badge was 250 vs 50 (delta 200) and card is 50 vs 170 (delta 120),
// the GOAL badge still has a gradient if we only look at local peak!
// BUT look at the USER'S INSTRUCTION:
// "局所的に最も強い矩形ではなく、左側に存在する最大かつ外側の連続領域を優先する"
// "内部矩形を囲む、より大きな外側境界がある場合は外側を採用する"
// "内部の道路・GOAL・イベントUIなど細かい高コントラスト要素を候補にしない"

// How to find the OUTERMOST boundary?
// Look at the scan from x = 0 moving right:
// At x = cardX1 (7), there is a gradient step from background to card!
// At x = 20, there is the GOAL badge.
// The outermost boundary is the FIRST step encountered when scanning from the outside!
