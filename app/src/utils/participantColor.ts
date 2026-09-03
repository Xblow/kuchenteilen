// 30 distinct background/text pairs, pleasant and accessible
const PALETTE: { bg: string; text: string }[] = [
  { bg: '#F87171', text: '#7F1D1D' }, // red
  { bg: '#FB923C', text: '#7C2D12' }, // orange
  { bg: '#FBBF24', text: '#78350F' }, // amber
  { bg: '#A3E635', text: '#365314' }, // lime
  { bg: '#34D399', text: '#064E3B' }, // emerald
  { bg: '#2DD4BF', text: '#134E4A' }, // teal
  { bg: '#38BDF8', text: '#0C4A6E' }, // sky
  { bg: '#818CF8', text: '#1E1B4B' }, // indigo
  { bg: '#C084FC', text: '#3B0764' }, // purple
  { bg: '#F472B6', text: '#831843' }, // pink
  { bg: '#E879F9', text: '#701A75' }, // fuchsia
  { bg: '#FCA5A5', text: '#7F1D1D' }, // light red
  { bg: '#FCD34D', text: '#78350F' }, // yellow
  { bg: '#6EE7B7', text: '#064E3B' }, // light emerald
  { bg: '#67E8F9', text: '#164E63' }, // cyan
  { bg: '#93C5FD', text: '#1E3A5F' }, // light blue
  { bg: '#A78BFA', text: '#2E1065' }, // violet
  { bg: '#F9A8D4', text: '#831843' }, // light pink
  { bg: '#86EFAC', text: '#14532D' }, // light green
  { bg: '#FDE68A', text: '#78350F' }, // light amber
  { bg: '#7DD3FC', text: '#0C4A6E' }, // lighter sky
  { bg: '#D8B4FE', text: '#3B0764' }, // light purple
  { bg: '#FDA4AF', text: '#881337' }, // rose
  { bg: '#6EE7B7', text: '#065F46' }, // mint
  { bg: '#BAE6FD', text: '#075985' }, // pale blue
  { bg: '#DDD6FE', text: '#4C1D95' }, // lavender
  { bg: '#FBCFE8', text: '#9D174D' }, // pale pink
  { bg: '#BBF7D0', text: '#166534' }, // pale green
  { bg: '#FEF08A', text: '#713F12' }, // pale yellow
  { bg: '#CFFAFE', text: '#155E75' }, // pale cyan
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function participantColor(idOrName: string): { bg: string; text: string } {
  return PALETTE[hashString(idOrName) % PALETTE.length];
}
