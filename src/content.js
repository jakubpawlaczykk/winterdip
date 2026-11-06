// Wszystkie teksty i linki strony. Zmieniasz tutaj, reszta dostosuje się sama.
// Czasy `from` / `to` to sekundy filmu.

export const meta = {
  brand: 'Winter Dip',
  title: 'Winter Dip – kubek, w którym gorąca czekolada nie stygnie',
  description:
    'Ręcznie szkliwiony kubek z miejscem na podgrzewacz. Jeden płomień utrzymuje czekoladę w cieple przez cały świąteczny wieczór.',
  // Pełny adres strony bez końcowego ukośnika, np. https://winterdip.pl
  // Potrzebny, żeby obraz OG działał przy udostępnianiu linku.
  siteUrl: 'https://jakubpawlaczykk.github.io/winterdip',
};

export const links = {
  collection: '#zalety', // docelowo: adres kolekcji w sklepie
  buy: '#prezent', // docelowo: adres produktu w sklepie
};

export const scroll = {
  // Długość przypiętej animacji w vh.
  desktopVh: 550,
  mobileVh: 380,
  // Ile sekund "filmu" zatrzymać na końcu, żeby finał chwilę został na ekranie.
  holdEnd: 2,
};

// side: 'left' lub 'right' (na desktopie). Na telefonie teksty są nad kubkiem.
export const stages = [
  {
    id: 'start',
    from: 0,
    to: 2.3,
    side: 'left',
    logo: true,
    heading: 'Świąteczny rytuał zaczyna się tutaj',
    hint: 'Przewiń w dół',
  },
  {
    id: 'ceramika',
    from: 2.9,
    to: 7.9,
    side: 'right',
    heading: 'Ręcznie szkliwiona ceramika',
  },
  {
    id: 'plomien',
    from: 8.6,
    to: 12.6,
    side: 'left',
    heading: 'Wystarczy jeden płomień',
  },
  {
    id: 'czekolada',
    from: 13.8,
    to: 24,
    side: 'right',
    heading: 'Gorąca czekolada, która nie stygnie',
  },
  {
    id: 'final',
    from: 25.2,
    side: 'left',
    logo: true,
    cta: [
      { label: 'Kup teraz', href: 'buy', primary: true },
      { label: 'Zobacz kolekcję', href: 'collection' },
    ],
  },
];

// Widoczne, gdy system ma wyłączone animacje i strona pokazuje statyczną klatkę.
export const motionPrompt = {
  text: 'Animacje są wyłączone w ustawieniach urządzenia.',
  button: 'Włącz animację',
};

export const features = {
  heading: 'Mały płomień, dużo ciepła',
  items: [
    {
      icon: 'flame',
      title: 'Podgrzewacz w podstawie',
      text: 'Łukowy otwór od spodu kubka mieści zwykłą świeczkę tealight.',
    },
    {
      icon: 'cup',
      title: 'Ciepło do ostatniego łyku',
      text: 'Płomień ogrzewa czekoladę od dołu, więc możesz pić ją bez pośpiechu.',
    },
    {
      icon: 'glaze',
      title: 'Ręczne szkliwienie',
      text: 'Głęboki, czekoladowy brąz z połyskiem, który pięknie wygląda na stole.',
    },
  ],
};

export const gift = {
  heading: 'Idealny prezent na Święta',
  text: 'Dla kogoś, kto kocha długie wieczory, koc i kubek czegoś słodkiego. Wystarczy dodać czekoladę i zapalić świeczkę.',
  cta: { label: 'Kup teraz', href: 'buy' },
};

export const footer = {
  note: 'Świąteczna kolekcja kubków do gorącej czekolady.',
};
