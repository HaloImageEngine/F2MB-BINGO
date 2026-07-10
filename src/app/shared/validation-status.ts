/** Maps Check_GameSetup / validation `Status` text to card-overview & game-master CSS classes. */
export function validationStatusClass(status: string | null | undefined): string {
  const value = status?.trim().toUpperCase() ?? '';
  if (
    value === 'PASS' ||
    value === 'READY' ||
    value === 'MATCH' ||
    value === 'FOUND' ||
    value === 'COMPLETE' ||
    value.includes('IN SYNC')
  ) {
    return 'is-pass';
  }
  if (value === 'WARNING' || value === 'INCOMPLETE' || value.includes('MISMATCH')) {
    return 'is-warn';
  }
  if (value === 'FAIL' || value === 'ERROR' || value === 'NOT READY' || value.includes('NOT READY')) {
    return 'is-fail';
  }
  return '';
}
