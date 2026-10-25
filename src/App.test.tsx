// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { StatusBadge } from './components/StatusBadge';
import { LINE_NAMES_KEY } from './settings';

const TODAY = '2026-10-26'; // Monday, week 44

const chips = () =>
  screen.getAllByRole('button', {
    name: /^(Mo|Di|Mi|Do|Fr)\., \d\d\. \w{3}\. (Früh|Spät|Nacht): /,
  });
const cards = () => screen.getAllByRole('region', { name: /^Linie \d|^.+: (OK|Warnung|Fehler)/ });

beforeEach(() => localStorage.clear());

describe('line-first shift view', () => {
  it('shows one shift with 4 line cards in order and fixed role rows', () => {
    render(<App today={TODAY} />);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Mo\., 26\. Okt\. · Früh 05:45–14:00 · Gruppe \d im Dienst$/,
      }),
    ).toBeInTheDocument();
    const headings = within(screen.getByRole('main'))
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Linie 1', 'Linie 2', 'Linie 3', 'Linie 4']);
    const first = cards()[0];
    if (!first) throw new Error('no card');
    expect(
      within(first)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Linienleiter', 'Mechaniker', 'Primär', 'Sekundär']);
  });

  it('switches day and shift with tabs and shows times and crew', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(
      within(screen.getByRole('group', { name: 'Tag' })).getByRole('button', {
        name: 'Mi., 28. Okt.',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Schicht' })).getByRole('button', {
        name: /^Nacht/,
      }),
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Mi\., 28\. Okt\. · Nacht 21:45–06:00 · Gruppe \d im Dienst/,
      }),
    ).toBeInTheDocument();
  });

  it('shows a 15-chip week strip with text status and a week summary', () => {
    render(<App today={TODAY} />);
    expect(chips()).toHaveLength(15);
    for (const c of chips()) expect(c.textContent).toMatch(/^(✓ OK|! \d+ Warn\.|✕ \d+ Fehl\.)$/);
    expect(screen.getByText(/Diese Woche: \d+ Fehler, \d+ Warnungen/)).toBeInTheDocument();
  });

  it('selects a day and shift by clicking a chip', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /^Do\., 29\. Okt\. Spät: / }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Do\., 29\. Okt\. · Spät/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Do\., 29\. Okt\. Spät: / })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('navigates weeks', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /Nächste Woche/ }));
    expect(screen.getByRole('heading', { name: /KW 45: 02\. Nov\. 2026/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Diese Woche' }));
    expect(screen.getByRole('heading', { name: /KW 44/ })).toBeInTheDocument();
  });

  it('shows the coming week when opened on a Sunday', () => {
    render(<App today="2026-10-25" />);
    expect(screen.getByRole('heading', { name: /KW 44: 26\. Okt\. 2026/ })).toBeInTheDocument();
  });
});

describe('STL badge and shift tint', () => {
  it('shows the STL on duty in a prominent badge', () => {
    render(<App today={TODAY} />);
    const badge = screen.getByRole('note', { name: /^STL im Dienst: \w+ \w+$/ });
    expect(badge).toHaveClass('stl-present');
    expect(within(badge).getByText('STL')).toBeInTheDocument();
  });

  it('shows a warning badge with the absent name when the STL is absent', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    for (const chip of chips()) {
      await user.click(chip);
      if (screen.queryByRole('note', { name: /^Warnung: Kein STL im Dienst/ })) break;
    }
    const badge = screen.getByRole('note', {
      name: /^Warnung: Kein STL im Dienst, .+ ist abwesend$/,
    });
    expect(badge).toHaveClass('stl-absent');
    expect(within(badge).getByText('Kein STL im Dienst')).toBeInTheDocument();
    expect(within(badge).getByText(/\(abwesend\)$/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Status Warnung' }).closest('li')).toHaveTextContent(
      'Kein STL im Dienst',
    );
  });

  it('marks the shift area with the selected shift and labels shift tabs with icons', async () => {
    const user = userEvent.setup();
    const { container } = render(<App today={TODAY} />);
    const area = () => container.querySelector('main.shift-area');
    expect(area()).toHaveAttribute('data-shift', 'early');
    expect(area()).toHaveClass('shift-early');
    await user.click(
      within(screen.getByRole('group', { name: 'Schicht' })).getByRole('button', { name: /Nacht/ }),
    );
    expect(area()).toHaveAttribute('data-shift', 'night');
    expect(area()).toHaveClass('shift-night');
    const tabs = within(screen.getByRole('group', { name: 'Schicht' })).getAllByRole('button');
    expect(tabs.map((t) => t.textContent?.slice(0, 2))).toEqual(['☀️', '🌇', '🌙']);
    expect(tabs[2]).toHaveClass('shift-night');
  });
});

describe('empty slots and cover', () => {
  async function openFirstErrorShift() {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    const errChip = screen.getAllByRole('button', { name: /: Fehler,/ })[0];
    if (!errChip) throw new Error('demo data has no error shift');
    await user.click(errChip);
    return user;
  }

  it('renders a missing slot as an error with text and an error card header', async () => {
    await openFirstErrorShift();
    const missing = screen.getAllByRole('button', {
      name: /: fehlt \(Fehler\)\. Vertretung finden/,
    });
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]).toHaveTextContent('✕ — fehlt');
    expect(screen.getAllByRole('img', { name: /^Status Fehler: Kein / }).length).toBeGreaterThan(0);
  });

  it('opens the panel with the role preselected and accepts a suggestion', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', {
      name: /: fehlt \(Fehler\)\. Vertretung finden/,
    })[0];
    if (!slot) throw new Error('no slot');
    const role = /^(.+?): fehlt/.exec(slot.getAttribute('aria-label') ?? '')?.[1] ?? '';
    await user.click(slot);
    const panel = screen.getByRole('complementary');
    expect(
      within(panel).getByText(/Die App macht nur Vorschläge\. Du als Planer entscheidest/),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('combobox', { name: /Zu besetzende Rolle/ })).toHaveDisplayValue(
      new RegExp(`^${role}`),
    );

    const accept = within(panel).getAllByRole('button', { name: / übernehmen$/ })[0];
    if (!accept) throw new Error('no suggestion');
    const name = /^(.+) als /.exec(accept.getAttribute('aria-label') ?? '')?.[1] ?? '';
    await user.click(accept);
    expect(within(panel).getByText('vom Planer hinzugefügt')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${role}: ${name}\\.`) }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 Vertretung\(en\) von dir hinzugefügt/)).toBeInTheDocument();
  });

  it('suggests a same-crew spare first', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', { name: /^Sekundär: / })[0];
    if (!slot) throw new Error('no secondary');
    await user.click(slot);
    const firstSuggestion = within(
      screen.getByRole('list', { name: 'Sortierte Vertretungsvorschläge' }),
    ).getAllByRole('listitem')[0];
    expect(firstSuggestion).toHaveTextContent('Gleiche Rolle, gleiche Gruppe');
  });

  it('reset clears accepted covers and closes the panel', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', { name: /Vertretung finden/ })[0];
    if (!slot) throw new Error('no slot');
    await user.click(slot);
    const accept = screen.getAllByRole('button', { name: / übernehmen$/ })[0];
    if (!accept) throw new Error('no suggestion');
    await user.click(accept);
    await user.click(screen.getByRole('button', { name: 'Demo zurücksetzen' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(/von dir hinzugefügt/)).toBeNull();
  });
});

describe('settings', () => {
  it('renames a line locally and stores it in localStorage only', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByText('Einstellungen'));
    const input = screen.getByRole('textbox', { name: 'Linie 2' });
    await user.clear(input);
    await user.type(input, 'Packer West');
    expect(screen.getByRole('heading', { level: 3, name: 'Packer West' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LINE_NAMES_KEY) ?? '{}')).toMatchObject({
      '2': 'Packer West',
    });
    await user.click(screen.getByRole('button', { name: 'Liniennamen zurücksetzen' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Linie 2' })).toBeInTheDocument();
  });

  it('loads saved names on start and falls back for blank names', () => {
    localStorage.setItem(LINE_NAMES_KEY, JSON.stringify({ '1': 'North', '3': '   ' }));
    render(<App today={TODAY} />);
    const names = within(screen.getByRole('main'))
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(['North', 'Linie 2', 'Linie 3', 'Linie 4']);
  });
});

describe('StatusBadge', () => {
  it.each([
    ['ok', '✓', 'OK'],
    ['warning', '!', 'Warnung'],
    ['error', '✕', 'Fehler'],
  ] as const)('renders %s with icon and text', (status, icon, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByRole('img', { name: `Status ${label}` })).toHaveTextContent(
      `${icon}${label}`,
    );
  });
});
