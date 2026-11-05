<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BookPage from './BookPage.vue';
import { UI, type Lang, type Page, type Recipe } from './types';

const props = defineProps<{ recipes: Recipe[]; contactHref: string }>();

/*
  Positions follow the printed page numbers minus one:
  0 title, 1 contents, 2.. recipes, last = end page.
  Large screens: once you have turned past the title, the contents stay on the left
  and the right page shows the recipe. Small screens show one page at a time.
*/
const n = computed(() => props.recipes.length);
const last = computed(() => n.value + 2);
const pos = ref(0);
const dir = ref<1 | -1>(1);
const wide = ref(true);
const lang = ref<Lang>('en');
const t = computed(() => UI[lang.value]);

const pageAt = (p: number): Page => {
  if (p <= 0) return { kind: 'title' };
  if (p === 1) return { kind: 'contents' };
  if (p >= last.value) return { kind: 'end' };
  return { kind: 'recipe', recipe: p - 2 };
};

// what the right (or only) page shows; on large screens the contents never sit on the right
const rightPos = computed(() => (wide.value && pos.value === 1 ? Math.min(2, last.value) : pos.value));
const rightPage = computed(() => pageAt(rightPos.value));
const leftPage = computed<Page>(() => (rightPos.value === 0 ? { kind: 'endpaper' } : { kind: 'contents' }));
const currentRecipe = computed(() => (rightPage.value.kind === 'recipe' ? rightPage.value.recipe : undefined));

const step = (d: 1 | -1) => {
  let p = rightPos.value + d;
  if (wide.value && p === 1) p += d; // skip the contents as a separate page
  return Math.max(0, Math.min(last.value, p));
};
const canPrev = computed(() => rightPos.value > 0);
const canNext = computed(() => rightPos.value < last.value);

function go(p: number) {
  p = Math.max(0, Math.min(last.value, p));
  if (p === rightPos.value && !(p === 1 && !wide.value)) return;
  dir.value = p > rightPos.value ? 1 : -1;
  pos.value = p;
}
const next = () => canNext.value && go(step(1));
const prev = () => canPrev.value && go(step(-1));
const gotoRecipe = (i: number) => go(i + 2);
const gotoContents = () => go(wide.value ? Math.max(2, rightPos.value) : 1);

const indicator = computed(() => `${t.value.page} ${rightPos.value + 1} ${t.value.of} ${last.value + 1}`);
const liveText = computed(() => (currentRecipe.value !== undefined ? props.recipes[currentRecipe.value][lang.value].title : indicator.value));

function setLang(l: Lang) {
  lang.value = l;
  try { localStorage.setItem('cookbook-lang', l); } catch {}
}

/* deep links: /cookbook/#spaetzle */
function readHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  const i = props.recipes.findIndex((r) => r.slug === slug);
  if (i >= 0) { dir.value = 1; pos.value = i + 2; }
}
watch(rightPos, () => {
  const slug = currentRecipe.value !== undefined ? props.recipes[currentRecipe.value].slug : '';
  history.replaceState(null, '', location.pathname + location.search + (slug ? '#' + slug : ''));
});

/* keyboard + swipe */
function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName))) return;
  if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
}
let sx = 0, sy = 0, tracking = false;
function onDown(e: PointerEvent) { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; tracking = true; } }
function onUp(e: PointerEvent) {
  if (!tracking) return;
  tracking = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? next : prev)();
}

let mq: MediaQueryList;
const syncWide = () => { wide.value = mq.matches; };
onMounted(() => {
  mq = matchMedia('(min-width: 900px)');
  syncWide();
  mq.addEventListener('change', syncWide);
  let saved: string | null = null;
  try { saved = localStorage.getItem('cookbook-lang'); } catch {}
  if (saved === 'de' || saved === 'en') lang.value = saved;
  else if ((navigator.language || '').toLowerCase().startsWith('de')) lang.value = 'de';
  readHash();
  window.addEventListener('hashchange', readHash);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  mq?.removeEventListener('change', syncWide);
  window.removeEventListener('hashchange', readHash);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="book-app" :class="{ wide }">
    <div class="toolbar">
      <button v-if="!wide || rightPos === 0" type="button" class="tool" @click="gotoContents">{{ t.contents }}</button>
      <span v-else></span>
      <div class="lang" role="group" :aria-label="t.language">
        <button type="button" :aria-pressed="lang === 'en'" @click="setLang('en')">English</button>
        <button type="button" :aria-pressed="lang === 'de'" @click="setLang('de')">Deutsch</button>
      </div>
    </div>

    <div class="stage" @pointerdown="onDown" @pointerup="onUp" @pointercancel="tracking = false">
      <div class="cover">
        <div class="pages">
          <div v-if="wide" class="half left-half">
            <Transition name="fade">
              <BookPage :key="leftPage.kind" :page="leftPage" :lang="lang" :recipes="recipes" side="left" :current="currentRecipe" :contact-href="contactHref" @goto="gotoRecipe" @next="next" />
            </Transition>
          </div>
          <div class="half right-half" :class="dir === 1 ? 'fwd' : 'back'">
            <Transition :name="dir === 1 ? 'fwd' : 'back'">
              <BookPage :key="rightPos" :page="rightPage" :lang="lang" :recipes="recipes" :side="wide ? 'right' : 'right'" :current="currentRecipe" :contact-href="contactHref" @goto="gotoRecipe" @next="next" />
            </Transition>
          </div>
          <div v-if="wide" class="gutter" aria-hidden="true"></div>
        </div>
      </div>
      <div class="ribbon" aria-hidden="true"></div>
    </div>

    <div class="pager">
      <button type="button" class="nav" :disabled="!canPrev" @click="prev" :aria-label="t.prev">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <p class="indicator">{{ indicator }}</p>
      <button type="button" class="nav" :disabled="!canNext" @click="next" :aria-label="t.next">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>
  </div>
</template>

<style scoped>
.book-app { display: flex; flex-direction: column; align-items: center; gap: 22px; width: 100%; }

.toolbar { width: 100%; max-width: 1080px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.tool { background: none; border: 1px solid var(--line-2); color: var(--ink); border-radius: 4px; padding: 9px 16px; font: 500 .92rem var(--font); cursor: pointer; transition: border-color .2s; }
.tool:hover { border-color: var(--ink-2); }
.lang { display: inline-flex; border: 1px solid var(--line-2); border-radius: 4px; overflow: hidden; }
.lang button { border: 0; background: none; color: var(--ink-2); font: 500 .92rem var(--font); padding: 9px 16px; cursor: pointer; transition: background .2s, color .2s; }
.lang button + button { border-left: 1px solid var(--line-2); }
.lang button[aria-pressed='true'] { background: var(--ink); color: var(--bg); }
.lang button:not([aria-pressed='true']):hover { color: var(--ink); }

.stage { position: relative; width: 100%; display: flex; justify-content: center; touch-action: pan-y; }
.cover {
  position: relative; z-index: 1;
  width: min(1080px, 100%, calc((100svh - 220px) * 1.38));
  aspect-ratio: 1.38;
  min-height: 520px;
  padding: 12px;
  border-radius: 8px;
  background:
    repeating-linear-gradient(45deg, rgba(0, 0, 0, .05) 0 2px, transparent 2px 5px),
    linear-gradient(160deg, #6b2a22, #4a1b16 60%, #39140f);
  box-shadow: inset 0 0 0 1px rgba(255, 220, 200, .1), 0 30px 60px -24px rgba(0, 0, 0, .9);
}
.pages { position: relative; width: 100%; height: 100%; }
.half { position: absolute; top: 0; bottom: 0; overflow: hidden; }
.left-half { left: 0; width: 50%; }
.right-half { right: 0; width: 50%; }
.book-app:not(.wide) .right-half { left: 0; width: 100%; }
.gutter { position: absolute; top: 0; bottom: 0; left: 50%; width: 70px; transform: translateX(-50%); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, transparent 0%, rgba(50, 40, 25, .08) 30%, rgba(40, 30, 20, .28) 49%, rgba(255, 250, 240, .15) 50.5%, rgba(50, 40, 25, .08) 65%, transparent 100%); }
.ribbon { position: absolute; z-index: 0; bottom: -36px; left: calc(50% + 200px); width: 14px; height: 70px; background: linear-gradient(90deg, #7b1f1a, #a5302a 50%, #7b1f1a); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%); }

/* page change on the right: the new sheet slides in over the old one */
.fwd-enter-active, .back-enter-active { transition: transform .5s cubic-bezier(.22, .8, .24, 1), opacity .35s ease, box-shadow .5s; z-index: 2; }
.fwd-leave-active, .back-leave-active { transition: transform .5s cubic-bezier(.22, .8, .24, 1), opacity .5s ease; z-index: 1; }
.fwd-enter-from { transform: translateX(36px); opacity: 0; box-shadow: -18px 0 30px -12px rgba(30, 20, 10, .45); }
.fwd-leave-to { transform: translateX(-12px); opacity: 0; }
.back-enter-from { transform: translateX(-24px); opacity: 0; }
.back-leave-to { transform: translateX(36px); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .45s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-leave-active { z-index: 1; }

.pager { margin-top: 14px; display: flex; align-items: center; gap: 16px; }
.nav { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line-2); background: none; color: var(--ink); display: grid; place-items: center; cursor: pointer; transition: border-color .2s; }
.nav svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.nav:hover:not(:disabled) { border-color: var(--ink-2); }
.nav:disabled { opacity: .3; cursor: default; }
.indicator { margin: 0; min-width: 120px; text-align: center; font-size: .92rem; color: var(--ink-2); font-variant-numeric: tabular-nums; }

.book-app:not(.wide) .cover { width: min(560px, 100%); aspect-ratio: auto; height: min(76svh, 760px); min-height: 480px; padding: 8px; }
.book-app:not(.wide) .ribbon { left: auto; right: 30px; bottom: -28px; height: 56px; }

@media (prefers-reduced-motion: reduce) {
  .fwd-enter-active, .fwd-leave-active, .back-enter-active, .back-leave-active, .fade-enter-active, .fade-leave-active { transition: none; }
}
</style>
