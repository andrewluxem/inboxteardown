// Whether the home page's board is late. The site is static: a board that
// never publishes means no new build, so this runs in the reader's browser
// against the clock, not at build time.
import { TZ, addDays, mtDate } from './dates';

/** The home page promises a new board each morning by 7:00 am MT. */
export const BOARD_DUE_HOUR_MT = 7;

const hourMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ });

/**
 * The newest board readers should see at `now`: today's (Mountain Time)
 * from 7:00 am MT, yesterday's before that.
 */
export function expectedBoardDate(now: Date): string {
  const today = mtDate(now);
  return Number(hourMT.format(now)) >= BOARD_DUE_HOUR_MT ? today : addDays(today, -1);
}

/** True when the newest published board is older than expected at `now`. */
export function isBoardLate(boardDate: string, now: Date): boolean {
  return boardDate < expectedBoardDate(now);
}
