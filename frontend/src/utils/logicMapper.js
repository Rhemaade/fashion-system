function normalizeMeasurements(inputOrHeight, waistArg, hipsArg) {
  if (typeof inputOrHeight === 'object' && inputOrHeight !== null) {
    return inputOrHeight;
  }

  return {
    height: Number(inputOrHeight) || 0,
    waist: Number(waistArg) || 0,
    hips: Number(hipsArg) || 0,
  };
}

export function mapMeasurementsToDescriptor(inputOrHeight, waistArg, hipsArg) {
  const measurements = normalizeMeasurements(inputOrHeight, waistArg, hipsArg);
  const { shoulders = 0, chest = 0, waist = 0, hips = 0 } = measurements;

  const waistToHipRatio = hips ? waist / hips : 1;
  const shoulderToHipGap = shoulders - hips;
  const chestToHipGap = chest - hips;

  if (waistToHipRatio <= 0.75 && Math.abs(chestToHipGap) <= 4) {
    return 'Hourglass';
  }

  if (hips - chest >= 4 || shoulderToHipGap <= -4) {
    return 'Pear';
  }

  if (chest - hips >= 4 || shoulderToHipGap >= 4) {
    return 'Inverted Triangle';
  }

  if (waistToHipRatio >= 0.88) {
    return 'Apple';
  }

  return 'Rectangle';
}

export function buildMeasurementProfile(inputOrHeight, waistArg, hipsArg) {
  const measurements = normalizeMeasurements(inputOrHeight, waistArg, hipsArg);
  const descriptor = mapMeasurementsToDescriptor(measurements);
  const fitNotes = [];

  if (measurements.height >= 180) fitNotes.push('tall frame');
  if (measurements.height <= 160) fitNotes.push('petite frame');
  if (measurements.shoulders >= measurements.hips + 4) fitNotes.push('broad shoulders');
  if (measurements.hips >= measurements.chest + 4) fitNotes.push('fuller hip line');
  if (measurements.inseam >= 34) fitNotes.push('long leg proportion');
  if (measurements.sleeve >= 26) fitNotes.push('long sleeve reach');

  return {
    descriptor,
    fitSummary: fitNotes.length ? fitNotes.join(', ') : 'balanced proportions',
  };
}
