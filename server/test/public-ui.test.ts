import { PageHero, HeroChip } from '../../src/components/PageHero';
import { CTASection } from '../../src/components/CTASection';
import { activeNavigationTarget } from '../../src/lib/activeNavigation';
import { Navbar } from '../../src/components/Navbar';
import assert from 'node:assert/strict';
import { PhotoCreditsPage } from '../../src/pages/PhotoCreditsPage';
import { AuthorAvatar } from '../../src/components/AuthorAvatar';
import { createElement, type ComponentType, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { test } from 'node:test';
import { PublicSiteContext, type PublicSiteApi } from '../../src/context/PublicSiteContext';
import { queryKeys } from '../../src/lib/queryClient';
import { EMPTY_CONTENT } from '../../src/lib/api/content';
import { SearchModal } from '../../src/components/SearchModal';
import { InquiryModal } from '../../src/components/InquiryModal';
import { QuickSearch } from '../../src/components/QuickSearch';
import { HomePage } from '../../src/pages/HomePage';
import { PlanPage } from '../../src/pages/PlanPage';
import { JournalPage } from '../../src/pages/JournalPage';
import { AboutPage } from '../../src/pages/AboutPage';
import { DestinationsPage } from '../../src/pages/DestinationsPage';
import { ExplorePage } from '../../src/pages/ExplorePage';
import { DestinationPage } from '../../src/pages/DestinationPage';
import { ExperiencesPage } from '../../src/pages/ExperiencesPage';
import { ExperiencePage } from '../../src/pages/ExperiencePage';
import { ToursPage } from '../../src/pages/ToursPage';
import { TourPage } from '../../src/pages/TourPage';
import { ArticlePage } from '../../src/pages/ArticlePage';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { DESTINATIONS } from '../../scripts/fixtures/destinations';
import { EXPERIENCE_CATEGORIES, FEATURED_EXPERIENCES } from '../../scripts/fixtures/experiences';
import { TOURS } from '../../scripts/fixtures/tours';
import { ARTICLES } from '../../scripts/fixtures/journal';
import { HERO_SLIDES } from '../../scripts/fixtures/heroSlides';
import { HIDDEN_GEMS } from '../../scripts/fixtures/hiddenGems';
import { PHOTO_STORIES } from '../../scripts/fixtures/photoStories';
import { PILLARS } from '../../scripts/fixtures/pillars';

const api: PublicSiteApi = { openInquiry: () => undefined, openSearch: () => undefined, whatsappHref: null, pageSubject: null, setPageSubject: () => undefined };
function render(element: ReactElement, route = '/') {
  const client = new QueryClient();
  client.setQueryData(queryKeys.siteContent, { ...EMPTY_CONTENT, destinations: DESTINATIONS,
    experienceCategories: EXPERIENCE_CATEGORIES, featuredExperiences: FEATURED_EXPERIENCES,
    tours: TOURS.map(t => ({ ...t, stops: [] })), articles: ARTICLES, heroSlides: HERO_SLIDES,
    hiddenGems: HIDDEN_GEMS, photoStories: PHOTO_STORIES, pillars: PILLARS });
  try {
    return renderToStaticMarkup(createElement(QueryClientProvider, { client },
      createElement(MemoryRouter, { initialEntries: [route] },
        createElement(PublicSiteContext.Provider, { value: api }, element))));
  } finally { client.clear(); }
}

test('every public page type renders its existing content without throwing (markup check, not a browser layout)', () => {
  const pages: Array<[string, string, ComponentType]> = [
    ['/plan', '/plan', PlanPage], ['/journal', '/journal', JournalPage],
    ['/', '/', HomePage], ['/about', '/about', AboutPage], ['/destinations', '/destinations', DestinationsPage], ['/explore', '/explore', ExplorePage],
    ['/destinations/ella', '/destinations/:slug', DestinationPage], ['/experiences', '/experiences', ExperiencesPage],
    [`/experiences/${FEATURED_EXPERIENCES[0].id}`, '/experiences/:slug', ExperiencePage],
    ['/tours', '/tours', ToursPage], [`/tours/${TOURS[0].id}`, '/tours/:slug', TourPage],
    [`/journal/${ARTICLES[0].id}`, '/journal/:slug', ArticlePage], ['/photo-credits', '/photo-credits', PhotoCreditsPage], ['/missing', '*', NotFoundPage]
  ];
  for (const row of DESTINATIONS) pages.push(['/destinations/'+row.id, '/destinations/:slug', DestinationPage]);
  for (const row of FEATURED_EXPERIENCES) pages.push(['/experiences/'+row.id, '/experiences/:slug', ExperiencePage]);
  for (const row of TOURS) pages.push(['/tours/'+row.id, '/tours/:slug', TourPage]);
  for (const row of ARTICLES) pages.push(['/journal/'+row.id, '/journal/:slug', ArticlePage]);
  pages.push(['/#explore-map','/',HomePage], ['/#planner','/',HomePage], ['/#journal','/',HomePage], ['/about#contact','/about',AboutPage], ['/destinations?category=Wildlife','/destinations',DestinationsPage]);
  for (const [route, path, page] of pages) {
    const html = render(createElement(Routes, null, createElement(Route, { path, element: createElement(page) })), route);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, route);
    assert.equal(html.includes('glass3d--hero'), false, route);
    assert.equal(html.includes('glass-hero'), false, route);
    assert.equal(html.includes('te-hero-panel'), false, route);
    if (!route.startsWith('/#') && route !== '/') assert.ok(html.includes('te-page-hero-copy'), route);
    if (route === '/') assert.ok(html.includes('See Sri Lanka Through a'));
    if (route === '/tours') for (const tour of TOURS) { assert.ok(html.includes(String(tour.priceFrom))); assert.ok(html.includes(`${tour.days} Days`)); }
  }
});

test('home contains exactly three sections, four destination links, and dedicated planning links', () => {
  const html = render(createElement(HomePage));
  assert.equal((html.match(/<section\b/g) ?? []).length, 3);
  assert.equal((html.match(/href="\/destinations\/[^"?#]+"/g) ?? []).length, 4);
  assert.ok(html.includes('href="/plan"'));
  assert.ok(html.includes('href="/about#contact"'));
  for (const removed of ['explore-map', 'planner', 'hidden-gems']) assert.equal(html.includes(`id="${removed}"`), false);
});

test('relocated destinations, journal and planner content remain accessible', () => {
  const destinations = render(createElement(DestinationsPage), '/destinations');
  assert.equal(destinations.includes('id="explore-map"'), false);
  const explore = render(createElement(ExplorePage), '/explore');
  assert.ok(explore.includes('id="explore-map"'));
  for (const gem of HIDDEN_GEMS) assert.ok(explore.includes(renderToStaticMarkup(createElement('span', null, gem.name)).replace(/^<span>|<\/span>$/g, '')), gem.id);
  const journal = render(createElement(JournalPage), '/journal');
  for (const article of ARTICLES) assert.ok(journal.includes(`/journal/${article.id}`));
  for (const photo of PHOTO_STORIES) assert.ok(journal.includes(renderToStaticMarkup(createElement('span', null, photo.title)).replace(/^<span>|<\/span>$/g, '')), photo.id);
  assert.ok(render(createElement(PlanPage), '/plan').includes('id="planner"'));
});

test('author presentation preserves the credit without assigning a stock portrait', () => {
  const html = render(createElement(AuthorAvatar, { name: 'Travel Eye Writer' }));
  assert.ok(html.includes('TE'));
  assert.equal(html.includes('<img'), false);
});

test('destination search renders every published match and has named dialog controls', () => {
  const html = render(createElement(SearchModal, { isOpen: true, onClose: () => undefined }));
  for (const destination of DESTINATIONS) assert.ok(html.includes(`href="/destinations/${destination.id}"`), destination.id);
  assert.ok(html.includes('role="dialog"')); assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('aria-label="Close search"')); assert.ok(html.includes('aria-label="Search destinations"'));
});

test('all visible enquiry controls and quick-search selects have associated labels', () => {
  for (const html of [render(createElement(InquiryModal, { isOpen: true, onClose: () => undefined })), render(createElement(QuickSearch, { onSearchSubmit: () => undefined }))]) {
    for (const match of html.matchAll(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`), match[1]);
  }
});


test('navbar selects exactly one route including section links and nested pages', (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  t.after(() => { if (prior) Object.defineProperty(globalThis, 'matchMedia', prior); else Reflect.deleteProperty(globalThis, 'matchMedia'); });
  const cases: [string, string][] = [
    ['/', 'Home'], ['/explore', 'Explore'], ['/explore#explore-map', 'Explore'], ['/destinations#explore-map', 'Destinations'], ['/destinations', 'Destinations'],
    ['/destinations/ella', 'Destinations'], ['/destinations#hidden-gems', 'Destinations'],
    ['/experiences', 'Experiences'], ['/experiences/wildlife', 'Experiences'],
    ['/tours', 'Tours'], ['/tours/island', 'Tours'], ['/journal', 'Journal'],
    ['/journal/story', 'Journal'], ['/about', 'About'], ['/about#contact', 'Contact'],
    ['/about#team', 'About'], ['/about/', 'About'], ['/destinations?category=Wildlife', 'Destinations']
  ];
  for (const [route, label] of cases) {
    const html = render(createElement(Navbar, { onOpenSearch: () => undefined }), route);
    const active = html.match(/<a[^>]*data-active="true"[^>]*>[^<]*/g) ?? [];
    assert.equal(active.length, 1, route);
    assert.ok(active[0].endsWith(label), `${route}: ${active[0]}`);
    assert.ok(active[0].includes(`aria-current="${label === 'Contact' ? 'location' : 'page'}"`), route);
    assert.equal((html.match(/aria-current="(?:page|location)"/g) ?? []).length, 1, route);
  }
  for (const route of ['/plan', '/photo-credits', '/unknown', '/about-us']) {
    assert.equal(render(createElement(Navbar, { onOpenSearch: () => undefined }), route).includes('data-active="true"'), false, route);
  }
});

test('homepage hero has no glass text panel and preserves CTA and slide controls', () => {
  const html = render(createElement(HomePage));
  assert.ok(html.includes('class="te-hero-copy"'));
  assert.equal(html.includes('glass3d--hero'), false);
  assert.ok(html.includes('Different Eye.'));
  assert.ok(html.includes('href="/destinations"'));
  assert.ok(html.includes('href="/plan"'));
  for (const label of ['Previous featured destination', 'Next featured destination', 'Pause slideshow']) assert.ok(html.includes(`aria-label="${label}"`));
});


test('router navigation, back and forward keep section-aware active target current', async () => {
  const router = createMemoryRouter([{ path: '*', element: createElement('div') }], { initialEntries: ['/'] });
  const active = () => activeNavigationTarget(router.state.location.pathname, router.state.location.hash);
  try {
    assert.equal(active(), '/');
    await router.navigate('/about'); assert.equal(active(), '/about');
    await router.navigate('/about#contact'); assert.equal(active(), '/about#contact');
    await router.navigate(-1); assert.equal(active(), '/about');
    await router.navigate(1); assert.equal(active(), '/about#contact');
    await router.navigate('/explore#explore-map'); assert.equal(active(), '/explore');
    await router.navigate('/destinations'); assert.equal(active(), '/destinations');
    await router.navigate(-1); assert.equal(active(), '/explore');
  } finally { router.dispose(); }
});


test('shared hero preserves image, breadcrumbs and plain metadata without glass', () => {
  const image = 'https://images.unsplash.com/photo-1546708973-b339540b5162';
  const html = render(createElement(PageHero, {
    image, title: 'Tours', eyebrow: 'Signature Itineraries', subtitle: 'Explore the island.',
    crumbs: [{label: 'Home', to: '/'}, {label: 'Tours'}],
    chips: createElement(HeroChip, null, '7 Days')
  }));
  for (const text of ['aria-label="Breadcrumb"', 'href="/"', 'Signature Itineraries', '>Tours<', 'Explore the island.', '7 Days', image, 'te-page-hero-copy', 'te-hero-chip']) assert.ok(html.includes(text), text);
  for (const unwanted of ['glass3d', 'glass-subtle', 'glass-inverse', 'glass-hero', 'te-hero-panel']) assert.equal(html.includes(unwanted), false);
  const banner = render(createElement(CTASection, { onPlanClick: () => undefined, onExploreClick: () => undefined }));
  assert.ok(banner.includes('te-contact-copy'));
  assert.equal(banner.includes('glass3d'), false);
  assert.ok(banner.includes('Plan My Trip'));
});
