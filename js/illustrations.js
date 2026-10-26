// Small spot illustrations in the learner's style: a pale round ground, a baby
// with rosy cheeks, soft teal blankets. Fixed inks so they look the same in
// night mode.

const face = (cx, cy, r, sleeping = false) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--ill-skin)"/>
  <circle cx="${cx - r * 0.98}" cy="${cy + 2}" r="${r * 0.22}" fill="var(--ill-skin-shade)"/>
  <circle cx="${cx + r * 0.98}" cy="${cy + 2}" r="${r * 0.22}" fill="var(--ill-skin-shade)"/>
  <path d="M${cx - r * 0.75} ${cy - r * 0.45} q${r * 0.2} -${r * 0.75} ${r * 0.85} -${r * 0.62} q${r * 0.1} -${r * 0.45} ${r * 0.55} -${r * 0.2} q${r * 0.4} -${r * 0.05} ${r * 0.45} ${r * 0.5} q-${r * 0.8} -${r * 0.15} -${r * 1.85} ${r * 0.32}z" fill="var(--ill-hair)"/>
  ${sleeping
    ? `<path d="M${cx - r * 0.5} ${cy + 1} q${r * 0.18} ${r * 0.16} ${r * 0.36} 0 M${cx + r * 0.14} ${cy + 1} q${r * 0.18} ${r * 0.16} ${r * 0.36} 0" stroke="var(--ill-feature)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${cx - r * 0.33}" cy="${cy}" r="${r * 0.09}" fill="var(--ill-feature)"/><circle cx="${cx + r * 0.33}" cy="${cy}" r="${r * 0.09}" fill="var(--ill-feature)"/>
       <path d="M${cx - r * 0.2} ${cy + r * 0.38} q${r * 0.2} ${r * 0.2} ${r * 0.4} 0" stroke="var(--ill-feature)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`}
  <circle cx="${cx - r * 0.58}" cy="${cy + r * 0.32}" r="${r * 0.16}" fill="var(--ill-cheek)" opacity=".7"/>
  <circle cx="${cx + r * 0.58}" cy="${cy + r * 0.32}" r="${r * 0.16}" fill="var(--ill-cheek)" opacity=".7"/>`;

const wrap = (inner) => `<svg class="ill" viewBox="0 0 140 140" aria-hidden="true">${inner}</svg>`;

export const ill = {
  sleeping: () => wrap(`
    <ellipse cx="72" cy="78" rx="62" ry="56" fill="var(--ill-ground)"/>
    <circle cx="112" cy="30" r="11" fill="#9DB3E8"/><circle cx="117" cy="26" r="10" fill="var(--ill-ground)"/>
    <circle cx="96" cy="20" r="2" fill="#9DB3E8"/>
    <rect x="34" y="70" width="80" height="10" rx="5" fill="#fff"/>
    ${face(64, 64, 17, true)}
    <path d="M28 84 q4 -12 20 -12 h52 q16 0 18 12 v16 a6 6 0 0 1 -6 6 h-78 a6 6 0 0 1 -6 -6z" fill="var(--ill-blanket)"/>
    <path d="M60 74 q8 14 2 32" stroke="var(--ill-blanket-shade)" stroke-width="3" fill="none"/>`),

  cot: () => wrap(`
    <ellipse cx="70" cy="78" rx="62" ry="52" fill="var(--ill-ground)"/>
    <path d="M114 22 l3 -3 a3 3 0 0 1 4 4 l-7 7 -7 -7 a3 3 0 0 1 4 -4z" fill="var(--ill-heart)"/>
    <rect x="18" y="38" width="7" height="80" rx="3" fill="var(--ill-wood-shade)"/>
    <rect x="115" y="38" width="7" height="80" rx="3" fill="var(--ill-wood-shade)"/>
    <rect x="22" y="104" width="96" height="8" rx="3" fill="var(--ill-wood)"/>
    <rect x="22" y="48" width="96" height="6" rx="3" fill="var(--ill-wood)"/>
    ${face(56, 76, 13, true)}
    <path d="M42 92 q4 -8 18 -8 h40 q12 0 12 8 v12 h-70z" fill="var(--ill-blanket)"/>
    <circle cx="98" cy="72" r="7" fill="var(--ill-wood-shade)"/><circle cx="93" cy="66" r="3" fill="var(--ill-wood-shade)"/><circle cx="103" cy="66" r="3" fill="var(--ill-wood-shade)"/>
    ${[34, 46, 58, 70, 82, 94, 106].map((x) => `<rect x="${x}" y="54" width="4" height="50" rx="2" fill="var(--ill-wood)" opacity=".9"/>`).join('')}`),

  asking: () => wrap(`
    <ellipse cx="74" cy="78" rx="60" ry="56" fill="var(--ill-ground)"/>
    <circle cx="48" cy="36" r="17" fill="var(--ill-bubble)"/><path d="M52 50 l6 10 -12 -6z" fill="var(--ill-bubble)"/>
    <text x="48" y="43" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ill-bubble-ink)" font-family="system-ui">?</text>
    <path d="M110 22 l4 -6 M116 30 l7 -3 M104 18 v-6" stroke="var(--ill-spark)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="124" cy="46" r="2.5" fill="var(--ill-heart)"/>
    ${face(86, 72, 22)}
    <path d="M54 120 q4 -22 32 -22 q28 0 32 22z" fill="var(--ill-blanket)"/>`),

  clipboard: () => wrap(`
    <ellipse cx="72" cy="78" rx="60" ry="54" fill="var(--ill-ground)"/>
    <path d="M24 34 l2.5 -2.5 a2.6 2.6 0 0 1 3.6 3.6 l-6.1 6.1 -6.1 -6.1 a2.6 2.6 0 0 1 3.6 -3.6z" fill="var(--ill-heart)"/>
    <path d="M112 22 l4 -6 M118 30 l7 -3 M106 18 v-6" stroke="var(--ill-spark)" stroke-width="3" stroke-linecap="round"/>
    <rect x="38" y="30" width="54" height="76" rx="8" fill="var(--ill-wood)"/>
    <rect x="44" y="38" width="42" height="62" rx="4" fill="#fff"/>
    <rect x="54" y="24" width="22" height="12" rx="4" fill="var(--ill-wood-shade)"/>
    <path d="M50 52 l4 4 8 -8" stroke="var(--ill-spark)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M66 54 h14 M50 68 h30 M50 78 h26 M50 88 h22" stroke="var(--ill-wood-shade)" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 30 v22 a12 12 0 0 1 -24 0" stroke="#4E6BC2" stroke-width="4" fill="none"/>
    <path d="M100 52 v12 a14 14 0 0 0 14 14" stroke="#4E6BC2" stroke-width="4" fill="none"/>
    <circle cx="116" cy="80" r="8" fill="#9DB3E8" stroke="#4E6BC2" stroke-width="3"/>`),

  records: () => wrap(`
    <ellipse cx="72" cy="78" rx="60" ry="54" fill="var(--ill-ground)"/>
    ${face(78, 62, 20)}
    <path d="M46 116 q4 -26 32 -26 q28 0 32 26z" fill="var(--ill-blanket)"/>
    <rect x="22" y="70" width="34" height="42" rx="5" fill="#fff" stroke="var(--ill-wood-shade)" stroke-width="2"/>
    <path d="M29 82 h20 M29 90 h16 M29 98 h18" stroke="var(--ill-wood-shade)" stroke-width="3" stroke-linecap="round"/>`),

  room: () => wrap(`
    <ellipse cx="72" cy="78" rx="60" ry="54" fill="var(--ill-ground)"/>
    <rect x="30" y="36" width="58" height="42" rx="6" fill="#fff" stroke="var(--ill-wood-shade)" stroke-width="2"/>
    <rect x="38" y="44" width="42" height="26" rx="3" fill="#CFE6F1"/>
    <path d="M44 64 l10 -10 8 8 6 -6 10 10" stroke="#8BB7CB" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <circle cx="96" cy="88" r="20" fill="#fff" stroke="var(--ill-spark)" stroke-width="3"/>
    <path d="M96 76 l9 4 v6 c0 6 -4 10 -9 12 c-5 -2 -9 -6 -9 -12 v-6z" fill="var(--ill-blanket)"/>
    <path d="M91 88 l4 4 6 -7" stroke="var(--teal-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${face(56, 102, 11)}`),
};
