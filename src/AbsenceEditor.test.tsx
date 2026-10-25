// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { ABSENCES_KEY } from './absences';
import { absenceOn, crewForShift, generateDemoData } from './domain';

const TODAY = '2026-10-26'; // Monday

/** The Linienleiter of Linie 1 on duty Monday early, present in the demo data. */
function lineLeader() {
  const { people, absences } = generateDemoData({ referenceDate: TODAY });
  const crew = crewForShift('early', TODAY);
  const p = people.find(
    (x) =>
      x.crewId === crew &&
      x.homeRole === 'lineLeader' &&
      x.homeLine === '1' &&
      !absences.some((a) => a.personId === x.id) &&
      !absenceOn(x.id, TODAY, absences),
  );
  if (!p) throw new Error('fixture: no present line leader on Linie 1');
  return p;
}

const card = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });

async function addAbsence(personId: string, from: string, to: string, type = 'sick') {
  const user = userEvent.setup();
  const form = screen.getByRole('region', { name: 'Abwesenheiten' });
  await user.selectOptions(within(form).getByLabelText('Person'), personId);
  await user.selectOptions(within(form).getByLabelText('Art'), type);
  const fromI = within(form).getByLabelText('Von');
  const toI = within(form).getByLabelText('Bis (einschließlich)');
  await user.clear(fromI);
  await user.type(fromI, from);
  await user.clear(toI);
  await user.type(toI, to);
  await user.click(within(form).getByRole('button', { name: 'Abwesenheit hinzufügen' }));
  return user;
}

beforeEach(() => localStorage.clear());

describe('absence editor', () => {
  it('has labelled form controls', () => {
    render(<App today={TODAY} />);
    const form = screen.getByRole('region', { name: 'Abwesenheiten' });
    for (const l of ['Person', 'Art', 'Von', 'Bis (einschließlich)'])
      expect(within(form).getByLabelText(l)).toBeInTheDocument();
    const types = within(within(form).getByLabelText('Art'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(types).toEqual(['Urlaub', 'krank', 'Schulung', 'Überstundenabbau', 'Vertragsende']);
  });

  it('an absence turns the slot into fehlt and offers cover (never the absent person or an STL)', async () => {
    const lead = lineLeader();
    render(<App today={TODAY} />);
    expect(
      within(card('Linie 1')).queryByRole('button', { name: /^Linienleiter: fehlt/ }),
    ).toBeNull();
    const user = await addAbsence(lead.id, TODAY, TODAY);
    expect(screen.getByRole('status')).toHaveTextContent(
      `Abwesenheit für ${lead.name} hinzugefügt.`,
    );
    const gap = within(card('Linie 1')).getByRole('button', { name: /^Linienleiter: fehlt/ });
    await user.click(gap);
    const panel = screen.getByRole('complementary');
    const list = within(panel).getByRole('list', { name: 'Sortierte Vertretungsvorschläge' });
    const names = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => n.includes(lead.name))).toBe(false);
    // STLs are never suggested as cover.
    const stls = generateDemoData({ referenceDate: TODAY }).people.filter(
      (p) => p.homeRole === 'stl',
    );
    for (const s of stls) expect(names.some((n) => n.includes(s.name))).toBe(false);
  });

  it('persists to localStorage and removing restores the slot', async () => {
    const lead = lineLeader();
    const { unmount } = render(<App today={TODAY} />);
    await addAbsence(lead.id, TODAY, '2026-10-27', 'vacation');
    const stored = JSON.parse(localStorage.getItem(ABSENCES_KEY) ?? '{}');
    expect(stored.version).toBe(1);
    expect(stored.absences).toContainEqual(
      expect.objectContaining({
        personId: lead.id,
        type: 'vacation',
        from: TODAY,
        to: '2026-10-27',
      }),
    );
    unmount();
    render(<App today={TODAY} />);
    expect(
      within(card('Linie 1')).getByRole('button', { name: /^Linienleiter: fehlt/ }),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: `Abwesenheit von ${lead.name} (Urlaub) entfernen` }),
    );
    expect(
      within(card('Linie 1')).queryByRole('button', { name: /^Linienleiter: fehlt/ }),
    ).toBeNull();
  });

  it('shows validation errors for to < from and overlaps', async () => {
    const lead = lineLeader();
    render(<App today={TODAY} />);
    await addAbsence(lead.id, '2026-10-28', '2026-10-27');
    const to = screen.getByLabelText('Bis (einschließlich)');
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAccessibleDescription(/nicht vor/);
    await addAbsence(lead.id, TODAY, TODAY);
    await addAbsence(lead.id, TODAY, '2026-10-29');
    expect(screen.getByLabelText('Von')).toHaveAccessibleDescription(/Überschneidet/);
  });

  it('missing person shows an error', async () => {
    render(<App today={TODAY} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Abwesenheit hinzufügen' }));
    expect(screen.getByLabelText('Person')).toHaveAccessibleDescription(/auswählen/);
  });

  it('Demo zurücksetzen discards edited absences', async () => {
    const lead = lineLeader();
    render(<App today={TODAY} />);
    const user = await addAbsence(lead.id, TODAY, TODAY);
    await user.click(screen.getByRole('button', { name: 'Demo zurücksetzen' }));
    expect(localStorage.getItem(ABSENCES_KEY)).toBeNull();
    expect(
      within(card('Linie 1')).queryByRole('button', { name: /^Linienleiter: fehlt/ }),
    ).toBeNull();
  });
});
