import { TOTAL_MAX } from '../../config/rubric';
import { getLatestDay } from '../../lib/content';
import { formatLong } from '../../lib/dates';
import { pngResponse, renderOgPng } from '../../lib/og';
import { average, total } from '../../lib/scoring';

export async function GET() {
  const day = await getLatestDay();
  const avg = average(day.emails.map(total));
  return pngResponse(
    await renderOgPng({
      eyebrow: `Daily Scoreboard · ${formatLong(day.date)}`,
      headline: [{ text: "Yesterday's sends, scored" }],
      stat: `${avg.toFixed(1)}/${TOTAL_MAX} average`,
    }),
  );
}
