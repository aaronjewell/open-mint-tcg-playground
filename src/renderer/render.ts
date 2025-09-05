import type { Flavor } from '../flavorer/index.js';

export interface RenderOptions {
    imageDataUrl?: string;
    certQrCodeDataUrl?: string;
}

function escapeXml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clampText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(0, maxLen - 1)).trimEnd() + '…';
}

export function renderCardSvg(flavor: Flavor, options: RenderOptions = {}): string {
    const width =  744; // points/pixels
    const height = 1039;

    const padding = 24;
    const headerHeight = 100;
    const footerHeight = 60;
    const imageAreaHeight = 520;
    const contentY = padding + headerHeight;

    const title = escapeXml(flavor.title);
    const type = escapeXml(flavor.type);
    const body = escapeXml(flavor.text);
    const tags = escapeXml(flavor.tags.join('  '));
    const imageStyle = escapeXml(flavor.image.style);
    const imageDescription = escapeXml(flavor.image.description);

    // Colors derived from palette
    const { headerFill, accent, borderColor, footerFill } = deriveColors(flavor.palette);
    const background = '#f9fafb';
    const textPrimary = '#111827';
    const textSecondary = '#374151';

    const cardRadius = 24;

    // Layout positions
    const imageAreaY = contentY;
    const imageAreaX = padding;
    const imageAreaW = width - padding * 2;

    const detailsY = imageAreaY + imageAreaHeight + 18;
    const detailsX = padding;
    const detailsW = width - padding * 2;

    const footerY = height - footerHeight - padding;

    // Paths to round only the outer corners for header (top corners) and footer (bottom corners)
    const innerWidth = width - padding * 2;
    const footerRadius = 12;
    const headerPathD = [
        `M ${padding + cardRadius} ${padding}`,
        `H ${padding + innerWidth - cardRadius}`,
        `A ${cardRadius} ${cardRadius} 0 0 1 ${padding + innerWidth} ${padding + cardRadius}`,
        `V ${padding + headerHeight}`,
        `H ${padding}`,
        `V ${padding + cardRadius}`,
        `A ${cardRadius} ${cardRadius} 0 0 1 ${padding + cardRadius} ${padding}`,
        'Z'
    ].join(' ');
    const footerPathD = [
        `M 0 ${footerY}`,
        `H 0 innerWidth}`,
        `V ${footerY + footerHeight - footerRadius}`,
        `A ${footerRadius} ${footerRadius} 0 0 1 ${innerWidth - footerRadius} ${footerY + footerHeight}`,
        `H ${footerRadius}`,
        `A ${footerRadius} ${footerRadius} 0 0 1 0 ${footerY + footerHeight - footerRadius}`,
        `V ${footerY}`,
        'Z'
    ].join(' ');

    // Clamp some long fields to avoid overflow (simple first pass)
    const titleClamped = clampText(title, 48);
    const typeClamped = clampText(type, 64);
    const propertiesText = flavor.properties.map(a => `${escapeXml(a.label)} ${a.value}`).join(' · ');
    const bodyClamped = clampText(body, 320);
    const imageMeta = clampText(imageStyle, 64);

    // Optional QR placement (bottom-right of description area)
    const qrSize = 128;
    const qrX = width - padding - qrSize - 8
    const qrY = footerY - qrSize - 8;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${titleClamped}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="headerGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${headerFill}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.85"/>
    </linearGradient>
    <clipPath id="imageClip">
      <rect x="${imageAreaX}" y="${imageAreaY}" width="${imageAreaW}" height="${imageAreaHeight}" />
    </clipPath>
  </defs>
  <g id="cardTitle" filter="url(#cardShadow)">
    <rect x="${padding}" y="${padding}" rx="${cardRadius}" ry="${cardRadius}" width="${width - padding * 2}" height="${height - padding * 2}" fill="${background}" stroke="${borderColor}" stroke-width="2"/>
    <path d="${headerPathD}" fill="url(#headerGradient)"/>
    <text x="${padding + 24}" y="${padding + 64}" fill="#333333" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="36" font-weight="600">${titleClamped}</text>
  </g>
  <g id="imageArea">
    <rect x="${imageAreaX}" y="${imageAreaY}" width="${imageAreaW}" height="${imageAreaHeight}" fill="#e5e7eb" stroke="#d1d5db" />
    ${options.imageDataUrl ? `<image x="${imageAreaX}" y="${imageAreaY}" width="${imageAreaW}" height="${imageAreaHeight}" href="${options.imageDataUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imageClip)" aria-label="${imageDescription}"/>` : ''}
    ${options.imageDataUrl ? '' : `<text x="${imageAreaX + 18}" y="${imageAreaY + 60}" fill="${textSecondary}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="12">${imageDescription}</text>`}
    ${options.imageDataUrl ? '' : `<text x="${imageAreaX + 18}" y="${imageAreaY + 36}" fill="${textSecondary}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="14" font-weight="600">Image: ${imageMeta || 'N/A'}</text>`}
  </g>
  <g id="details">
    <text x="${detailsX + 16}" y="${detailsY}" fill="${textPrimary}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="16" font-weight="700">${typeClamped}</text>
    <foreignObject x="${detailsX}" y="${detailsY + 24}" width="${detailsW}" height="${footerY - (detailsY + 36)}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; color: ${textPrimary}; font-size: 15px; line-height: 1.3; padding: 16px;">
        ${bodyClamped}
      </div>
    </foreignObject>
    ${options.certQrCodeDataUrl ? `<image x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" href="${options.certQrCodeDataUrl}" preserveAspectRatio="xMidYMid slice" aria-label="Certificate QR Code"/>` : ''}
  </g>
  <g id="footer">
    <path d="${footerPathD}" fill="${footerFill}"/>
    <text x="${padding + 16}" y="${footerY + 24}" fill="${textSecondary}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="14">Tags: ${tags}</text>
    <text x="${width - padding - 16}" y="${footerY + 24}" fill="${textSecondary}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-size="16" text-anchor="end" font-weight="700">${propertiesText}</text>
  </g>
</svg>`;
}

function deriveColors(paletteStr: string): { headerFill: string; accent: string; borderColor: string; footerFill: string } {
    const tokenMap: Record<string, string> = {
        moss: '#14532d',
        fern: '#047857',
        slate: '#334155',
        ember: '#b91c1c',
        coal: '#111827',
        brass: '#b45309',
        mist: '#64748b',
        pearl: '#f5f5f4',
        indigo: '#4338ca',
        sand: '#f59e0b',
        ochre: '#b45309',
        teal: '#0f766e',
        ash: '#4b5563',
        forest: '#065f46',
        bog: '#064e3b',
        mountain: '#374151',
        steppe: '#a16207',
        cavern: '#111827',
        coast: '#0ea5e9',
        ruins: '#6b7280',
        skyreach: '#38bdf8'
    };
    const tokens = paletteStr.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const primaryToken = tokens.find(t => tokenMap[t]);
    const secondaryToken = tokens.slice(1).find(t => tokenMap[t]);
    const primary = primaryToken ? tokenMap[primaryToken] : hslFromString(tokens[0] ?? paletteStr);
    const secondary = secondaryToken ? tokenMap[secondaryToken] : primary;
    const headerFill = primary;
    const accent = secondary;
    const borderColor = primary;
    const footerFill = withAlpha(primary, 0.08);
    return { headerFill, accent, borderColor, footerFill };
}

function hslFromString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 35%)`;
}

function withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
        const hex = color.length === 4
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
            : color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('hsl')) {
        return color.replace(/^hsl\((.*)\)$/i, `hsla($1, ${alpha})`);
    }
    return color;
}

export default renderCardSvg;


