const themeToggle = document.getElementById('theme-toggle');
function applyThemeIcon(){
  themeToggle.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀';
}
applyThemeIcon();
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('archivir-theme', next);
  applyThemeIcon();
});

const siteLogo = document.getElementById('site-logo');
const logoMid = siteLogo.querySelector('.logo-mid');
const logoTail = siteLogo.querySelector('.logo-tail');
const logoMidText = siteLogo.querySelector('.logo-mid-text');
const logoTailText = siteLogo.querySelector('.logo-tail-text');
// every wait and CSS transition in this animation is a multiple of one
// base beat, so open -> type -> hold -> decompose -> close -> settle
// reads as a single tempo instead of separately-tuned durations.
const BEAT = 100; // ms
const MS_PER_LETTER = BEAT;
function splitLetters(el){
  const text = el.textContent;
  el.textContent = '';
  let maxDelay = 0;
  text.split('').forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'logo-letter';
    span.textContent = ch === ' ' ? ' ' : ch;
    const delay = i * MS_PER_LETTER;
    span.style.transitionDelay = delay + 'ms';
    maxDelay = Math.max(maxDelay, delay);
    el.appendChild(span);
  });
  return maxDelay;
}
const midRevealMs = splitLetters(logoMidText);
const tailRevealMs = splitLetters(logoTailText);
const typeDuration = Math.max(midRevealMs, tailRevealMs) + BEAT; // + the last letter's own fade-in beat
// dust-disintegration exit: each letter drifts off on its own random
// heading rather than the whole word fading uniformly
function decomposeText(el){
  el.querySelectorAll('.logo-letter').forEach((letter) => {
    const dx = (Math.random() - 0.5) * 50;
    const dy = -18 - Math.random() * 34;
    const drot = (Math.random() - 0.5) * 100;
    letter.style.setProperty('--dx', dx.toFixed(1) + 'px');
    letter.style.setProperty('--dy', dy.toFixed(1) + 'px');
    letter.style.setProperty('--drot', drot.toFixed(1) + 'deg');
    letter.style.transitionDelay = (Math.random() * 2 * BEAT).toFixed(0) + 'ms';
    letter.classList.add('is-decomposing');
  });
}
function resetLetters(el){
  el.querySelectorAll('.logo-letter').forEach((letter, i) => {
    letter.classList.remove('is-decomposing');
    letter.style.transitionDelay = (i * MS_PER_LETTER) + 'ms';
  });
}
const OPEN_BEATS = 6;       // matches .logo-mid/.logo-tail.is-open .6s transition
const HOLD_BEATS = 5;       // brief beat to register the full word, not a dead pause
const DECOMPOSE_BEATS = 9;  // covers the longest decompose transition + its random delay, +1 beat margin
const REST_BEATS = 2;       // short rest before the space collapses
const CLOSE_BEATS = 3;      // matches .logo-mid/.logo-tail's base .3s transition
const SETTLE_BEATS = 4;     // matches .is-settling's .4s bounce
let logoAnimating = false;
siteLogo.addEventListener('click', (e) => {
  e.preventDefault();
  if (logoAnimating) return;
  logoAnimating = true;
  // phase 1: open both gaps at once (text still invisible) — this is
  // what pushes "vir" into its final position via real text reflow
  logoMid.classList.add('is-open');
  logoTail.classList.add('is-open');
  setTimeout(() => {
    // phase 2: "vir" has settled — type "tecture" and "tuelle" in together,
    // letter by letter, left to right
    logoMidText.classList.add('is-visible');
    logoTailText.classList.add('is-visible');
    setTimeout(() => {
      // phase 3: hold, then let each letter disintegrate on its own.
      // is-visible comes off in the same tick as is-decomposing goes on,
      // so the higher-specificity ".is-visible .logo-letter{opacity:1}"
      // rule never gets a chance to fight the decompose opacity/delay
      decomposeText(logoMidText);
      decomposeText(logoTailText);
      logoMidText.classList.remove('is-visible');
      logoTailText.classList.remove('is-visible');
      setTimeout(() => {
        resetLetters(logoMidText);
        resetLetters(logoTailText);
        setTimeout(() => {
          logoMid.classList.remove('is-open');
          logoTail.classList.remove('is-open');
          setTimeout(() => {
            siteLogo.classList.add('is-settling');
            setTimeout(() => {
              siteLogo.classList.remove('is-settling');
              logoAnimating = false;
            }, SETTLE_BEATS * BEAT);
          }, CLOSE_BEATS * BEAT);
        }, REST_BEATS * BEAT);
      }, DECOMPOSE_BEATS * BEAT);
    }, typeDuration + HOLD_BEATS * BEAT);
  }, OPEN_BEATS * BEAT);
});
