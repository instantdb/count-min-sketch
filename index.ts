import fs from "fs";
import { PNG } from "pngjs";

// Read the file
const wodehouse = fs.readFileSync("wodehouse.txt", "utf-8");

// Split into words
function stem(word: string) {
  let w = word.toLowerCase().replaceAll(/[^a-z]/g, "");
  if (w.endsWith("ing") && w.length > 4) {
    w = w.slice(0, -3);
  } else if (w.endsWith("ed") && w.length > 3) {
    w = w.slice(0, -2);
  } else if (w.endsWith("s") && w.length > 3 && !w.endsWith("ss")) {
    w = w.slice(0, -1);
  } else if (w.endsWith("ly") && w.length > 3) {
    w = w.slice(0, -2);
  } else if (w.endsWith("er") && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith("est") && w.length > 4) {
    w = w.slice(0, -3);
  }
  return w;
}

function toWords(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line) => line.split(" "))
    .map(stem)
    .filter((w) => w);
}

// Get exact counts
function countWords(words: string[]): { [w: string]: number } {
  const result: { [w: string]: number } = {};
  for (const word of words) {
    result[word] = (result[word] || 0) + 1;
  }
  return result;
}

const exactCounts = countWords(toWords(wodehouse));

console.log("exactCounts", exactCounts);

// Create a sketch
type Sketch = {
  rows: number;
  columns: number;
  buckets: Uint32Array;
};

function createSketch({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}): Sketch {
  return { rows, columns, buckets: new Uint32Array(rows * columns) };
}

const sketch = createSketch({ rows: 2, columns: 5 });

console.log("created:", sketch);

// Implement add
function add({ rows, columns, buckets }: Sketch, word: string) {
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const hash = Bun.hash.xxHash3(word, BigInt(rowIdx));
    const columnIdx = Number(hash % BigInt(columns));
    const globalIdx = rowIdx * columns + columnIdx;
    buckets[globalIdx]!++;
  }
}

add(sketch, stem("castle"));
console.log("after castle", sketch);

// Implement check
function check({ rows, columns, buckets }: Sketch, word: string) {
  let approx = Infinity;
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const hash = Bun.hash.xxHash3(word, BigInt(rowIdx));
    const columnIdx = Number(hash % BigInt(columns));
    const globalIdx = rowIdx * columns + columnIdx;
    approx = Math.min(approx, buckets[globalIdx]!);
  }
  return approx;
}

console.log("check castle", check(sketch, stem("castle")));

// Get exact counts for _all_ of wodehouse!

const allWodehouse = fs.readFileSync("wodehouse-full.txt", "utf-8");
const allWords = toWords(allWodehouse);
const allExactCounts = countWords(allWords);

console.log("exact beetle", allExactCounts[stem("beetle")]);

// Now let's try out our sketches!

const allSketch = createSketch({ rows: 5, columns: 5437 });
for (const word of allWords) {
  add(allSketch, word);
}

console.log("allSketch beetle", check(allSketch, stem("beetle")));

// Let's use errorRate and confidence

function sketchWithBounds({
  errorRate,
  confidence,
}: {
  errorRate: number;
  confidence: number;
}): Sketch {
  const columns = Math.ceil(Math.E / errorRate);
  const rows = Math.ceil(Math.log(1 / (1 - confidence)));
  return createSketch({ rows, columns });
}

const withBounds = sketchWithBounds({
  errorRate: 0.0005,
  confidence: 0.99,
});

console.log("withBounds", withBounds.columns, withBounds.rows);

// Let's try compression

console.log("numBuckets", withBounds.buckets.length);

const compressed = await Bun.zstdCompress(withBounds.buckets);

console.log(
  "original size",
  withBounds.buckets.byteLength,
  "compressed size",
  compressed.byteLength,
);

// Let's create some PNGs

function createPNG({
  width,
  buffer,
}: {
  width: number;
  buffer: Uint8Array;
}): Buffer {
  const bytesPerPixel = 4; // RGBA
  const height = Math.ceil(buffer.length / (width * bytesPerPixel));
  const png = new PNG({
    width,
    height,
    colorType: 6, // RGBA
  });

  for (let i = 0; i < png.data.length; i++) {
    png.data[i] = buffer[i] ?? 0;
  }

  return PNG.sync.write(png);
}

// Let's first save our sketch

const compressedSketch = await Bun.zstdCompress(allSketch.buckets);

console.log("compressedSketch", compressedSketch.byteLength);

fs.writeFileSync(
  "compressedSketch.png",
  createPNG({ width: 150, buffer: compressedSketch }),
);

// Now let's just try compressing the raw counts

const compressedExactCounts = await Bun.zstdCompress(
  JSON.stringify(allExactCounts),
);

console.log("compressedExactCounts", compressedExactCounts.byteLength);

fs.writeFileSync(
  "compressedExactCounts.png",
  createPNG({ width: 150, buffer: compressedExactCounts }),
);
