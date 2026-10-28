// Validates one board file outside the repo against scoreboardSchema. The
// scorer's tests run this with EXTERNAL_BOARD=<exported board> to prove its
// export passes the site's own schema; skipped otherwise.
import { describe, expect, it } from 'vitest';
import { scoreboardSchema } from '../src/lib/schemas';
import { frontmatter } from './helpers';

const path = process.env.EXTERNAL_BOARD;

describe.skipIf(!path)('external board', () => {
  it('passes scoreboardSchema', () => {
    const r = scoreboardSchema.safeParse(frontmatter(path!));
    expect(r.error?.issues ?? []).toEqual([]);
  });
});
