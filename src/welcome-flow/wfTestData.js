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
    bodyBlock1Title: 'THE SHAPE OF IT',
    bodyBlock1:      "This is the slow read of the opening. None of it is required, and none of it is timed. It's mostly what the property does to your pace once you stop pushing against it.",
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
    bodyBlock1Title: 'THE FULL VERSION',
    bodyBlock1:      "This one moves. The deck, the trails, and the kitchen all get used, and the park gets an afternoon. Take it as written, or keep half of it back for later.",
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
    bodyBlock1Title: 'NO PLANNING REQUIRED',
    bodyBlock1:      "Everything below is optional. It's less an itinerary than a list of things already there and waiting, whether you reach them on the first day or the fourth.",
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

/* Week 6 test copy — book direct, as the Email 6 workflow wrote it on
   2026-09-04 (three variations, verbatim, including the markdown-style links
   the workflow puts in the subhead and intro). */
export const WF6_TEST_VARIATIONS = [
  {
    id: 1,
    name: 'Value',
    subjectLine:     'What booking direct actually saves you',
    previewText:     'The direct-booking rate, plus a separate discount code inside.',
    headlineText:    'Save up to 15% booking direct.',
    sectionSubhead:  'Booking through [www.visitstarlight.com](https://www.visitstarlight.com) gets you our lowest direct rate, and code STAR23 is separate from that.',
    bodyText:        'Book your stay at [www.visitstarlight.com](https://www.visitstarlight.com), and here\u2019s exactly what changes when you do.',
    sectionHeadline: 'Three reasons to book here',
    points: [
      { title: 'Save up to 15%.', text: 'Booking direct through our website gets you our best available direct rate.' },
      { title: 'Code STAR23, separately.', text: 'That\u2019s on top of the direct rate. STAR23 takes 10% off with a 2 night minimum.' },
      { title: 'Add to your stay after booking.', text: 'Once you\u2019ve booked, you can add packages and early check-in through the guest app.' },
    ],
    bodyBlock2Title: 'Our cancellation policy, plainly',
    bodyBlock2:      'Cancel 30 or more days before check-in, and you get a full refund. Cancel less than 30 days out, and you\u2019re charged 50% of your total booking amount, which covers your accommodation and any add-ons or fees on the reservation. This policy is the same whichever way you book. If you\u2019d rather talk it through, call us at 501-359-5884.',
    closingLine:     'Code STAR23 is still active whenever you\u2019re ready. We hope to welcome you to Starlight Haven soon.',
    ctaText:         'See the direct rate',
    ctaUrl:          CTA_URL,
    footerLine:      '',
  },
  {
    id: 2,
    name: 'Transparency',
    subjectLine:     'The terms, laid out plainly',
    previewText:     'No surprises: here\u2019s what you get and what it costs, in plain language.',
    headlineText:    'Here\u2019s exactly what you\u2019re agreeing to.',
    sectionSubhead:  'A full refund if you cancel 30 or more days out, and code STAR23 for 10% off with a 2 night minimum.',
    bodyText:        'Book at [www.visitstarlight.com](https://www.visitstarlight.com), and know exactly where you stand before you do.',
    sectionHeadline: 'Three things worth knowing',
    points: [
      { title: 'Code STAR23 takes 10% off.', text: 'It applies with a 2 night minimum, and it\u2019s a direct-booking code.' },
      { title: 'Direct booking has its own rate.', text: 'You can save up to 15% booking directly through our website, separate from the code.' },
      { title: 'You can call instead.', text: 'Call 501-359-5884, and we\u2019ll help you book the reservation directly, no website needed.' },
    ],
    bodyBlock2Title: 'The cancellation policy, in full',
    bodyBlock2:      'Cancel 30 or more days before check-in, and you get every dollar back. Cancel less than 30 days out, and you\u2019re charged 50% of your total booking amount, covering your accommodation and any add-ons or fees attached to the reservation. This applies the same way no matter how you book with us. Questions before you commit? Call 501-359-5884.',
    closingLine:     'Code STAR23 is still active whenever you\u2019re ready. We hope to welcome you to Starlight Haven soon.',
    ctaText:         'Read the full terms',
    ctaUrl:          CTA_URL,
    footerLine:      '',
  },
  {
    id: 3,
    name: 'Enumeration',
    subjectLine:     'Four things you get booking direct',
    previewText:     'The rate, the code, the flexibility to add on, and a real person on the phone.',
    headlineText:    'Four things you only get here.',
    sectionSubhead:  'A direct rate up to 15% off, code STAR23 for another 10%, and a full refund window.',
    bodyText:        'Book at [www.visitstarlight.com](https://www.visitstarlight.com), and here\u2019s the full list of what comes with it.',
    sectionHeadline: 'Four things worth knowing',
    points: [
      { title: 'Up to 15% off, direct.', text: 'Booking through our website gets you our best direct rate.' },
      { title: 'Code STAR23, separately.', text: 'That\u2019s before the code. STAR23 takes another 10% off with a 2 night minimum.' },
      { title: 'Add on after you book.', text: 'Packages and early check-in can be added to your reservation through the guest app.' },
      { title: 'A person on the phone.', text: 'Call 501-359-5884, and we\u2019ll walk you through the booking directly.' },
    ],
    bodyBlock2Title: 'And the cancellation policy',
    bodyBlock2:      'Cancel 30 or more days before check-in, and you get a full refund. Cancel less than 30 days out, and you\u2019re charged 50% of your total booking amount, which covers your stay and any add-ons or fees on the reservation. This is the same policy however you book with us. Call 501-359-5884 if you\u2019d like to go over it first.',
    closingLine:     'Code STAR23 is still active whenever you\u2019re ready. We hope to welcome you to Starlight Haven soon.',
    ctaText:         'See all four benefits',
    ctaUrl:          CTA_URL,
    footerLine:      '',
  },
]

/* Week 7 test copy — the midweek email. PLACEHOLDER: the Email 7 workflow has
   not produced output yet, so this structure and copy were authored here from
   the Email 7 brief template (perk, perk-and-code-together, midweek pricing).
   Replace with the workflow's real output when it exists. */
/* Email 7 test copy — the midweek email, as the Email 7 workflow wrote it on
   2026-09-08 (three variations, verbatim). Variation 1's footer arrived as a
   bracketed instruction rather than a sentence, so it carries variation 2's
   code reminder, which is the line the brief asked for. */
export const WF7_TEST_VARIATIONS = [
  {
    id: 1, name: 'You don\u2019t need a weekend',
    subjectLine:     'What if you didn\u2019t wait for the weekend?',
    previewText:     'The part of Starlight Haven people don\u2019t think to ask about.',
    headlineText:    'You don\u2019t need a weekend for this.',
    sectionSubhead:  'Couples book Starlight Haven for weekends, but midweek is the version most of them don\u2019t picture.',
    introCtaText:    'Plan A Midweek Stay',
    bodyText:        'Most people picture a weekend when they imagine coming here. Fair enough. But the same stay is there in the middle of the week, and it\u2019s a different thing entirely.\n\nGet in the hot tub while the rest of the world is at work. Take the trails at whatever pace you feel like. Same place, same forest, just a slower rhythm.',
    bodyBlock2Title: 'Or do both',
    bodyBlock2:      'Start midweek and stay through the weekend if you want both kinds of days. Code STAR23 takes 10% off any stay of two nights or more, midweek nights included. Have a look at what suits your week.',
    closingLine:     'However you get here, we\u2019ll be glad you came. We just didn\u2019t want midweek to be the thing nobody mentioned.',
    ctaText:         'Plan A Midweek Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is still good for 10% off any stay of two nights or more, midweek nights included.',
  },
  {
    id: 2, name: 'The world outside slows down',
    subjectLine:     'Midweek here is quieter than you\u2019d think',
    previewText:     'Fewer people, slower pace, and the same stay waiting.',
    headlineText:    'The week is quieter than the weekend.',
    sectionSubhead:  'Couples who come to Starlight Haven midweek get the same stay with a calmer world around it.',
    introCtaText:    'See Midweek Stays',
    bodyText:        'The property doesn\u2019t change midweek. What changes is everything around it.\n\nThe roads are easier. The pace out here drops. You can sit on your own deck with a coffee and hear nothing but the forest. Then get in the hot tub and stay there as long as you like.',
    bodyBlock2Title: 'That quiet is the whole point',
    bodyBlock2:      'It isn\u2019t a smaller trip, it\u2019s a calmer one, and that turns out to be the reason people come back midweek. Code STAR23 takes 10% off any stay of two nights or more, midweek nights included. Take a look at what fits your week.',
    closingLine:     'The quiet out here is worth planning around. Go find out what a week feels like instead of a weekend.',
    ctaText:         'See Midweek Stays',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is still good for 10% off any stay of two nights or more, midweek nights included.',
  },
  {
    id: 3, name: 'Nothing downgrades',
    subjectLine:     'Midweek isn\u2019t the smaller version',
    previewText:     'Same accommodation, same hot tub, same forest. Different week.',
    headlineText:    'Nothing about the stay changes midweek.',
    sectionSubhead:  'Couples booking Starlight Haven midweek get the identical stay, not a stripped-back version of it.',
    introCtaText:    'Book A Midweek Stay',
    bodyText:        'There\u2019s a habit of thinking midweek means less. Less of the place, less of the experience, a compromise you make to save something.\n\nNot here. The hot tub is your hot tub. The deck is the same deck. The trails start at the same door. You get all of it, in a week that happens to be quieter.',
    bodyBlock2Title: 'What you give up midweek',
    bodyBlock2:      'Nothing, as it turns out. The stay is identical, and code STAR23 takes 10% off any stay of two nights or more, midweek nights included. Have a look at the week rather than the weekend.',
    closingLine:     'You\u2019re not settling for anything by coming midweek. You\u2019re picking the better version of the same trip.',
    ctaText:         'Book A Midweek Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 is still good for 10% off any stay of two nights or more, midweek nights included.',
  },
]

/* Week 8 test copy — the decision nudge, as the Email 8 workflow wrote it on
   2026-09-05 (three variations, verbatim). Each objection is kept as the
   question and its answer only; the workflow's joined `text` line and its
   `rendered` markdown dump are not copy and are not carried. */
export const WF8_TEST_VARIATIONS = [
  {
    id: 1, name: 'Reversibility',
    subjectLine:     'Book the dates before you\u2019re certain',
    previewText:     'Cancel 30 days out and you get it all back.',
    campaignEyebrow: 'BOOK IT, MOVE IT LATER',
    headlineText:    'You can change your mind later.',
    sectionSubhead:  'Picking your dates doesn\u2019t mean being certain about them, and that\u2019s the whole reason to go ahead now.',
    heroCtaText:     'Book Your Stay',
    bodyText:        'Four weeks ago you had a reason to open that first email. Maybe it was the hot tub, maybe it was just the idea of somewhere quiet for a couple of nights. That reason hasn\u2019t gone anywhere, and neither has the code.\n\nBook the days anyway, even if they\u2019re not locked in yet. Cancel 30 or more days out and you get the full amount back, so what you\u2019re putting down now is closer to a placeholder than a promise.',
    objections: [
      { objection: 'Plans might still move?', answer: 'Cancel 30 or more days before check-in and you get a full refund.' },
      { objection: 'Don\u2019t want to plan a whole trip?', answer: 'Every stay comes with its own private hot tub, so there\u2019s not much to arrange once you arrive.' },
      { objection: 'Not sure which stay fits?', answer: 'Start with the dates. Which one you pick is the easier decision once the days are set.' },
    ],
    bodyBlock2Title: 'Worst case, you move it',
    bodyBlock2:      'Pick the days you\u2019d want and put them into the calendar. If they\u2019re already taken, try the ones on either side and see what the calendar shows. And if your plans shift before you go, you\u2019ve got until 30 days out to undo the whole thing.',
    closingLine:     'Put some days down. You can sort the rest out later.',
    contactFallback: 'Prefer to book by phone? Call 501-359-5884.',
    ctaText:         'Book Your Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more, whenever you\u2019re ready.',
  },
  {
    id: 2, name: 'Specificity',
    subjectLine:     'All that\u2019s left is picking dates',
    previewText:     'Four weeks in, the only open question is when.',
    campaignEyebrow: 'ONE THING LEFT',
    headlineText:    'It\u2019s just the dates now.',
    sectionSubhead:  'You\u2019ve had everything you need for four weeks, so the only thing still open is when to go.',
    heroCtaText:     'Book Your Stay',
    bodyText:        'You\u2019ve had the code a while now. The dome or the treehouse or the tent is still there, the hot tub is still on the deck, and none of that is going to look any different next week.\n\nSo really, it comes down to two dates and a calendar. Pick the ones that work for the two of you, put them in, and that\u2019s the last thing this trip needs from you.',
    objections: [
      { objection: 'Dates not certain yet?', answer: 'Cancel 30 or more days before check-in and you get a full refund.' },
      { objection: 'Think there\u2019s more to figure out?', answer: 'Every stay comes with its own private hot tub, so there\u2019s not much to arrange once you arrive.' },
      { objection: 'Stuck on which stay?', answer: 'Start with the dates. Which one you pick is the easier decision once the days are set.' },
    ],
    bodyBlock2Title: 'The last thing on the list',
    bodyBlock2:      'Choose your two dates and check them on the calendar. If those exact days aren\u2019t open, try nearby ones and see what the calendar shows instead. Either way, it\u2019s the same short step, and then it\u2019s off your list.',
    closingLine:     'There\u2019s nothing left to weigh up. Go pick the dates.',
    contactFallback: 'Prefer to book by phone? Call 501-359-5884.',
    ctaText:         'Book Your Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more, whenever you\u2019re ready.',
  },
  {
    id: 3, name: 'Delegation',
    subjectLine:     'Your only job is picking the dates',
    previewText:     'Nothing else here needs planning, packing lists or reservations.',
    campaignEyebrow: 'YOUR ONLY JOB',
    headlineText:    'The dates are your only job.',
    sectionSubhead:  'Once the days are picked, there\u2019s nothing else about this trip you have to arrange.',
    heroCtaText:     'Book Your Stay',
    bodyText:        'Some getaways take real planning. Reservations, packing the right gear, figuring out what\u2019s open and when. This isn\u2019t that kind.\n\nEvery stay already has its own private hot tub waiting on the deck, and honestly, that\u2019s most of what a night here looks like. Soak, talk, sleep, wake up somewhere quiet. Your part is choosing when you go. After that, there\u2019s nothing left to organize.',
    objections: [
      { objection: 'Plans still shifting?', answer: 'Cancel 30 or more days before check-in and you get a full refund.' },
      { objection: 'No energy to plan a trip?', answer: 'Every stay comes with its own private hot tub, so there\u2019s not much to arrange once you arrive.' },
      { objection: 'Can\u2019t decide between the stays?', answer: 'Start with the dates. Which one you pick is the easier decision once the days are set.' },
    ],
    bodyBlock2Title: 'Nothing else to arrange',
    bodyBlock2:      'Put your dates into the calendar and see what it shows. If those particular days are taken, check the ones around them. Once the dates are set, the only thing left is showing up.',
    closingLine:     'Sort the dates and the rest is ours to handle. Go pick them.',
    contactFallback: 'Prefer to book by phone? Call 501-359-5884.',
    ctaText:         'Book Your Stay',
    ctaUrl:          CTA_URL,
    footerLine:      'Code STAR23 takes 10% off any stay of two nights or more, whenever you\u2019re ready.',
  },
]

/* Email 9 test copy — the concierge close, as the Email 9 workflow wrote it on
   2026-09-08 (three variations, verbatim). Each example question is kept as
   the question and its answer only; the workflow's joined `text` line and its
   lineNumber are not copy. No CTA and no code reminder: this one asks for a
   reply. The run flagged the signature for review since no reply owner was
   supplied. */
export const WF9_TEST_VARIATIONS = [
  {
    id: 1, name: 'Any question we can answer',
    subjectLine:         'Any question we can answer for you?',
    previewText:         'Reply to this one and it reaches us at the property.',
    bodyText:            'You\u2019ve got the general picture of Starlight Haven by now: the domes, the treehouses, the tent suite, the code.\n\nWhat\u2019s usually left is something specific: which unit actually fits the two of you, how far in you\u2019ll really be, or what happens if the dates you want stop working.\n\nIf you\u2019ve got a question like that, reply to this email and ask.',
    questionFramingLine: 'A few that come up:',
    exampleQuestions: [
      { question: 'Which stay fits us?', answer: 'The Deluxe Domes and Treehouses both sleep up to 4. The Glamping Tent Suite is built for 2.' },
      { question: 'How far in are we, really?', answer: 'We\u2019re about an 8-minute drive from downtown Hot Springs, so you\u2019re close without giving up the feel of being out in the trees.' },
      { question: 'What if our plans change?', answer: 'Cancel 30 or more days before check-in, and you get a full refund. Inside that window, it\u2019s 50% of the booking amount.' },
    ],
    closingLine:         'Whatever yours is, send it over. It reaches us at the property, and someone will get back to you.',
    signature:           'Kevin, Starlight Haven Hot Springs',
    ctaText:             '',
    footerLine:          '',
  },
  {
    id: 2, name: 'Reply here with your question',
    subjectLine:         'Reply here with your question',
    previewText:         'Send us what\u2019s still unclear. It goes straight to the property.',
    bodyText:            'The easiest thing at this point is to just answer whatever\u2019s still open for you.\n\nSo, reply to this email with your question. That\u2019s the whole mechanism. It comes to us at the property, and someone reads it.\n\nThree worth knowing anyway, in case yours is one of them.',
    questionFramingLine: 'Three worth knowing anyway:',
    exampleQuestions: [
      { question: 'Which stay fits us?', answer: 'The Deluxe Domes and Treehouses both sleep up to 4. The Glamping Tent Suite is built for 2.' },
      { question: 'How far in are we, really?', answer: 'We\u2019re about an 8-minute drive from downtown Hot Springs.' },
      { question: 'What if our plans change?', answer: 'Cancel 30 or more days out, and it\u2019s a full refund. Less than 30 days, it\u2019s 50% of the booking amount.' },
    ],
    closingLine:         'If yours isn\u2019t here, reply and ask. Someone at the property will get back to you.',
    signature:           'Kevin, Starlight Haven Hot Springs',
    ctaText:             '',
    footerLine:          '',
  },
  {
    id: 3, name: 'We\u2019d rather answer one question',
    subjectLine:         'We\u2019d rather answer one question',
    previewText:         'Than send you another email about the hot tub.',
    bodyText:            'We\u2019d rather answer a question than send you another email about the hot tub.\n\nYou\u2019ve seen the stays and the code by now. If something specific is still unclear, asking us is faster than us guessing what it might be.\n\nReply to this one, and it lands with us at the property.',
    questionFramingLine: 'Three we can answer right here:',
    exampleQuestions: [
      { question: 'Which stay fits us?', answer: 'The Deluxe Domes and Treehouses both sleep up to 4. The Glamping Tent Suite is built for 2.' },
      { question: 'How far in are we, really?', answer: 'About 8 minutes from downtown Hot Springs.' },
      { question: 'What if our plans change?', answer: 'Full refund if you cancel 30 or more days before check-in. Under that, it\u2019s 50% of the booking amount.' },
    ],
    closingLine:         'Anything else, just reply. Someone at the property will get back to you.',
    signature:           'Kevin, Starlight Haven Hot Springs',
    ctaText:             '',
    footerLine:          '',
  },
]

export const wfTestVariations = (week) =>
  Number(week) === 2 ? WF2_TEST_VARIATIONS
  : Number(week) === 3 ? WF3_TEST_VARIATIONS
  : Number(week) === 4 ? WF4_TEST_VARIATIONS
  : Number(week) === 5 ? WF5_TEST_VARIATIONS
  : Number(week) === 6 ? WF6_TEST_VARIATIONS
  : Number(week) === 7 ? WF7_TEST_VARIATIONS
  : Number(week) === 8 ? WF8_TEST_VARIATIONS
  : Number(week) === 9 ? WF9_TEST_VARIATIONS
  : Number(week) === 1 ? WF_TEST_VARIATIONS
  /* No test copy for this email yet. Null, not Week 1's stays: the caller
     says so rather than loading copy shaped for a different email. */
  : null
