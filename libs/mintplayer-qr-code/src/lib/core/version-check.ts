/**
 * Check if QR Code version is valid
 *
 * @param  version QR Code version
 */
export function isValid(version: number | string | undefined) {
	const v = typeof version === 'string' ? parseInt(version, 10) : version;
	return !isNaN(v as number) && (v as number) >= 1 && (v as number) <= 40;
}
