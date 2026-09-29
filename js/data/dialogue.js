// Dialogue + lore text. Conversations are chosen by the first entry whose `when` matches
// the current progress flags; `set` marks flags after the conversation ends.
(function () {
  const LD = window.LD;
  const has = (s, f) => !!s.flags[f];

  LD.Lines = {
    quillon: [
      {
        when: (s) => !has(s, "metQuillon"),
        set: ["metQuillon"],
        name: "Old Quillon",
        lines: [
          "Ah. A page-mender. Not a moment too late — or perhaps a great many moments too late. Hard to tell, in here.",
          "Welcome to the Bindery. What's left of it. Mind the loose pages; some of them still remember being walls.",
          "Your pen is nearly dry. Seventy drops, give or take. The borough has been bleeding its ink for weeks.",
          "That desk has mended more weapons than I have wrinkles. Draw something on it. The book will read the SHAPE of your line and give it weight.",
          "Long and narrow, it makes a blade. A shaft with a head, a polearm. Something big and heavy... well. You'll see.",
          "But the book never gives back what it takes. Draw with care.",
        ],
      },
      {
        when: (s) => !s.weapon || s.weapon.cls === "nib",
        name: "Old Quillon",
        lines: ["The desk, mender. Draw. A bare nib won't keep the Crawlers off you for long."],
      },
      {
        when: (s) => !has(s, "pigment_water") && !has(s, "quillonBlue"),
        set: ["quillonBlue"],
        name: "Old Quillon",
        lines: [
          "Good. It suits you. Every weapon looks a bit like the hand that drew it.",
          "Now — the blue. It went missing first. The canals ran dry overnight, and the river in the old illustrations went pale as milk.",
          "Look beneath the streets. There's a shaft east of the fountain. The old cistern lies at the far end of the canals.",
          "And, mender... if you see someone down there who looks like they were drawn in a hurry — don't follow them.",
        ],
      },
      {
        when: (s) => !has(s, "pigment_water"),
        name: "Old Quillon",
        lines: [
          "Below the streets. East of the dry fountain. The cistern is where the blue was kept.",
          "If your weapon doesn't suit you, the desk will redraw it. The ink is gone for good either way.",
        ],
      },
      {
        when: (s) => has(s, "pigment_water") && !has(s, "quillonAfterBlue"),
        set: ["quillonAfterBlue"],
        name: "Old Quillon",
        lines: [
          "Blue! Look at it — look at the shelves! I'd forgotten the bindings were blue.",
          "You can steep your weapon in it, at the desk. Water answers fire. Earth drinks it, mind you.",
          "The wheel on the old bridge will turn now. Beyond it, the Vertical District, and above that... the Burnt Archive.",
          "The Marshal guards it. He was a gentle thing once. He lit the lamps. Be careful he doesn't remember that. It'll make him angrier.",
        ],
      },
      {
        when: (s) => !has(s, "boss_marshal"),
        name: "Old Quillon",
        lines: ["Over the bridge, up through the District, into the Archive. Rest before you go in. Please."],
      },
      {
        when: (s) => has(s, "boss_marshal") && !has(s, "quillonAfterBoss"),
        set: ["quillonAfterBoss"],
        name: "Old Quillon",
        lines: [
          "You changed him. I felt it — the whole page shifted a hair to the left.",
          "Foldstep, is it? The book is letting you slip between its creases. It trusts you. That's rare.",
          "There's a tear at the western Margin, where you arrived. A creased veil. I've never dared go near it.",
          "Whoever has been stealing our colors... I think they went that way.",
        ],
      },
      {
        when: () => true,
        name: "Old Quillon",
        lines: [
          "A finished thing is not necessarily a perfect thing. I used to tell apprentices that. None of them listened either.",
        ],
      },
    ],

    lampwick: [
      {
        when: (s) => !has(s, "pigment_water") && !has(s, "metLampwick"),
        set: ["metLampwick"],
        name: "Lampwick",
        lines: [
          "Oh! You're... coloured in. Mostly.",
          "My lamp burns, see? But it doesn't glow. Did you know light could be forgotten?",
          "The fountain used to talk all night. Now it's just a drawing of a fountain. Someone should tell it.",
        ],
      },
      {
        when: (s) => !has(s, "pigment_water"),
        name: "Lampwick",
        lines: ["There are grates in the street. Old Quillon says the canals go all the way to the cistern. I say they go all the way to the bottom of the book."],
      },
      {
        when: (s) => has(s, "pigment_water") && !has(s, "boss_marshal"),
        name: "Lampwick",
        lines: [
          "Hear that? The canals are singing again! I came in to hear it better. The Bindery echoes nicely.",
          "Someone else was down there before you, you know. Left black fingerprints on everything. Didn't take anything. Just... touched.",
        ],
      },
      {
        when: () => true,
        name: "Lampwick",
        lines: ["My lamp glows now. A bit blue, but I'm not complaining. Different isn't worse."],
      },
    ],

    pell: [
      {
        when: (s) => !has(s, "metPell"),
        set: ["metPell"],
        give: "cache",
        name: "Pell, a faded painter",
        lines: [
          "Don't mind me. I'm painting the gardens. Again. They keep coming out red.",
          "Do you ever wonder about the drawings underneath? The ones that were painted over?",
          "I found something in the book's gutter once. A first draft that wouldn't stay erased. It asked me my name.",
          "I didn't answer. I think that was the right thing to do. I think.",
          "Here — take my ink. I can't bring myself to use it anymore. Everything I paint turns out finished.",
        ],
      },
      {
        when: (s) => !has(s, "boss_marshal"),
        name: "Pell",
        lines: ["The trees were blue in the first draft, you know. Nobody asked the first draft what it thought about being red."],
      },
      {
        when: () => true,
        name: "Pell",
        lines: ["I've started a new painting. It's terrible. I love it."],
      },
    ],
  };

  LD.Lore = {
    margin_note: {
      title: "A careful note, tucked away",
      text: "Day 1 of repairs. The borough's blue has gone somewhere. Not faded — ~~stolen~~ ~~taken~~ misplaced. I will find it.\nDay 4. Something in the gutter hums when I work. I have stopped working at night.",
    },
    notice: {
      title: "Notice board, Looseleaf Streets",
      text: "BY ORDER OF THE BINDERY: Residents who find themselves ~~erased~~ ~~missing~~ incomplete are asked to report to the Bindery. Please bring whatever remains of you.",
    },
    mural: {
      title: "Beneath a drawing of a river",
      text: "It flowed here. I remember it flowing. The fish were drawn by a child and they were the happiest fish in the book.\nWhy does nobody else remember?",
    },
    pell_sketch: {
      title: "Pell's discarded sketch",
      text: "First draft of the gardens. The trees were blue. The second draft made them red. The third draft made them ~~better~~ ~~correct~~ red again.\nNobody asked the first draft.",
    },
    rooftop: {
      title: "Ink smeared across the slates",
      text: "every revision is a small funeral\nevery revision is a small funeral\nevery ~~revision~~",
    },
    burnt_letter: {
      title: "A burnt letter",
      text: "Marshal — the lamps must be relit exactly as before. Exactly. Not one wick moved. If they change, we change, and then who will remember how it was?\n— (signature scorched away)",
    },
    fingerprints: {
      title: "Black fingerprints on the empty basin",
      text: "Someone reached the pigment before you. They touched it, and did not take it. Their fingers left no color at all.\nOnly ink.",
    },
    ledger: {
      title: "Quillon's repair ledger",
      text: "Bindery repairs — spine: ~~done~~ pending. Bindings: blue? (can't recall). Apprentice expected: soon. Hope: ~~low~~ moderate.",
    },
  };

  LD.Speech = {
    marshalIntro: [
      { who: "Soot Marshal", text: "Halt, mender. This page was written once. It stays as written." },
      { who: "Soot Marshal", text: "Your pen smells of change. Of erasers and second tries." },
      { who: "Soot Marshal", text: "I will keep the Archive exactly as it burned." },
    ],
    marshalPhase2: { who: "Soot Marshal", text: "Every lamp. Every wick. EXACTLY." },
    marshalPhase3: { who: "Soot Marshal", text: "If I change — who will remember how it was?!" },
    marshalDefeat: [
      { who: "Soot Marshal", text: "...I remember... I used to light the lamps. Before the fire." },
      { who: "Soot Marshal", text: "Was that... a better draft... of me?" },
    ],
    hartIntro: [{ who: "", text: "Something half-erased stirs in the dry basin." }],
    inkSpotAfterBoss: [
      { who: "???", text: "You revised him.", ink: true },
      { who: "???", text: "Do you know what it feels like? To be *improved*?", ink: true },
    ],
    ending: [
      { who: "???", text: "Little mender. So busy fixing things.", ink: true },
      { who: "Ink Spot", text: "Every line you draw is a line that will one day be corrected. Scratched out. Painted over. Forgotten.", ink: true },
      { who: "Ink Spot", text: "I was first. I was the first line anyone drew in this book. And they threw me in the gutter.", ink: true },
      { who: "Ink Spot", text: "So I will keep it. All of it. Every colour. Finished. Safe. Unchangeable. Forever.", ink: true },
      { who: "Ink Spot", text: "Come deeper, if you like. The pages only get older down there.", ink: true },
    ],
  };
})();
