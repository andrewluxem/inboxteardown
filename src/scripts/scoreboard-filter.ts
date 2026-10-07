// Progressive enhancement for the scoreboard. Without JS every row shows and
// the controls stay hidden; with JS, rows are filtered via `hidden` and the
// stat trio, rank numbers, and empty state are kept in sync.

export function initScoreboardFilters(root: ParentNode = document): void {
  const board = root.querySelector<HTMLElement>('[data-board]');
  if (!board) return;
  const controls = board.querySelector<HTMLElement>('[data-filters]');
  const rows = [...board.querySelectorAll<HTMLElement>('.row')];
  const chips = [...board.querySelectorAll<HTMLButtonElement>('[data-industry-filter]')];
  const toggle = board.querySelector<HTMLButtonElement>('[data-campaigns-only]');
  const empty = board.querySelector<HTMLElement>('[data-empty]');
  const stat = (name: string) => document.querySelector<HTMLElement>(`[data-stat="${name}"]`);

  let industry = 'all';
  let campaignsOnly = toggle?.getAttribute('aria-pressed') === 'true';

  function apply(): void {
    let shown = 0;
    let sum = 0;
    let fails = 0;
    for (const row of rows) {
      const visible =
        (industry === 'all' || row.dataset.industry === industry) && (!campaignsOnly || row.dataset.kind === 'campaign');
      row.hidden = !visible;
      if (!visible) continue;
      shown++;
      sum += Number(row.dataset.total);
      if (row.dataset.capped === 'true') fails++;
      const rank = row.querySelector('[data-rank]');
      if (rank) rank.textContent = String(shown);
    }
    if (empty) empty.hidden = shown > 0;
    const count = stat('count');
    const avg = stat('avg');
    const hard = stat('fails');
    if (count) count.textContent = String(shown);
    if (avg) avg.textContent = shown ? (sum / shown).toFixed(1) : '0.0';
    if (hard) hard.textContent = String(fails);
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      industry = chip.dataset.industryFilter ?? 'all';
      for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
      apply();
    });
  }
  toggle?.addEventListener('click', () => {
    campaignsOnly = !campaignsOnly;
    toggle.setAttribute('aria-pressed', String(campaignsOnly));
    apply();
  });

  if (controls) controls.hidden = false;
  apply();
}
