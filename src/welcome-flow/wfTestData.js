/**
 * Test copy for the Welcome Flow — the Dev-skip path on the brief.
 *
 * Mirrors the Weekly Email Campaign's stub in useCopyGeneration.js: three named
 * variations, same field names, so anything that renders weekly copy renders
 * this too.
 *
 * Source: Starlight Haven Hot Springs, "Welcome: Claim Your Offer", Families.
 * Transcribed verbatim — do not reword. It exists to exercise the pipeline with
 * realistic text, so its length and punctuation are the point.
 *
 * Two fields go beyond what WF — Week 1 renders today:
 *   propertyCards[]  — the 2-up stay cards
 *   campaignEyebrow / sectionEyebrow / sectionHeadline / introCtaText
 * They are carried anyway so a later WF template can pick them up without the
 * test data having to be rewritten. `subhead` is set from Section Subhead, since
 * that is the field the current template actually reads.
 */

export const WF_TEST_CLIENT   = 'Starlight Haven Hot Springs'
export const WF_TEST_THEME    = 'Welcome: Claim Your Offer'
export const WF_TEST_AUDIENCE = 'Families'

const CTA_URL = 'https://example.com/book'

export const WF_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Hotel Escape',
    subjectLine:     'Is your family done with boring hotel rooms?',
    previewText:     "Families are trading hotels for Starlight Haven's wild side.",
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Nature Unfiltered. Comfort Defined.',
    bodyText:        "You signed up, so here's your reward. Use code BUY3 at checkout and save 30% on any four-night stay. Pick one your kids will actually talk about when school starts back up.",
    introCtaText:    'Claim 30% Off',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Our Stays',
    sectionHeadline: 'Two Hideaways Built For The Whole Family',
    sectionSubhead:  'Starlight Haven gives families a real hotel alternative.',
    subhead:         'Starlight Haven gives families a real hotel alternative.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'Sleep in the treetops, hot tub included.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: 'Twin loft for kids, hot tub for parents.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    /* Guest reviews, quoted verbatim. Week 1's template ignores them; they are
       here so the first sample also exercises Week 3's testimonials block. */
    reviews: [
      { quote: 'My husband has always wanted to try staying in a vacation dome. He loved it!! … We got the best of both worlds. We were in the woods, but downtown Hot Springs was super close.',
        attribution: 'Megan, Deluxe Dome stay, March 2026, via Airbnb' },
      { quote: 'This was our second time staying in one of the treehouse cabins, and we will definitely be back for a third visit. The cabins are always spotless, cozy, and thoughtfully designed for a relaxing getaway.',
        attribution: 'Daniel, Treehouse stay, February 2026, via Google' },
      { quote: 'The surrounding forest was beautiful, filled with wildlife. Not to mention the hiking trails on site. If you need a good way to relax and change up your routine, I highly recommend going to Starlight Haven!',
        attribution: 'Priya, Treehouse stay, January 2026, via Airbnb' },
    ],
    bodyBlock2Title: "Your family trip doesn't have to look like every other one.",
    bodyBlock2:      'Four nights, 30% off, and a private hot tub waiting when you arrive. Use BUY3 and lock it in.',
    closingLine:     'The kids will remember this one. Book with BUY3 and make it happen.',
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
  {
    id: 2,
    name: 'The Upgrade Moment',
    subjectLine:     'What if this family trip actually felt different?',
    previewText:     'Starlight Haven gives families something no hotel can match.',
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Where Special Moments Find Their Spot',
    bodyText:        "Here's 30% off your stay at Starlight Haven, just for joining. Use code BUY3 at checkout on any four-night booking. These aren't hotel rooms; they're the kind of places your family will keep talking about.",
    introCtaText:    'Use Code BUY3',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Choose Your Stay',
    sectionHeadline: 'Two Stays That Trade Cramped For Wow',
    sectionSubhead:  'Starlight Haven has the space families have been looking for.',
    subhead:         'Starlight Haven has the space families have been looking for.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'A real treehouse with a private hot tub.',   ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: 'Three beds, big views, hot tub up top.',     ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    bodyBlock2Title: 'Four nights is enough time to actually unwind together.',
    bodyBlock2:      "Code BUY3 takes 30% off when you book four nights or more. That's a real number worth using.",
    closingLine:     "Skip the hotel and bring the family somewhere they'll actually love. BUY3 gets you there.",
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
  {
    id: 3,
    name: 'The Screen-Time Swap',
    subjectLine:     "Ready to trade screen time for something they'll never forget?",
    previewText:     'Families find the real thing at Starlight Haven.',
    campaignEyebrow: 'WELCOME OFFER · BUY3',
    headlineText:    'Screens Off, Woods On',
    bodyText:        'Your 30% off code is BUY3. Use it on any four-night stay and bring the family somewhere that pulls everyone away from screens and into the woods. Private hot tubs, hiking trails, and a 24/7 clubhouse are waiting.',
    introCtaText:    'Grab My 30% Off',
    heroCtaText:     'Use code BUY3 at checkout.',
    sectionEyebrow:  'Pick Your Stay',
    sectionHeadline: 'Two Unique Stays For Families Of Four',
    sectionSubhead:  'Starlight Haven gives families the wow factor hotels never could.',
    subhead:         'Starlight Haven gives families the wow factor hotels never could.',
    propertyCards: [
      { name: 'Treehouses',   stats: '2 beds | 1 bath | 4 guests', description: 'Treetop living, fireplace, and a private hot tub.', ctaText: 'View Dates', ctaUrl: CTA_URL },
      { name: 'Deluxe Domes', stats: '3 beds | 1 bath | 4 guests', description: "A kids' loft, a hot tub with views.",               ctaText: 'View Dates', ctaUrl: CTA_URL },
    ],
    bodyBlock2Title: 'Four nights in the woods beats four nights on a couch.',
    bodyBlock2:      'Use BUY3 at checkout and save 30% on your four-night family stay.',
    closingLine:     "This is the trip they'll ask you to do again next year. Start with BUY3.",
    ctaText:         'Book With BUY3',
    ctaUrl:          CTA_URL,
  },
]

/* Week 2 — the 48-hour itinerary. Four moments, so the dev path exercises a
   variable count rather than always the maximum. */
export const WF2_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Mapped Weekend',
    subjectLine:  'Your perfect 48 hours, mapped out.',
    previewText:  'From first coffee to last stargaze, we mapped it out for you.',
    headlineText: 'Two days. One hot tub under the stars.',
    bodyText:     'You don\'t need a plan to enjoy this place. But if you like knowing what\'s ahead, here\'s the shape of a good 48 hours.',
    introCtaText: 'See The Itinerary',
    moments: [
      { label: 'Day One, Afternoon', momentCopy: 'Unpack, then don\'t. The hot tub is already warm and waiting on the deck.' },
      { label: 'Day One, Evening', momentCopy: 'Fire up the grill. Eat outside, then get in the hot tub and stay there longer than you meant to.' },
      { label: 'Day Two, Morning', momentCopy: 'Make coffee in the kitchenette and take it out to the deck. The on-property trails are right there when you are ready to move.' },
      { label: 'Day Two, Evening', momentCopy: 'Board games are already in the unit. Or skip all of it and get back in the hot tub.' },
    ],
    ctaText:     'See Where This Happens',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your code STAR23 takes 10% off, two nights minimum.',
  },
  {
    id: 2,
    name: 'The Slow Reset',
    subjectLine:  'Two days that do not need planning',
    previewText:  'Everything is already here — here is one way to use it.',
    headlineText: 'Forty-eight hours, already sorted',
    bodyText:     'No itinerary required. But if you want one, this is how we would spend it.',
    introCtaText: 'Start Here',
    moments: [
      { label: 'Day One, Afternoon', momentCopy: 'Unpack, then don\'t. The hot tub is already warm and waiting on the deck.' },
      { label: 'Day One, Evening', momentCopy: 'Fire up the grill. Eat outside, then get in the hot tub and stay there longer than you meant to.' },
      { label: 'Day Two, Morning', momentCopy: 'Make coffee in the kitchenette and take it out to the deck. The on-property trails are right there when you are ready to move.' },
      { label: 'Day Two, Evening', momentCopy: 'Board games are already in the unit. Or skip all of it and get back in the hot tub.' },
    ],
    ctaText:     'Book Your Two Nights',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your code STAR23 takes 10% off, two nights minimum.',
  },
  {
    id: 3,
    name: 'The Screen-Free Weekend',
    subjectLine:  'What two nights away actually looks like',
    previewText:  'Trails, a grill, a hot tub, and no reason to rush.',
    headlineText: 'Slow down for two days',
    bodyText:     'Here is the shape of a weekend where nobody checks their phone.',
    introCtaText: 'See The Plan',
    moments: [
      { label: 'Day One, Afternoon', momentCopy: 'Unpack, then don\'t. The hot tub is already warm and waiting on the deck.' },
      { label: 'Day One, Evening', momentCopy: 'Fire up the grill. Eat outside, then get in the hot tub and stay there longer than you meant to.' },
      { label: 'Day Two, Morning', momentCopy: 'Make coffee in the kitchenette and take it out to the deck. The on-property trails are right there when you are ready to move.' },
      { label: 'Day Two, Evening', momentCopy: 'Board games are already in the unit. Or skip all of it and get back in the hot tub.' },
    ],
    ctaText:     'Reserve Your Stay',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your code STAR23 takes 10% off, two nights minimum.',
  },
]

/* Week 3 — guest reviews, quoted verbatim from the real Starlight Haven ones.
   The attributions end in "via <platform>" because the template reads the
   platform off the end of that line. */
export const WF3_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Guest Book',
    subjectLine:  'What Megan said after checkout',
    previewText:  '"We got the best of both worlds" — Megan, March guest',
    headlineText: 'Straight from the guest book',
    bodyText:     'We could tell you about the hot tubs and the quiet — but the people who\'ve stayed say it better.',
    reviews: [
      { quote: 'My husband has always wanted to try staying in a vacation dome. He loved it!! … We got the best of both worlds. We were in the woods, but downtown Hot Springs was super close.',
        attribution: 'Megan, Deluxe Dome stay, March 2026, via Airbnb' },
      { quote: 'This was our second time staying in one of the treehouse cabins, and we will definitely be back for a third visit. The cabins are always spotless, cozy, and thoughtfully designed for a relaxing getaway.',
        attribution: 'Daniel, Treehouse stay, February 2026, via Google' },
      { quote: 'The surrounding forest was beautiful, filled with wildlife. Not to mention the hiking trails on site. If you need a good way to relax and change up your routine, I highly recommend going to Starlight Haven!',
        attribution: 'Priya, Treehouse stay, January 2026, via Airbnb' },
    ],
    ctaText:     'Experience It Yourself',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your welcome code STAR23 is still good: 10% off any stay of two nights or more when you book direct at visitstarlight.com.',
  },
  {
    id: 2,
    name: 'The Repeat Visit',
    subjectLine:  'They came back a second time. Here\'s why.',
    previewText:  '"We will definitely be back for a third visit" — Daniel, February guest',
    headlineText: 'What guests say after the drive home',
    bodyText:     'Some guests book once. These ones keep coming back — here\'s what they told us.',
    reviews: [
      { quote: 'This was our second time staying in one of the treehouse cabins, and we will definitely be back for a third visit. The cabins are always spotless, cozy, and thoughtfully designed for a relaxing getaway.',
        attribution: 'Daniel, Treehouse stay, February 2026, via Google' },
      { quote: 'My husband has always wanted to try staying in a vacation dome. He loved it!! … We got the best of both worlds. We were in the woods, but downtown Hot Springs was super close.',
        attribution: 'Megan, Deluxe Dome stay, March 2026, via Airbnb' },
      { quote: 'The surrounding forest was beautiful, filled with wildlife. Not to mention the hiking trails on site. If you need a good way to relax and change up your routine, I highly recommend going to Starlight Haven!',
        attribution: 'Priya, Treehouse stay, January 2026, via Airbnb' },
    ],
    ctaText:     'Book Your First Stay',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your welcome code STAR23 is still good: 10% off any stay of two nights or more when you book direct at visitstarlight.com.',
  },
  {
    id: 3,
    name: 'The Quiet Reset',
    subjectLine:  '"A good way to relax and change up your routine"',
    previewText:  '"Filled with wildlife" — Priya, January guest',
    headlineText: 'Don\'t take our word for it',
    bodyText:     'Three guests, three different stays, and the same thing said three ways.',
    reviews: [
      { quote: 'The surrounding forest was beautiful, filled with wildlife. Not to mention the hiking trails on site. If you need a good way to relax and change up your routine, I highly recommend going to Starlight Haven!',
        attribution: 'Priya, Treehouse stay, January 2026, via Airbnb' },
      { quote: 'My husband has always wanted to try staying in a vacation dome. He loved it!! … We got the best of both worlds. We were in the woods, but downtown Hot Springs was super close.',
        attribution: 'Megan, Deluxe Dome stay, March 2026, via Airbnb' },
      { quote: 'This was our second time staying in one of the treehouse cabins, and we will definitely be back for a third visit. The cabins are always spotless, cozy, and thoughtfully designed for a relaxing getaway.',
        attribution: 'Daniel, Treehouse stay, February 2026, via Google' },
    ],
    ctaText:     'See It For Yourself',
    ctaUrl:      'https://visitstarlight.com',
    closingLine: 'Your welcome code STAR23 is still good: 10% off any stay of two nights or more when you book direct at visitstarlight.com.',
  },
]

/* The dev-skip path seeds whichever week the brief has selected. A week with no
   test copy of its own falls back to Week 1's, which is what the button did for
   every week before. */

/* Week 4 test copy — the local area guide, as the Email 4 workflow wrote it on
   2026-09-04 (three variations, verbatim). The workflow sends the block headers
   as positions ("1 of 3"), which the parser drops; the three headers below were
   supplied for the sample so the blocks read as sections. */
export const WF4_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Signature Thing',
    subjectLine:     '8 minutes from Starlight Haven: Bathhouse Row',
    previewText:     'Where to walk, where to eat, one place worth the detour.',
    headlineText:    'Start at Bathhouse Row. Keep going.',
    sectionSubhead:  'A few things we\u2019d point you to, and one we\u2019d insist on.',
    blocks: [
      { blockHeader: 'Where To Wander', entries: 'Hot Springs National Park and Bathhouse Row \u2014 The centerpiece of the most visited city in Arkansas, and a working bathhouse district you can walk end to end.\nOuachita National Forest \u2014 The Northwoods Trail System, the Sunset Trail and the Ouachita National Recreation Trail all run through it.\nHot Springs Mountain Tower \u2014 216 feet up, with the whole valley spread out underneath you.' },
      { blockHeader: 'Where To Eat',    entries: 'Superior Bathhouse Brewery \u2014 The only brewery in a U.S. national park, brewing beer with thermal spring water.\nDeLuca\u2019s Pizzeria Napoletana \u2014 72-hour dough, and worth planning around, since they\u2019re closed Tuesday and Wednesday.' },
      { blockHeader: 'Where To End Up', entries: 'Garvan Woodland Gardens \u2014 210 acres, including the soaring Anthony Chapel, whose floor-to-ceiling glass walls frame the surrounding forest.' },
    ],
    bodyBlock2Title: 'Then there\u2019s the drive back',
    bodyBlock2:      'Downtown is 8 minutes away, so the day out is easy. What makes it worth it is the private hot tub on the deck at the other end of that drive, with nobody in earshot. That\u2019s the part worth picking dates for.',
    ctaText:         'Plan The Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more when you book direct.',
  },
  {
    id: 2,
    name: 'The Day That Builds',
    subjectLine:     'A day out near Starlight Haven, in order',
    previewText:     'Morning on the trails, dinner downtown, one last stop.',
    headlineText:    'A day with a shape to it.',
    sectionSubhead:  'A few places we\u2019d point you to, in the order we\u2019d do them.',
    blocks: [
      { blockHeader: 'Where To Wander', entries: 'Hot Springs National Park and Bathhouse Row \u2014 The centerpiece of the most visited city in Arkansas, and a working bathhouse district you can walk end to end.\nOuachita National Forest \u2014 The Northwoods Trail System, the Sunset Trail and the Ouachita National Recreation Trail all run through it.\nHot Springs Mountain Tower \u2014 216 feet up, with the whole valley spread out underneath you.' },
      { blockHeader: 'Where To Eat',    entries: 'Superior Bathhouse Brewery \u2014 The only brewery in a U.S. national park, brewing beer with thermal spring water.\nDeLuca\u2019s Pizzeria Napoletana \u2014 72-hour dough, and worth planning around, since they\u2019re closed Tuesday and Wednesday.' },
      { blockHeader: 'Where To End Up', entries: 'Garvan Woodland Gardens \u2014 210 acres, including the soaring Anthony Chapel, whose floor-to-ceiling glass walls frame the surrounding forest.' },
    ],
    bodyBlock2Title: 'Where the day actually ends',
    bodyBlock2:      'Do the whole run, or pick two of them. Either way, it finishes back up the mountain road at a private hot tub on the deck, which is the reason to sort the rest of it now.',
    ctaText:         'Plan The Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more when you book direct.',
  },
  {
    id: 3,
    name: 'The One We\u2019d Insist On',
    subjectLine:     'Garvan Woodland Gardens is the one we\u2019d insist on',
    previewText:     'Two hundred and ten acres, and a chapel made of glass.',
    headlineText:    'Save this one for last.',
    sectionSubhead:  'A few things we\u2019d point you to, and the one we\u2019d push hardest.',
    blocks: [
      { blockHeader: 'Where To Wander', entries: 'Hot Springs National Park and Bathhouse Row \u2014 The centerpiece of the most visited city in Arkansas, and a working bathhouse district you can walk end to end.\nOuachita National Forest \u2014 The Northwoods Trail System, the Sunset Trail and the Ouachita National Recreation Trail all run through it.\nHot Springs Mountain Tower \u2014 216 feet up, with the whole valley spread out underneath you.' },
      { blockHeader: 'Where To Eat',    entries: 'Superior Bathhouse Brewery \u2014 The only brewery in a U.S. national park, brewing beer with thermal spring water.\nDeLuca\u2019s Pizzeria Napoletana \u2014 72-hour dough, and worth planning around, since they\u2019re closed Tuesday and Wednesday.' },
      { blockHeader: 'Where To End Up', entries: 'Garvan Woodland Gardens \u2014 210 acres, including the soaring Anthony Chapel, whose floor-to-ceiling glass walls frame the surrounding forest.' },
    ],
    bodyBlock2Title: 'After the chapel, head back up',
    bodyBlock2:      'Walk out of all that glass, drive the mountain road back, and there\u2019s a private hot tub waiting on the deck with the forest around it. Two good hours, and then the better one.',
    ctaText:         'Plan The Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more when you book direct.',
  },
]

/* Week 5 test copy — the guest story, as the Email 5 workflow wrote it on
   2026-09-04 (three variations, verbatim). One long account quoted in full;
   the framing around it is what changes between variations. */
const WF5_STORY = 'Our journey began at 4am in Chicago with plans to drive all day and land in Dallas. Things were going smoothly until we decided to make a pit stop in Memphis for some barbecue. We got sidetracked exploring the city and realized we were going to need a place to stay for the night. We decided we could make it to Hot Springs, which is where we stumbled upon Starlight Haven. With a quick pit stop, we embarked on our journey up a fantastic mountain road that twisted and turned until we arrived at the gates of Starlight Haven. The check-in process for these two weary travelers went off without a hitch and was extremely easy to navigate. Upon arriving at our little geodesic dome, our night quickly erupted into a flurry of unbridled excitement. We entered the dome and were immediately greeted with the luxurious scent of rich cashmere and the most darling little slice of paradise our sore eyes had ever gazed upon. We quickly fired up the grill for our steaks and threw together a salad to complete our evening. After a bottle of wine and a long soak in the preheated hot tub, we showered up and retired to the magnificent bed for a restful night\u2019s sleep under the stars. When morning came, we were greeted by a gentle sunrise through our massive panoramic window, beckoning us to start our day. We had yogurt and granola as we discussed our plans for the day ahead. We decided to continue this adventure and visit Hot Springs National Park before embarking on the remainder of our journey! Thank you for such an amazing experience.'

export const WF5_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'The Detour That Became The Trip',
    subjectLine:     'Dave was supposed to be in Dallas by dark',
    previewText:     'A wrong turn toward barbecue changed the whole trip',
    campaignEyebrow: 'A GUEST\u2019S OWN WORDS',
    headlineText:    'The Detour Turned Out To Be The Point',
    sectionSubhead:  'Dave wrote this after a road trip that didn\u2019t go anywhere close to plan.',
    bodyText:        'Dave and his travel partner were supposed to be in Dallas by nightfall. Here\u2019s what happened instead, in his words.',
    sectionEyebrow:  'What Happened Next',
    quote:           WF5_STORY,
    guestFirstName:  'Dave',
    storyDate:       'May 2026',
    attribution:     'Dave, May 2026',
    bodyBlock2Title: 'Yours doesn\u2019t need a detour to start',
    bodyBlock2:      'Dave never planned to stop here; he just needed a place to land. You can skip that part and just pick the dates. Code STAR23 takes 10% off any stay of two nights or more, booked direct, whenever you\u2019re ready to look.',
    closingLine:     'Dave called it an amazing experience, and he never meant to have it. Yours can start on purpose.',
    ctaText:         'Book This Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is good for 10% off any stay of two nights or more when you book direct.',
  },
  {
    id: 2,
    name: 'What Was Waiting Behind The Door',
    subjectLine:     'What Dave found on the other side of the door',
    previewText:     'Steaks, wine, and a soak under the stars followed',
    campaignEyebrow: 'A GUEST\u2019S OWN WORDS',
    headlineText:    'The Night Changed The Moment They Walked In',
    sectionSubhead:  'Dave\u2019s account of the first few minutes inside his dome, in his own words.',
    bodyText:        'Dave had just driven all day to get somewhere else. Then he opened the door to his dome.',
    sectionEyebrow:  'In His Words',
    quote:           WF5_STORY,
    guestFirstName:  'Dave',
    storyDate:       'May 2026',
    attribution:     'Dave, May 2026',
    bodyBlock2Title: 'The same door is there for you',
    bodyBlock2:      'Dave\u2019s night turned around the second he stepped inside. Every stay here comes with a private hot tub on your own deck, ready for exactly that kind of evening. Code STAR23 takes 10% off any stay of two nights or more, booked direct, whenever you want to look at dates.',
    closingLine:     'Dave planned to be somewhere else entirely. He ended up somewhere better.',
    ctaText:         'Book This Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is good for 10% off any stay of two nights or more when you book direct.',
  },
  {
    id: 3,
    name: 'The Whole Letter',
    subjectLine:     'Dave wrote us a full letter about one night',
    previewText:     'A detour, a dome, and a thank you at the end',
    campaignEyebrow: 'A GUEST\u2019S OWN WORDS',
    headlineText:    'One Night Was Worth This Much Detail',
    sectionSubhead:  'Here\u2019s the account Dave sent us, start to finish, unedited.',
    bodyText:        'Some guests leave a star rating. Dave sent this instead.',
    sectionEyebrow:  'The Full Account',
    quote:           WF5_STORY,
    guestFirstName:  'Dave',
    storyDate:       'May 2026',
    attribution:     'Dave, May 2026',
    bodyBlock2Title: 'Now it\u2019s your turn to write one',
    bodyBlock2:      'Dave didn\u2019t have to send this; he just wanted to. Every stay comes with a private hot tub on your own deck, the same one that made his night. Code STAR23 takes 10% off any stay of two nights or more, booked direct, whenever you want to look at dates.',
    closingLine:     'Dave signed off with a thank you. That tends to happen here.',
    ctaText:         'Book This Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is good for 10% off any stay of two nights or more when you book direct.',
  },
]

export const wfTestVariations = (week) =>
  Number(week) === 2 ? WF2_TEST_VARIATIONS
  : Number(week) === 3 ? WF3_TEST_VARIATIONS
  : Number(week) === 4 ? WF4_TEST_VARIATIONS
  : Number(week) === 5 ? WF5_TEST_VARIATIONS
  : WF_TEST_VARIATIONS
