---
title: "How scores work"
description: "The rubric behind every Inbox Teardown score: eight dimensions, a 1 to 5 scale, and a hard-fail rule."
rubric_version: "1.0"
rubric_date: "2026-10-15"
---

Every email on the scoreboard is scored on the same eight dimensions, listed above. Each dimension gets a whole number from 1 to 5, so a total runs from 8 to 40.

Each morning's scoreboard covers the marketing email our inbox received in the 24 hours ending just before 8 a.m. Mountain Time.

These scores are pre-calibration. Rubric 1.0 is a first version: the level descriptions below have not yet been checked against a panel of human ratings, and they may be reworded once they are. [ANDREW: when is calibration planned, and will published scores be rescored after it?]

## What each dimension measures

- **Subject & preheader:** how well the inbox view (the subject line and the preview text beside it) earns the open and matches what is inside.
- **Clarity:** how quickly a reader can say why the email exists after opening it.
- **Design & hierarchy:** how well the layout leads the eye to the one thing that matters, on a phone.
- **Copy & voice:** how specific the writing is, and how recognizably it sounds like this brand.
- **Call to action:** how obvious and specific the next step is.
- **Relevance:** how well the send fits what the subscriber told the brand and where they are as a customer.
- **Trust:** whether the email reads as trustworthy rather than spammy, deceptive, or phishing-adjacent.
- **Technical hygiene:** whether the email is built and sent correctly. This one is scored by automated checks only.

## The 1 to 5 scale

The first seven dimensions are scored against five written levels. The note on each scorecard starts with the level that was chosen and, where one exists, quotes the line of the email that supports it.

**Subject & preheader**

- 5: Subject is specific and honest, and the preheader extends it with new information.
- 4: Subject is specific and honest; the preheader adds a little but partly repeats it.
- 3: Subject is clear but generic, or the preheader repeats it or is filler.
- 2: Subject is vague or the preheader is template text, so the inbox view gives little reason to open.
- 1: Subject is misleading or empty, or the preheader is broken or contradicts it.

**Clarity**

- 5: Why the email exists is clear within 3 seconds: one message in the first screen, offer terms stated plainly.
- 4: The main message is clear in the first screen, but the offer terms take some reading to pin down.
- 3: The main message is findable but competes with other content, or the offer terms are vague.
- 2: Several messages compete and the offer terms are hard to find.
- 1: No clear reason for the email: no single message, no stated offer.

**Design & hierarchy**

- 5: The layout leads the eye to the one thing that matters on a phone: clear hierarchy, key copy in live text, nothing broken.
- 4: Hierarchy is clear on a phone with minor issues, such as some key copy set in images.
- 3: Hierarchy is present but weak: several elements compete, or key copy relies on images.
- 2: Hard to scan on a phone: no clear focal point, small text, or image-only key copy.
- 1: Broken or unreadable on a phone: no hierarchy, layout failures, or key content lost without images.

**Copy & voice**

- 5: The writing is specific and recognizably this brand's voice: concrete claims, no filler, no boilerplate.
- 4: Mostly specific and on-voice, with a few generic lines.
- 3: Competent but generic: it could come from any brand in the category.
- 2: Mostly filler or boilerplate, with few concrete claims.
- 1: Generic boilerplate throughout, or copy errors that undercut the brand.

**Call to action**

- 5: One obvious next step: a verb-led, specific primary call to action.
- 4: A clear primary call to action that is a little generic or shares attention with others.
- 3: A call to action exists but is generic or competes with several equal ones.
- 2: The next step is unclear: weak or buried calls to action.
- 1: No usable call to action.

**Relevance**

- 5: Fits what the subscriber told the brand and the lifecycle stage: right stage, timely, no merge-field failures.
- 4: Fits the lifecycle stage, with light use of what the subscriber shared.
- 3: A generic batch send that fits the stage but uses nothing the subscriber shared.
- 2: A poor fit for the subscriber's stage or timing.
- 1: Wrong stage, or broken personalization such as unrendered merge fields.

**Trust**

- 5: Reads as trustworthy: clear sender identity, honest claims, nothing deceptive.
- 4: Trustworthy overall, with minor pushy or unclear elements.
- 3: Neutral: some hard-sell pressure or vague claims, but nothing deceptive.
- 2: Reads as spammy: heavy pressure, exaggerated urgency, or an unclear sender.
- 1: Deceptive or phishing-adjacent.

**Technical hygiene** starts at 5 and comes down only when an automated check fails (see Check ceilings below).

## Bands

A total of 33 to 40 is **Strong**, 24 to 32 is **Solid**, and anything under 24 is **Weak**.

## The hard-fail rule

A score of 1 on **Trust** or on **Technical hygiene** caps the email, whatever its total. A capped email is listed after every non-capped email on the scoreboard and is labeled Capped instead of with a band.

## Checks and judgment

Some of the score comes from deterministic checks that give the same answer every time: whether links resolve, whether an unsubscribe link is present, whether merge tags rendered. Each scorecard lists these under Automated checks with a pass or fail result.

The rest is judgment. Each dimension on a scorecard is labeled with its source: CHECK when it comes from automated checks alone, JUDGMENT when a reviewer scored it, and BOTH when checks inform a reviewer's score.

<!-- TODO(andrew): describe who or what makes the judgment calls, and how consistency is maintained. -->

## Corrections and rescores

To request a rescore or report an error, email {contactEmail} with the subject "Rescore request:" followed by the email's id. Each scorecard has a link that fills this in. When a score is corrected, the scorecard notes the correction and its date.

Response time: [RESPONSE TIME]

<!-- TODO(andrew): set the response time for rescore requests. -->
