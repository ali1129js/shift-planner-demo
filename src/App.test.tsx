// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { StatusBadge } from './components/StatusBadge';

const TODAY = '2026-10-28'; // Wednesday, week 44

function firstAccept(): HTMLElement {
  const b = screen.getAllByRole('button', { name: /^Accept / })[0];
  if (!b) throw new Error('no suggestion');
  return b;
}

function lineButtons() {
  return screen.getAllByRole('button', { name: /^Line [1-4], / });
}

describe('week view', () => {
  it('renders Mon-Fri x Early/Late/Night with 4 lines each', () => {
    render(<App today={TODAY} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Shift',
      'Mon 26 Oct',
      'Tue 27 Oct',
      'Wed 28 Oct',
      'Thu 29 Oct',
      'Fri 30 Oct',
    ]);
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'Early05:45–14:00',
      'Late13:45–22:00',
      'Night21:45–06:00',
    ]);
    expect(lineButtons()).toHaveLength(5 * 3 * 4);
  });

  it('shows the week label and the crew on duty from the rotation', () => {
    render(<App today={TODAY} />);
    expect(
      screen.getByRole('heading', { name: /Week 44: 26 Oct 2026 – 30 Oct 2026/ }),
    ).toBeInTheDocument();
    const early = screen.getByRole('cell', { name: 'Early shift, Mon 26 Oct' });
    expect(within(early).getByText(/^Crew \d$/)).toBeInTheDocument();
    expect(within(early).getAllByText('Primary:')).toHaveLength(4);
    expect(within(early).getAllByText('Shift Lead:')).toHaveLength(4);
  });

  it('navigates weeks and rotates crews', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    const crewOf = () =>
      within(screen.getByRole('cell', { name: /^Early shift, Mon/ })).getByText(/^Crew \d$/)
        .textContent;
    const before = crewOf();
    await user.click(screen.getByRole('button', { name: /Next week/ }));
    expect(screen.getByRole('heading', { name: /Week 45: 02 Nov 2026/ })).toBeInTheDocument();
    expect(crewOf()).not.toBe(before);
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(screen.getByRole('heading', { name: /Week 44/ })).toBeInTheDocument();
  });

  it('labels every status with text, not colour alone', () => {
    render(<App today={TODAY} />);
    for (const b of lineButtons())
      expect(b.getAttribute('aria-label')).toMatch(/: (OK|warning|error)\./);
    const badges = screen.getAllByRole('img', { name: /^Status (OK|Warning|Error)/ });
    expect(badges.length).toBeGreaterThanOrEqual(15 + 60);
  });
});

describe('StatusBadge', () => {
  it.each([
    ['ok', '✓', 'OK'],
    ['warning', '!', 'Warning'],
    ['error', '✕', 'Error'],
  ] as const)('renders %s with icon and text', (status, icon, label) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByRole('img', { name: `Status ${label}` });
    expect(badge).toHaveTextContent(`${icon}${label}`);
  });
});

describe('side panel and cover', () => {
  it('opens details, shows the suggest-only hint, and accepts a suggestion', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /^Line 1, Early, Mon 26 Oct/ }));
    const panel = screen.getByRole('complementary');
    expect(
      within(panel).getByRole('heading', { name: /Line 1 · Early · Mon 26 Oct/ }),
    ).toHaveFocus();
    expect(within(panel).getByText(/The app only suggests/)).toBeInTheDocument();

    const list = within(panel).getByRole('list', { name: 'Ranked cover suggestions' });
    const first = within(list).getAllByRole('button', { name: /^Accept / })[0];
    if (!first) throw new Error('no suggestion');
    const name = /^Accept (.+) as /.exec(first.getAttribute('aria-label') ?? '')?.[1] ?? '';
    await user.click(first);

    expect(within(panel).getByText('added by planner')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: /^Line 1, Early, Mon 26 Oct/ })).getByText(
        new RegExp(name),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 cover\(s\) added by planner/)).toBeInTheDocument();
    // Accepted person no longer offered for the same shift.
    expect(
      within(panel).queryByRole('button', { name: new RegExp(`^Accept ${name} `) }),
    ).toBeNull();
  });

  it('can remove an accepted cover and reset clears everything', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /^Line 2, Late, Tue 27 Oct/ }));
    await user.click(firstAccept());
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('added by planner')).toBeNull();
    await user.click(firstAccept());
    await user.click(screen.getByRole('button', { name: 'Load demo data / Reset' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(/added by planner/)).toBeNull();
  });

  it('closes with the Close button', async () => {
    const user = userEvent.setup();
    render(<App today={TODAY} />);
    await user.click(screen.getByRole('button', { name: /^Line 3, Night, Fri 30 Oct/ }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

describe('weekend default', () => {
  it('shows the coming week when opened on a Sunday', () => {
    render(<App today="2026-10-25" />);
    expect(screen.getByRole('heading', { name: /Week 44: 26 Oct 2026/ })).toBeInTheDocument();
  });
});
