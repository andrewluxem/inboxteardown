---
title: "How scores work"
description: "The rubric behind every Inbox Teardown score: eight dimensions, a 1 to 5 scale, and a hard-fail rule."
rubric_version: "1.0"
rubric_date: "2026-10-15"
---

Every email on the scoreboard is scored on the same eight dimensions, listed above. Each dimension gets a whole number from 1 to 5, so a total runs from 8 to 40.

Each morning's scoreboard covers the marketing email our inbox received in the 24 hours ending just before 8 a.m. Mountain Time.

These scores are pre-calibration. Rubric 1.0 is a first version: the level descriptions below have not yet been checked against a panel of human ratings, and they may be reworded once they are. Calibration is planned for after launch, and there is no date for it yet. Every published score keeps the rubric version it was scored under, and a published score is never changed silently.

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

A 1 on either of these is published only when a failed automated check backs it, and the scorecard shows that check with its evidence. A judgment alone never caps an email: if the model rates Trust a 1 and no check confirms it, the email is held back for review instead of published.

## Checks and judgment

Some of the score comes from automated checks that give the same answer every time. Each scorecard lists them under Automated checks with one of three results: **pass**, **fail**, or **unverified**. Unverified means the check could not reach a verdict, for example because a website blocked the request or timed out. An unverified result never lowers a score.

The rest is judgment, made by an AI language model. It reads the email's visible text line by line, along with measurements from a phone-sized rendering of the email: where the main button sits, font sizes, and how much of the email is live text rather than images. It does not look at the images themselves. For each dimension it picks one of the five written levels above and names the line of the email that supports it.

Consistency comes from three things. Every email gets the same instructions and the same level descriptions. Those instructions change only when the rubric version changes. And each answer is stored, so scoring the same email again gives the same result.

Each dimension on a scorecard is labeled with its source: CHECK when automated checks alone set it, JUDGMENT when the model's level set it, and BOTH when the model scored it and a check limited the score.

## Check ceilings

A failed check does not subtract points. It sets the highest score a dimension can get, and the dimension's score is the lower of the model's level and that ceiling. When several checks fail on one dimension, the lowest ceiling applies.

| Check | Dimension | Ceiling when it fails |
|---|---|---|
| The main button's link is broken | Technical hygiene | 1 |
| The sender fails DMARC alignment | Technical hygiene | 1 |
| The HTML is over 102KB, so Gmail clips it | Technical hygiene | 2 |
| The sending domain has no DMARC record | Technical hygiene | 3 |
| Other links in the email are broken | Technical hygiene | 3 |
| More than half the content images lack alt text | Technical hygiene | 3 |
| Fewer than 50 words of live text | Technical hygiene | 3 |
| There is no plain-text version | Technical hygiene | 4 |
| The subject starts with a fake "RE:" or "FW:" | Trust | 1 |
| No unsubscribe link in the body | Trust | 1 |
| No postal address | Trust | 2 |
| An unsubscribe header without one-click unsubscribe | Trust | 3 |
| Fewer than 50 words of live text | Design & hierarchy | 2 |
| The email is wider than a phone screen | Design & hierarchy | 2 |
| The main button is below the first phone screen | Design & hierarchy | 3 |
| Several buttons compete to be the main one | Design & hierarchy | 3 |
| Body text is smaller than 13px on a phone | Design & hierarchy | 3 |
| The preheader is template text, such as "View in browser" | Subject & preheader | 2 |
| Unfilled merge fields, such as `{{FirstName}}` | Relevance | 1 |
| One confirmed typo (two or more: ceiling 3) | Copy & voice | 4 |

A link counts as broken only when it fails for certain on two separate tries: the page is gone (HTTP 404 or 410) or the domain does not exist. Server errors, timeouts, and sites that block automated requests are recorded as unverified. Links are checked when the email is scored, the morning after it arrives, not at the moment it was sent.

Typos are flagged by a spell checker and count only after the model confirms they are real errors rather than brand or product names.

## When an email is held back

Some scored emails are not published on the scoreboard:

- **Pending check review.** A check may cap Trust or Technical hygiene in public only after its failures on real emails have been reviewed by hand against the raw email. Until a check has passed that review, any email whose Trust or Technical hygiene score it would set is held back.
- **A judgment of 1 with no check behind it**, as described under the hard-fail rule.
- **Image-only emails.** An email made almost entirely of images cannot be judged from its text, so it is held back.
- **Scoring did not finish**, for example because the email could not be fetched or rendered.

Held-back emails are not added to past boards later. Once a check passes review, it applies to boards from then on.

## Corrections and rescores

To request a rescore or report an error, email {contactEmail} with the subject "Rescore request:" followed by the email's id. Each scorecard has a link that fills this in. When a score is corrected, the scorecard notes the correction and its date.

We reply to rescore requests within 3 business days.
