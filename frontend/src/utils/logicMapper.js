export function mapMeasurementsToDescriptor(height, waist, hips) {
  // Simple heuristic mapping
  const ratio = waist / hips;
  let shape = 'Athletic';

  if (ratio < 0.8 && hips > waist + 15) {
    shape = 'Pear';
  } else if (ratio < 0.75 && hips > waist + 10) {
    shape = 'Hourglass';
  } else if (waist >= hips) {
    shape = 'Apple';
  }

  return shape;
}
