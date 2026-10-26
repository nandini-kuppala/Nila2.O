// The object-detection model shared by Watch and Babyproof: COCO-SSD on
// TensorFlow.js. The browser downloads the model once (about 5 MB) and then runs
// it here. Pictures are never sent anywhere.

const TF = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const COCO = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';

let loading = null;

function script(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(s);
  });
}

/** Resolves to the model, or rejects if the browser is offline. */
export function loadDetector() {
  if (!loading) {
    loading = (async () => {
      await script(TF);
      await script(COCO);
      return window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export const detectorReady = () => !!loading;

/** [{ class, score, bbox: [x, y, w, h] in pixels }] */
export async function detect(source, { minScore = 0.4, max = 20 } = {}) {
  const model = await loadDetector();
  return model.detect(source, max, minScore);
}
