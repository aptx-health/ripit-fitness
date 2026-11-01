import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, syncThemeColor } from './theme';

// The themes' backgrounds come from app/globals.css, which jsdom doesn't load,
// so each test gives the selected theme a background with a small stylesheet.
const THEME_CSS = `
  [data-theme="ripit"] { --background: #FBF8F3; }
  [data-theme="ripit"][data-mode="dark"] { --background: #1A1108; }
  [data-theme="doom"][data-mode="dark"] { --background: #000000; }
`;

const themeColors = () =>
  [...document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content);

/** The two tags the server renders from the OS setting (app/layout.tsx). */
function serverTags() {
  for (const [media, color] of [
    ['(prefers-color-scheme: light)', '#FBF8F3'],
    ['(prefers-color-scheme: dark)', '#1A1108'],
  ]) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.media = media;
    meta.content = color;
    document.head.appendChild(meta);
  }
}

describe('Theme colour follows the applied theme', () => {
  beforeEach(() => {
    document.head.innerHTML = `<style>${THEME_CSS}</style>`;
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.mode;
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('sets both server tags to the dark background when the app is in dark mode', () => {
    serverTags();
    applyTheme({ themeName: 'ripit', mode: 'dark' });
    expect(themeColors()).toEqual(['#1A1108', '#1A1108']);
  });

  it('sets both server tags to the light background when the app is in light mode', () => {
    serverTags();
    applyTheme({ themeName: 'ripit', mode: 'light' });
    expect(themeColors()).toEqual(['#FBF8F3', '#FBF8F3']);
  });

  it('follows another theme, not just ripit', () => {
    serverTags();
    applyTheme({ themeName: 'doom', mode: 'dark' });
    expect(themeColors()).toEqual(['#000000', '#000000']);
  });

  it('keeps the media queries, so the tags stay the ones the server rendered', () => {
    serverTags();
    applyTheme({ themeName: 'ripit', mode: 'dark' });
    const media = [...document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.media);
    expect(media).toEqual(['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
  });

  it('switching mode updates the colour again', () => {
    serverTags();
    applyTheme({ themeName: 'ripit', mode: 'dark' });
    applyTheme({ themeName: 'ripit', mode: 'light' });
    expect(themeColors()).toEqual(['#FBF8F3', '#FBF8F3']);
  });

  it('adds a tag when the page has none', () => {
    applyTheme({ themeName: 'ripit', mode: 'dark' });
    expect(themeColors()).toEqual(['#1A1108']);
  });

  it('leaves the tags alone when the theme has no background', () => {
    serverTags();
    document.documentElement.dataset.theme = 'unknown';
    syncThemeColor();
    expect(themeColors()).toEqual(['#FBF8F3', '#1A1108']);
  });
});
