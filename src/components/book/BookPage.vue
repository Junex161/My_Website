<script setup lang="ts">
import { computed } from 'vue';
import { UI, type Lang, type Page, type Recipe } from './types';

const props = defineProps<{
  page: Page;
  lang: Lang;
  recipes: Recipe[];
  side: 'left' | 'right';
  /** recipe currently open (highlighted in the contents) */
  current?: number;
  contactHref: string;
}>();
const emit = defineEmits<{ (e: 'goto', recipe: number): void; (e: 'next'): void }>();

const t = computed(() => UI[props.lang]);
const recipe = computed(() => (props.page.kind === 'recipe' ? props.recipes[props.page.recipe] : null));
const text = computed(() => (recipe.value ? recipe.value[props.lang] : null));

/** page number printed on the page: title 1, contents 2, recipes from 3 */
const pageNo = (i: number) => i + 3;
const folio = computed(() => {
  if (props.page.kind === 'contents') return 2;
  if (props.page.kind === 'recipe') return pageNo(props.page.recipe);
  if (props.page.kind === 'end') return props.recipes.length + 3;
  return null;
});

const groups = computed(() => {
  const order: Recipe['category'][] = ['main', 'soup', 'side', 'breakfast', 'baking'];
  return order
    .map((cat) => ({ cat, items: props.recipes.map((r, i) => ({ r, i })).filter((x) => x.r.category === cat) }))
    .filter((g) => g.items.length);
});

const isHeading = (line: string) => line.trim().endsWith(':');
</script>

<template>
  <div class="page" :class="[side, 'k-' + page.kind]" :lang="lang">
    <!-- Endpaper (inside of the cover, left of the title page) -->
    <div v-if="page.kind === 'endpaper'" class="endpaper" aria-hidden="true"></div>

    <!-- Title page -->
    <div v-else-if="page.kind === 'title'" class="inner title-page">
      <h2 class="book-title">{{ t.book }}</h2>
      <p class="book-sub">{{ t.subtitle }}</p>
      <p class="book-intro">{{ t.intro }}</p>
      <button type="button" class="turn" @click="emit('next')">{{ t.turn }} <span aria-hidden="true">→</span></button>
    </div>

    <!-- Contents -->
    <nav v-else-if="page.kind === 'contents'" class="inner contents" :aria-label="t.contents">
      <h2 class="page-title">{{ t.contents }}</h2>
      <div v-for="g in groups" :key="g.cat" class="toc-group">
        <h3 class="cat">{{ t.cats[g.cat] }}</h3>
        <ol>
          <li v-for="x in g.items" :key="x.i">
            <button type="button" :class="{ on: current === x.i }" :aria-current="current === x.i ? 'page' : undefined" @click="emit('goto', x.i)">
              <span class="toc-name">{{ x.r[lang].title }}</span>
              <span class="leader" aria-hidden="true"></span>
              <span class="toc-num">{{ pageNo(x.i) }}</span>
            </button>
          </li>
        </ol>
      </div>
    </nav>

    <!-- Recipe -->
    <article v-else-if="page.kind === 'recipe' && text && recipe" class="inner recipe">
      <p class="cat">{{ t.cats[recipe.category] }}</p>
      <h2 class="recipe-title">{{ text.title }}</h2>
      <p class="recipe-desc">{{ text.description }}</p>
      <dl class="facts" v-if="text.servings || text.time">
        <div v-if="text.servings"><dt>{{ t.serves }}</dt><dd>{{ text.servings }}</dd></div>
        <div v-if="text.time"><dt>{{ t.time }}</dt><dd>{{ text.time }}</dd></div>
      </dl>
      <h3 class="sec">{{ t.ingredients }}</h3>
      <ul class="ingredients">
        <template v-for="(line, i) in text.ingredients" :key="i">
          <li v-if="isHeading(line)" class="group">{{ line.replace(/:\s*$/, '') }}</li>
          <li v-else>{{ line }}</li>
        </template>
      </ul>
      <h3 class="sec">{{ t.method }}</h3>
      <div class="method" v-html="text.html"></div>
      <aside v-if="text.tip" class="tip">
        <strong>{{ t.note }}</strong>
        <span>{{ text.tip }}</span>
      </aside>
    </article>

    <!-- End -->
    <div v-else-if="page.kind === 'end'" class="inner end-page">
      <h2 class="page-title">{{ t.endTitle }}</h2>
      <p class="book-intro">{{ t.endText }}</p>
      <a class="turn" :href="contactHref">{{ t.endLink }} <span aria-hidden="true">→</span></a>
    </div>

    <p v-if="folio" class="folio">{{ folio }}</p>
  </div>
</template>

<style scoped>
.page {
  position: absolute; inset: 0;
  color: var(--paper-ink);
  overflow: hidden;
  font-family: var(--font);
  background: var(--paper);
}
.page.left { border-radius: 3px 0 0 3px; background: linear-gradient(90deg, var(--paper) 0%, var(--paper) 88%, #ddd5c5 100%); }
.page.right { border-radius: 0 3px 3px 0; background: linear-gradient(90deg, #ddd5c5 0%, var(--paper) 9%, var(--paper) 100%); }

.inner {
  position: relative; height: 100%; overflow-y: auto; overscroll-behavior: contain;
  padding: clamp(28px, 5%, 48px) clamp(24px, 8%, 56px) 64px;
  scrollbar-width: thin; scrollbar-color: #c9bfae transparent;
}
.left .inner { padding-right: clamp(28px, 9%, 64px); }
.right .inner { padding-left: clamp(28px, 9%, 64px); }

/* endpaper: a small repeating star pattern in the cover colour */
.endpaper {
  position: absolute; inset: 0;
  background-color: #6b2a22;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><path d='M22 14l1.6 6.4L30 22l-6.4 1.6L22 30l-1.6-6.4L14 22l6.4-1.6Z' fill='%23f2ede3' fill-opacity='.16'/><circle cx='4' cy='6' r='1' fill='%23f2ede3' fill-opacity='.2'/><circle cx='36' cy='38' r='.8' fill='%23f2ede3' fill-opacity='.2'/></svg>");
}

.title-page { display: flex; flex-direction: column; justify-content: center; }
.book-title { font-size: clamp(2.1rem, 3.6vw, 3rem); font-weight: 750; font-stretch: 118%; line-height: 1; letter-spacing: -0.015em; color: var(--paper-ink); }
.book-sub { margin-top: 14px; font-size: 1.1rem; color: var(--paper-ink-2); }
.book-intro { margin-top: 28px; font-size: .97rem; line-height: 1.6; max-width: 34ch; }
.turn { margin-top: 32px; align-self: flex-start; display: inline-flex; gap: 8px; align-items: center; background: none; border: 0; border-bottom: 1.5px solid currentColor; padding: 0 0 2px; font: 600 .95rem var(--font); color: var(--paper-accent); cursor: pointer; text-decoration: none; }
.turn:hover { color: var(--paper-ink); }

.page-title { font-size: 1.9rem; font-weight: 700; font-stretch: 115%; margin: 0 0 22px; }
.cat { margin: 0; font-size: .82rem; font-weight: 600; color: var(--paper-accent); }
.toc-group + .toc-group { margin-top: 20px; }
.toc-group ol { list-style: none; margin: 6px 0 0; padding: 0; }
.toc-group button { width: 100%; display: flex; align-items: baseline; gap: 8px; padding: 6px 0; background: none; border: 0; color: var(--paper-ink); font: inherit; cursor: pointer; text-align: left; }
.toc-name { font-size: 1.02rem; }
.leader { flex: 1; border-bottom: 1.5px dotted #bdb3a2; transform: translateY(-4px); }
.toc-num { font-size: .9rem; color: var(--paper-ink-2); font-variant-numeric: tabular-nums; }
.toc-group button:hover .toc-name { color: var(--paper-accent); }
.toc-group button.on .toc-name { font-weight: 650; color: var(--paper-accent); }
.toc-group button.on .toc-num { color: var(--paper-accent); }

.recipe-title { margin-top: 6px; font-size: clamp(1.8rem, 2.8vw, 2.4rem); font-weight: 750; font-stretch: 115%; line-height: 1.02; letter-spacing: -0.01em; }
.recipe-desc { margin-top: 12px; font-size: 1rem; line-height: 1.5; color: var(--paper-ink-2); }
.facts { display: flex; gap: 32px; margin: 18px 0 0; }
.facts div { display: flex; flex-direction: column; }
.facts dt { font-size: .8rem; color: var(--paper-ink-2); }
.facts dd { margin: 0; font-weight: 650; }
.sec { margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #d3cab9; font-size: 1rem; font-weight: 700; font-stretch: 110%; }
.ingredients { list-style: none; margin: 0; padding: 0; font-size: .95rem; line-height: 1.45; columns: 2; column-gap: 28px; }
.ingredients li { padding: 3px 0 3px 14px; position: relative; break-inside: avoid; }
.ingredients li:not(.group)::before { content: ''; position: absolute; left: 0; top: .78em; width: 5px; height: 1.5px; background: var(--paper-accent); }
.ingredients li.group { padding-left: 0; margin-top: 10px; font-weight: 650; color: var(--paper-accent); break-after: avoid; }
.ingredients li.group:first-child { margin-top: 0; }

.method :deep(ol) { list-style: none; counter-reset: step; margin: 0; padding: 0; }
.method :deep(li) { counter-increment: step; position: relative; padding: 0 0 12px 30px; font-size: .95rem; line-height: 1.55; }
.method :deep(li)::before { content: counter(step); position: absolute; left: 0; top: 0; font-weight: 700; font-stretch: 115%; color: var(--paper-accent); font-variant-numeric: tabular-nums; }
.method :deep(p) { margin: 0 0 10px; font-size: .95rem; }
.tip { margin-top: 16px; padding: 14px 16px; background: #e9e2d4; border-radius: 4px; font-size: .93rem; line-height: 1.5; }
.tip strong { display: block; margin-bottom: 2px; font-weight: 650; color: var(--paper-accent); }

.end-page { display: flex; flex-direction: column; justify-content: center; }

.folio { position: absolute; bottom: 0; left: 0; right: 0; margin: 0; padding: 22px 0 16px; text-align: center; font-size: .78rem; color: var(--paper-ink-2); pointer-events: none; font-variant-numeric: tabular-nums; background: linear-gradient(180deg, transparent, var(--paper) 50%); }
.left .folio { right: 10%; }
.right .folio { left: 8%; }

@media (max-width: 520px) {
  .ingredients { columns: 1; }
}
</style>
