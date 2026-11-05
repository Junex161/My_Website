export type Lang = 'en' | 'de';

export type RecipeText = {
  title: string;
  description: string;
  servings?: string;
  time?: string;
  ingredients: string[];
  tip?: string;
  html: string;
};

export type Recipe = {
  slug: string;
  category: 'main' | 'soup' | 'baking' | 'breakfast' | 'side';
  en: RecipeText;
  de: RecipeText;
};

export type Page =
  | { kind: 'endpaper' }
  | { kind: 'title' }
  | { kind: 'contents' }
  | { kind: 'recipe'; recipe: number }
  | { kind: 'end' };

export const UI = {
  en: {
    book: 'My Vegan Cookbook',
    subtitle: 'Recipes from my kitchen',
    intro: 'Everything in here is vegan, and most of it is comfort food: the things I cook for myself and for friends, written down so I don’t forget them.',
    turn: 'Turn the page',
    contents: 'Contents',
    ingredients: 'Ingredients',
    method: 'Method',
    serves: 'Makes',
    time: 'Time',
    note: 'Julian’s note',
    cats: { main: 'Mains', soup: 'Soups', baking: 'Baking', breakfast: 'Breakfast', side: 'Sides' },
    endTitle: 'To be continued',
    endText: 'More recipes are on their way. Got one I should try?',
    endLink: 'Write to me',
    prev: 'Previous page',
    next: 'Next page',
    page: 'Page',
    of: 'of',
    language: 'Language',
  },
  de: {
    book: 'Mein veganes Kochbuch',
    subtitle: 'Rezepte aus Julians Küche',
    intro: 'Alles hier drin ist vegan, und das meiste davon ist Soulfood: Sachen, die ich für mich und meine Freund_innen koche, aufgeschrieben, damit ich sie nicht vergesse.',
    turn: 'Umblättern',
    contents: 'Inhalt',
    ingredients: 'Zutaten',
    method: 'Zubereitung',
    serves: 'Menge',
    time: 'Zeit',
    note: 'Julians Tipp',
    cats: { main: 'Hauptgerichte', soup: 'Suppen', baking: 'Backen', breakfast: 'Frühstück', side: 'Beilagen' },
    endTitle: 'Fortsetzung folgt',
    endText: 'Weitere Rezepte sind in Arbeit. Hast du eins, das ich ausprobieren sollte?',
    endLink: 'Schreib mir',
    prev: 'Vorherige Seite',
    next: 'Nächste Seite',
    page: 'Seite',
    of: 'von',
    language: 'Sprache',
  },
} as const;
