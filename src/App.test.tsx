// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { StatusBadge } from './components/StatusBadge';
import { LINE_NAMES_KEY } from './settings';

const TODAY = '2026-10-26'; // Monday, week 44

const chips = () =>
  screen.getAllByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri) \d\d \w{3} (Early|Late|Night): / });
const cards = () => screen.getAllByRole('region', { name: /^Line \d|^.+: (OK|warning|error)/ });

beforeEach(() => localStorage.clear());

describe('line-first shift view', () => {
  it('shows one shift with 4 line cards in order and fixed role rows', () => {
    render(<App today={TODAY} />);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Mon 26 Oct · Early 05:45–14:00 · Crew \d on duty$/,
      }),
    ).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
    const first = cards()[0];
    if (!first) throw new Error('no card');
    expect(
      within(first)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Line Leader', 'Mechanic', 'Primary', 'Secondary']);
  });

  it('switches day and shift with tabs and shows times and crew', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(
      within(screen.getByRole('group', { name: 'Day' })).getByRole('button', {
        name: 'Wed 28 Oct',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Shift' })).getByRole('button', { name: /^Night/ }),
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Wed 28 Oct · Night 21:45–06:00 · Crew \d on duty/,
      }),
    ).toBeInTheDocument();
  });

  it('shows a 15-chip week strip with text status and a week summary', () => {
    render(<App today={TODAY} />);
    expect(chips()).toHaveLength(15);
    for (const c of chips()) expect(c.textContent).toMatch(/^(✓ OK|! \d+ warn|✕ \d+ err)$/);
    expect(screen.getByText(/This week: \d+ errors, \d+ warnings/)).toBeInTheDocument();
  });

  it('selects a day and shift by clicking a chip', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /^Thu 29 Oct Late: / }));
    expect(
      screen.getByRole('heading', { level: 2, name: /Thu 29 Oct · Late/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Thu 29 Oct Late: / })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('navigates weeks', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /Next week/ }));
    expect(screen.getByRole('heading', { name: /Week 45: 02 Nov 2026/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(screen.getByRole('heading', { name: /Week 44/ })).toBeInTheDocument();
  });

  it('shows the coming week when opened on a Sunday', () => {
    render(<App today="2026-10-25" />);
    expect(screen.getByRole('heading', { name: /Week 44: 26 Oct 2026/ })).toBeInTheDocument();
  });
});

describe('STL badge and shift tint', () => {
  it('shows the STL on duty in a prominent badge', () => {
    render(<App today={TODAY} />);
    const badge = screen.getByRole('note', { name: /^STL on duty: \w+ \w+$/ });
    expect(badge).toHaveClass('stl-present');
    expect(within(badge).getByText('STL')).toBeInTheDocument();
  });

  it('shows a warning badge with the absent name when the STL is absent', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    for (const chip of chips()) {
      await user.click(chip);
      if (screen.queryByRole('note', { name: /^Warning: No STL on duty/ })) break;
    }
    const badge = screen.getByRole('note', { name: /^Warning: No STL on duty, .+ is absent$/ });
    expect(badge).toHaveClass('stl-absent');
    expect(within(badge).getByText('No STL on duty')).toBeInTheDocument();
    expect(within(badge).getByText(/\(absent\)$/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Status Warning' }).closest('li')).toHaveTextContent(
      'No STL on duty',
    );
  });

  it('marks the shift area with the selected shift and labels shift tabs with icons', async () => {
    const user = userEvent.setup();
    const { container } = render(<App today={TODAY} />);
    const area = () => container.querySelector('main.shift-area');
    expect(area()).toHaveAttribute('data-shift', 'early');
    expect(area()).toHaveClass('shift-early');
    await user.click(
      within(screen.getByRole('group', { name: 'Shift' })).getByRole('button', { name: /Night/ }),
    );
    expect(area()).toHaveAttribute('data-shift', 'night');
    expect(area()).toHaveClass('shift-night');
    const tabs = within(screen.getByRole('group', { name: 'Shift' })).getAllByRole('button');
    expect(tabs.map((t) => t.textContent?.slice(0, 2))).toEqual(['☀️', '🌇', '🌙']);
    expect(tabs[2]).toHaveClass('shift-night');
  });
});

describe('empty slots and cover', () => {
  async function openFirstErrorShift() {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    const errChip = screen.getAllByRole('button', { name: /: error,/ })[0];
    if (!errChip) throw new Error('demo data has no error shift');
    await user.click(errChip);
    return user;
  }

  it('renders a missing slot as an error with text and an error card header', async () => {
    await openFirstErrorShift();
    const missing = screen.getAllByRole('button', { name: /: missing \(error\)\. Find cover/ });
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]).toHaveTextContent('✕ — missing');
    expect(screen.getAllByRole('img', { name: /^Status Error: No / }).length).toBeGreaterThan(0);
  });

  it('opens the panel with the role preselected and accepts a suggestion', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', { name: /: missing \(error\)\. Find cover/ })[0];
    if (!slot) throw new Error('no slot');
    const role = /^(.+?): missing/.exec(slot.getAttribute('aria-label') ?? '')?.[1] ?? '';
    await user.click(slot);
    const panel = screen.getByRole('complementary');
    expect(
      within(panel).getByText(/The app only suggests\. You, the planner, decide/),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('combobox', { name: /Role to cover/ })).toHaveDisplayValue(
      new RegExp(`^${role}`),
    );

    const accept = within(panel).getAllByRole('button', { name: /^Accept / })[0];
    if (!accept) throw new Error('no suggestion');
    const name = /^Accept (.+) as /.exec(accept.getAttribute('aria-label') ?? '')?.[1] ?? '';
    await user.click(accept);
    expect(within(panel).getByText('added by planner')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(`^${role}: ${name}\\.`) }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 cover\(s\) added by you/)).toBeInTheDocument();
  });

  it('suggests a same-crew spare first', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', { name: /^Secondary: / })[0];
    if (!slot) throw new Error('no secondary');
    await user.click(slot);
    const firstSuggestion = within(
      screen.getByRole('list', { name: 'Ranked cover suggestions' }),
    ).getAllByRole('listitem')[0];
    expect(firstSuggestion).toHaveTextContent('Same role, same crew');
  });

  it('reset clears accepted covers and closes the panel', async () => {
    const user = await openFirstErrorShift();
    const slot = screen.getAllByRole('button', { name: /Find cover/ })[0];
    if (!slot) throw new Error('no slot');
    await user.click(slot);
    const accept = screen.getAllByRole('button', { name: /^Accept / })[0];
    if (!accept) throw new Error('no suggestion');
    await user.click(accept);
    await user.click(screen.getByRole('button', { name: 'Load demo data / Reset' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(/added by you/)).toBeNull();
  });
});

describe('settings', () => {
  it('renames a line locally and stores it in localStorage only', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByText('Settings'));
    const input = screen.getByRole('textbox', { name: 'Line 2' });
    await user.clear(input);
    await user.type(input, 'Packer West');
    expect(screen.getByRole('heading', { level: 3, name: 'Packer West' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LINE_NAMES_KEY) ?? '{}')).toMatchObject({
      '2': 'Packer West',
    });
    await user.click(screen.getByRole('button', { name: 'Reset line names' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Line 2' })).toBeInTheDocument();
  });

  it('loads saved names on start and falls back for blank names', () => {
    localStorage.setItem(LINE_NAMES_KEY, JSON.stringify({ '1': 'North', '3': '   ' }));
    render(<App today={TODAY} />);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['North', 'Line 2', 'Line 3', 'Line 4']);
  });
});

describe('StatusBadge', () => {
  it.each([
    ['ok', '✓', 'OK'],
    ['warning', '!', 'Warning'],
    ['error', '✕', 'Error'],
  ] as const)('renders %s with icon and text', (status, icon, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByRole('img', { name: `Status ${label}` })).toHaveTextContent(
      `${icon}${label}`,
    );
  });
});
