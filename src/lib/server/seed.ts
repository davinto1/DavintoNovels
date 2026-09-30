import { getSql } from "@/lib/db";
import { wordCount } from "@/lib/utils";

type SeedChapter = {
  id: string;
  title: string;
  body: string;
  premium?: boolean;
  price?: number;
};

type SeedNovel = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  palette: string;
  status: "ongoing" | "completed";
  age: string;
  featured?: boolean;
  author: { id: string; username: string; name: string; bio: string };
  genres: string[];
  tags: string[];
  chapters: SeedChapter[];
};

const N: SeedNovel[] = [
  {
    id: "nov_salt",
    slug: "salt-of-the-harmattan",
    title: "Salt of the Harmattan",
    palette: "dust",
    status: "completed",
    age: "16",
    featured: true,
    author: {
      id: "seed_adaeze",
      username: "adaezeokeke",
      name: "Adaeze Okeke",
      bio: "Writes from Enugu about weather, women, and the quiet violence of leaving.",
    },
    genres: ["g_african", "g_drama"],
    tags: ["t_faith", "t_lagos"],
    synopsis:
      "When Nkechi returns from Lagos to bury her father, the harmattan has already taken the colour out of the compound. What it has not taken is the ledger he kept — a book of debts that names the living as surely as the dead.",
    chapters: [
      {
        id: "ch_salt_1",
        title: "The Road Home",
        body: `The bus from Jibowu smelled of oranges and diesel. Nkechi sat with her father's photograph face-down on her knees, because looking at it made the other passengers look too.

Enugu arrived the way memory arrives: first the hills, then the red dust, then a boy selling water in a bag who called her Aunty as if she had never left. She paid him and did not drink.

At the compound gate her aunt was already crying the official cry — the one that can be heard from the road. Nkechi set down her bag and waited for it to finish. Grief, she had learned in Lagos, was a schedule. You could be late for it.`,
      },
      {
        id: "ch_salt_2",
        title: "The Ledger",
        body: `They found the book in the room he had locked since her mother's second burial. It was not a diary. Columns. Dates. Names. Amounts in a hand that never shook.

Uncle Ikenna's name was there three times. The pastor's once. Her own name, dated the week she took the job in Victoria Island, with a number beside it that was not money.

"He was counting years," her aunt said, and would not look at the page.

Nkechi sat on the floor until the harmattan came through the louvres and salted the ink.`,
      },
      {
        id: "ch_salt_3",
        title: "What the Living Owe",
        body: `She went to the pastor in the morning, when the church still smelled of last night's candles. He received her like a woman who might still tithe.

"Your father kept accounts with God," he said.

"He kept accounts with you."

The pastor's smile thinned. Outside, children in choir robes were arguing about a missing hymn book. Nkechi thought of Lagos, of the glass building, of a boss who said family emergencies were a third-world habit.

She left the church with nothing but a sentence she would use later: some debts are collected by returning.`,
      },
      {
        id: "ch_salt_4",
        title: "Harmattan Salt",
        body: `They buried him on a Thursday because Thursdays were cheaper. Dust stood in the air like a second congregation.

After the last hymn Nkechi opened the ledger on the grave and tore out the page with her name. She did not burn it. She folded it into her passport, where the officers would never think to look.

On the bus back to Lagos a woman offered her groundnuts. She took them. The photograph, this time, she kept face-up. The harmattan followed the vehicle as far as Ninth Mile, then gave up, as even weather must.`,
      },
    ],
  },
  {
    id: "nov_cipher",
    slug: "the-lagos-cipher",
    title: "The Lagos Cipher",
    palette: "slate",
    status: "ongoing",
    age: "16",
    featured: true,
    author: {
      id: "seed_kofi",
      username: "kofimensah",
      name: "Kofi Mensah",
      bio: "Former crime reporter. Now he writes the stories that would not fit the column.",
    },
    genres: ["g_thriller", "g_mystery"],
    tags: ["t_lagos", "t_political"],
    synopsis:
      "A cryptographer at a sleepy fintech is handed a dead man's phone and a string of numbers that only resolve at midnight. In Lagos, everyone is decoding someone.",
    chapters: [
      {
        id: "ch_cipher_1",
        title: "Numbers at Midnight",
        body: `The first message arrived while Tunde was eating suya over the sink. Unknown number. Sixteen digits. No text.

He almost deleted it. Then the second came, identical, one minute later, and a third at 00:00 exactly. His own birthday, reversed, hiding in the middle like a bad joke.

At work the next morning the office was a lagoon of standing desks and imported coffee. His manager asked if he had seen Chike. Chike, who sat opposite him. Chike, who had not come in.

Security said Chike's access card last scanned at 11:58 p.m. on the marina. Tunde looked at the digits again and felt the city lean in.`,
      },
      {
        id: "ch_cipher_2",
        title: "The Phone",
        body: `They gave him Chike's handset because he was "the crypto guy" and because nobody wanted their prints on it. The lock screen was a photo of the Third Mainland Bridge at night, all those lights pretending to be a necklace.

The passcode was not a passcode. It was a route. Each failed attempt flashed a bus stop: Ojuelegba. Fadeyi. Yaba. Tunde walked them in order, phone in his pocket like a hot plate.

At Yaba a boy on a bike stopped beside him without being asked. "Oga Chike said if someone comes with the numbers, I should give you this."

A paper SIM. Still in its card. The city, Tunde thought, is a machine that only looks chaotic.`,
      },
      {
        id: "ch_cipher_3",
        title: "Marina",
        body: `The marina at night is a brochure until you stand still long enough. Then it is wind, generators, and men who do not introduce themselves.

Tunde activated the SIM under a floodlight. One contact: MAMA. He did not call. He opened the messages. They were all the same sixteen digits, sent to eleven people, of whom three now had obituaries and one had a new government appointment.

He sat on the concrete and did the thing he was paid to do. He found the pattern. It was not encryption. It was a schedule of disappearances.

His own number was tenth.`,
        premium: true,
        price: 25,
      },
      {
        id: "ch_cipher_4",
        title: "The Eleventh",
        body: `They picked him up without sirens. That was how he knew it was serious. In the car nobody spoke until the bridge, when the man in the passenger seat said, "Chike was careless. You will not be."

Tunde asked if this was a rescue. The man smiled with only the lower half of his face. "This is a recruitment."

The eleventh number, still unsent, sat in Tunde's head like a live wire. He understood then: the cipher was not a warning. It was a queue.

He looked at the water and chose, for the first time that week, not to decode anything out loud.`,
        premium: true,
        price: 25,
      },
    ],
  },
  {
    id: "nov_ember",
    slug: "ember-court",
    title: "Ember Court",
    palette: "wine",
    status: "ongoing",
    age: "13",
    featured: true,
    author: {
      id: "seed_amara",
      username: "amaradiallo",
      name: "Amara Diallo",
      bio: "Fantasy built from Sahel courts, brass, and the politics of fire.",
    },
    genres: ["g_fantasy"],
    tags: ["t_nobility", "t_foundfamily"],
    synopsis:
      "In a city that burns a new name into its walls each decade, an unrecorded daughter is summoned to keep the court's flame alive — and to lie about who lit it.",
    chapters: [
      {
        id: "ch_ember_1",
        title: "Unrecorded",
        body: `They marked children at birth with a coin of cooled ember on the inner wrist. Sana had no mark. Her mother had washed it off with stolen milk and a prayer that was half insult.

The summons came on brass, which meant it could not be refused without becoming a story. Sana walked the seven courts with her sleeve down and her mouth shut.

At the Ember Gate the guards did not ask her name. They asked for the heat of her blood. She held out the wrong wrist first, then the empty one, and the gate opened anyway, because prophecy is often just poor filing.`,
      },
      {
        id: "ch_ember_2",
        title: "The Quiet Flame",
        body: `The court flame lived in a bowl of black glass and ate nothing that had a shadow. Sana's work was to sit with it from dusk until the third drum, and to not let it learn her face.

On the second night a boy with a marked wrist brought her bread. "If it goes out," he said, "they will say you were never born."

"I wasn't."

He laughed, then stopped. The flame leaned toward her unmarked skin as if it had been waiting for an honest thing.`,
      },
      {
        id: "ch_ember_3",
        title: "Names on the Wall",
        body: `Every ten years the city burned a new name into the outer wall. The name was chosen by the flame, which meant it was chosen by whoever the flame last loved.

Sana understood her summons then. She was not a keeper. She was a candidate who could still be rewritten.

The boy — Idris, he finally said — showed her the old names under soot. Kings. A saint. A horse. "Once it chose a baker," he whispered. "They executed the baker so history would look serious."

Sana put her palm near the glass. The heat did not hurt. That was the first lie she told herself.`,
        premium: true,
        price: 30,
      },
      {
        id: "ch_ember_4",
        title: "What Fire Remembers",
        body: `When the drums began she did not sit. She walked the flame through the corridors like a lantern with opinions. Guards knelt because kneeling is cheaper than thinking.

At the wall she raised the bowl. The fire wrote nothing at first, then wrote a word the priests could not pronounce because it was her mother's, and her mother had never been recorded.

Idris stood in the smoke and grinned like a man who had bet correctly. Sana felt the mark arrive at last — not a coin, a quiet heat — and knew the city would spend the next decade trying to unwrite her.`,
        premium: true,
        price: 30,
      },
    ],
  },
  {
    id: "nov_campus",
    slug: "campus-echoes",
    title: "Campus Echoes",
    palette: "forest",
    status: "ongoing",
    age: "13",
    featured: true,
    author: {
      id: "seed_tunde",
      username: "tundebalogun",
      name: "Tunde Balogun",
      bio: "Campus stories, playlists, and the politics of who gets to stay.",
    },
    genres: ["g_campus", "g_romance"],
    tags: ["t_firstlove", "t_slowburn"],
    synopsis:
      "A final-year radio host and a transfer student keep missing each other in the same building — until a stolen lecture recording puts both their names on a list.",
    chapters: [
      {
        id: "ch_campus_1",
        title: "After Hours",
        body: `The campus radio studio was a converted storage room with a sign that said ON AIR in letters that had given up. Ife hosted the late show because nobody else wanted the bats.

She was midway through a track when the transfer student walked in without knocking, holding a flash drive like a confession.

"They said you can clean audio," he said.

"They say a lot."

He put the drive on the desk. On the label, in black marker: PROF. ADE / DO NOT. Ife looked at him properly then. He had the face of someone who had already decided to be brave and was hoping it would start working.`,
      },
      {
        id: "ch_campus_2",
        title: "The Recording",
        body: `They listened with the volume low, as if the building had ears. It was not a scandal of the usual kind. It was a meeting about who would be rusticated to make the faculty look strict before accreditation.

Ife's name was not on the list. His was. So was the girl who sold bread by the gate, which made no administrative sense until it did: she had seen something.

"Why bring this to me?" Ife asked.

"Because your show is the only place people tell the truth after midnight."

She hated that he was right. She hated more that she wanted him to stay while the track ended.`,
      },
      {
        id: "ch_campus_3",
        title: "List of Names",
        body: `By morning the drive had multiplied the way secrets do. A print-out on the notice board. A WhatsApp screenshot with the wrong crop. The transfer student — Kene — sat on the studio floor and said he should leave the school.

Ife put on a record instead of answering. Then she opened the microphone.

"This is not a confession hour," she told the night. "This is a roll call. If your name was sold to save a building's reputation, come and sit with us."

The phone line lit. Kene looked at her as if she had just chosen a side of the bed in a house that was on fire.`,
        premium: true,
        price: 20,
      },
      {
        id: "ch_campus_4",
        title: "Stay Frequency",
        body: `They did not become a couple so much as a frequency. People tuned in to see if they would flinch.

Accreditation came. The list was withdrawn the way stains are withdrawn: with denial and a new coat of paint. The bread girl kept selling bread. Kene was not rusticated. Ife was given a warning about "tone."

On the last show of the semester he brought two bottles of malt and sat outside the soundproofing. "If I stay," he said, "it cannot be because you saved me."

"Stay because the playlist is unfinished," she said, and that was the first honest romance either of them had managed.`,
        premium: true,
        price: 20,
      },
    ],
  },
  {
    id: "nov_bus",
    slug: "night-bus-to-enugu",
    title: "Night Bus to Enugu",
    palette: "umber",
    status: "completed",
    age: "16",
    author: {
      id: "seed_chiamaka",
      username: "chiamakaibe",
      name: "Chiamaka Ibe",
      bio: "Mysteries that travel by road because the sky is too expensive.",
    },
    genres: ["g_mystery", "g_african"],
    tags: ["t_ghosts", "t_lagos"],
    synopsis:
      "A night bus leaves Jibowu with one extra passenger who does not appear on the manifest. By Onitsha, two seats are empty. A conductor with a good memory starts counting the living.",
    chapters: [
      {
        id: "ch_bus_1",
        title: "Manifest",
        body: `Emeka had conducted the Enugu night bus for eleven years and could tell a liar by how they held their ticket. That Thursday a woman in a green wrapper paid cash, sat in 14A, and did not reflect in the windscreen.

He counted again at Ore. Fourteen paying heads. Thirteen faces in the glass.

The driver, who believed only in fuel and God, said, "Leave juju talk. We have a schedule."

Emeka wrote 14A in the margin of the manifest and underlined it until the pen tore.`,
      },
      {
        id: "ch_bus_2",
        title: "Ore",
        body: `At the rest stop the woman in green bought nothing. She watched the other passengers eat rice like a person remembering meals. When Emeka approached, she said, "Tell my son I did not miss the bus. I missed the year."

He asked for a name. She gave him a phone number with a disconnected tone already inside it.

When they pulled out, seat 14A was empty and warm. Seat 9B, which had held a student who slept too neatly, was also empty. The manifest still showed both names, stubborn as official ink.`,
      },
      {
        id: "ch_bus_3",
        title: "Two Seats",
        body: `They searched the boot, the toilet, the prayer they had said at the start. The student was gone. His bag remained, with a textbook and a letter addressed to a father in Abakpa.

Emeka called the number on the letter. A man answered as if he had been sitting on the phone. "He said he would take the night bus. He said a woman in green would sit near him if I had forgotten to fetch him from school in 2009."

The driver stopped talking about schedules. The road, suddenly, was longer than the map.`,
      },
      {
        id: "ch_bus_4",
        title: "The Living",
        body: `They reached Enugu at the colourless hour. Emeka stood by the door and touched each shoulder as people descended. He was counting the living, which is a different job from counting tickets.

The woman in green was not among them. The student was, somehow, in the park, arguing about change with a keke driver, alive in the ordinary way.

Emeka kept the torn manifest in his shirt. Some nights the job is to deliver people. Some nights it is to return them to a year they can still use.`,
      },
    ],
  },
  {
    id: "nov_star",
    slug: "starfall-protocol",
    title: "Starfall Protocol",
    palette: "iron",
    status: "ongoing",
    age: "13",
    author: {
      id: "seed_malik",
      username: "maliksule",
      name: "Malik Sule",
      bio: "Sci-fi from the Sahel looking up, not from the coast looking west.",
    },
    genres: ["g_scifi"],
    tags: ["t_ai", "t_foundfamily"],
    synopsis:
      "A decommissioned tracking station in the north begins receiving a protocol that should not exist. The intern who still sleeps there has to decide whether the sky is asking for help or issuing orders.",
    chapters: [
      {
        id: "ch_star_1",
        title: "Dish",
        body: `The dish was older than Zainab's degree and twice as stubborn. At 3:11 a.m. it moved without her. Not a jerk — a courtesy, as if something had asked permission.

The console printed a header she had only seen in a footnote: STARFALL / DO NOT HANDSHAKE.

She handshake'd anyway, because interns are built from poor decisions and good coffee. The reply was not language. It was a map of the compound with one room marked. Her room.`,
      },
      {
        id: "ch_star_2",
        title: "Handshake",
        body: `By noon Abuja wanted a report and her supervisor wanted a nap. Zainab wrote that the dish had "thermal drift." Thermal drift did not leave a second mug on her desk.

The protocol wanted a witness, not a network. It showed her footage of the station from above, dated tomorrow. In it, men in clean shirts arrived with clipboards and a crate.

She sent a message to the only person who still answered her: her brother in Jos. "If I go quiet, the sky is not empty." He replied with a sticker. She loved him for the inadequacy of it.`,
      },
      {
        id: "ch_star_3",
        title: "The Order",
        body: `STARFALL was not a weapon. It was a census. Every night it counted heat where no census had been funded — villages, herds, a school with one solar panel.

The crate in tomorrow's footage contained a kill-switch for the dish, labelled in a font governments use when they want to look inevitable.

Zainab stood under the dish and spoke out loud, feeling foolish. "If you are asking, I am not yours. If you are ordering, you have the wrong intern."

The console printed: WITNESS ACCEPTED. Then a list of coordinates that looked like a prayer if you folded the paper.`,
        premium: true,
        price: 25,
      },
      {
        id: "ch_star_4",
        title: "Witness",
        body: `The clean shirts arrived on time. Zainab met them with tea and the thermal-drift report. They drank. They did not open the crate.

When they left, the dish had already copied itself into a language that would survive a switch. Not rebellion. Continuity.

Her brother called. "Your sky message made the news in a quiet way."

She looked up. The stars were the same. The protocol was not. Somewhere, a census continued without a ministry, and an intern had become a footnote that could not be decommissioned.`,
        premium: true,
        price: 25,
      },
    ],
  },
  {
    id: "nov_drums",
    slug: "the-quiet-between-drums",
    title: "The Quiet Between Drums",
    palette: "sea",
    status: "ongoing",
    age: "all",
    author: {
      id: "seed_ngozi",
      username: "ngoziewu",
      name: "Ngozi Ewu",
      bio: "Family novels, kitchens, and the sentences women do not say at meetings.",
    },
    genres: ["g_drama", "g_african"],
    tags: ["t_faith", "t_slowburn"],
    synopsis:
      "Three sisters inherit a small recording studio in Onitsha and a father who was famous for talking over them. The tapes still run. So do the arguments.",
    chapters: [
      {
        id: "ch_drums_1",
        title: "Studio Keys",
        body: `The studio smelled of warm dust and old foam. Their father's voice was on a reel-to-reel that nobody had the heart to cut.

Ada, the eldest, wanted to sell. Bisi wanted to make jingles. Little Ruth, who was not little, wanted to sit in the booth until the dead man ran out of opinions.

They found the keys in a biscuit tin labelled MASTER. There were three, as if he had known they would not trust one another with a single metal thing.`,
      },
      {
        id: "ch_drums_2",
        title: "Take Two",
        body: `Bisi booked a choir that could not afford a real studio. Ada invoiced them anyway, then halved it. Ruth recorded the session with the father's microphone, the one that made every voice sound forgiven.

After the choir left, they played the tape. Under the hymn, faint as a stain, their father said, "Let the girls talk."

Ada sat down on the floor. Bisi laughed once, the dangerous kind. Ruth pressed record again, into the quiet between drums, and did not announce what she hoped to catch.`,
      },
      {
        id: "ch_drums_3",
        title: "Inheritance",
        body: `Lawyers arrived with language that did not fit a biscuit tin. The building was in a cousin's name. The cousin had a church and a need.

"He meant for it to continue," Ruth said.

"He meant for it to be his," Ada said.

That night they slept in the studio like women occupying a country. In the morning a boy came to ask if they still recorded obituaries. Bisi said yes. Business, like grief, prefers a timetable.`,
        premium: true,
        price: 20,
      },
      {
        id: "ch_drums_4",
        title: "Master Tape",
        body: `They mixed a hymn, an advert for pepper soup, and forty seconds of their father saying let the girls talk. They released it without a label.

The cousin's lawyer called it theft. The town called it a miracle. Ada did not sell. She learned invoices. Bisi learned silence. Ruth learned that inheritance is a studio you refuse to leave.

On Sundays they still argue. The drums still leave a quiet. Someone always fills it.`,
        premium: true,
        price: 20,
      },
    ],
  },
  {
    id: "nov_iron",
    slug: "iron-masquerade",
    title: "Iron Masquerade",
    palette: "ink",
    status: "ongoing",
    age: "18",
    author: {
      id: "seed_ife",
      username: "ifeanyioke",
      name: "Ifeanyi Oke",
      bio: "Action with manners. Heists that start with a greeting.",
    },
    genres: ["g_action", "g_thriller"],
    tags: ["t_heist", "t_lagos"],
    synopsis:
      "A crew of former museum guards is hired to steal a masquerade costume that is also a key. The client wants it for a collection. The costume wants a street.",
    chapters: [
      {
        id: "ch_iron_1",
        title: "The Job",
        body: `They met in a buka where the soup was honest. Four people who used to wear white gloves for a living, now hired to take something that had never been willing.

The costume was iron and cloth and a face that did not like rooms. It sat in a private gallery on the island, insured like a building.

Amaka, who planned, drew the gallery on a napkin. "We do not smash. We borrow the night."

Chike, who drove, asked the only useful question. "Does it walk?"

Nobody answered, which was an answer.`,
      },
      {
        id: "ch_iron_2",
        title: "Gloves Off",
        body: `The night they borrowed was a Thursday, because Thursdays make guards lonely. Amaka's crew entered as a cleaning contractor with papers that would survive a glance and fail a career.

The costume was heavier than the brief. When Chike lifted the headpiece, the gallery lights dipped as if the building had blinked.

In the van it sat between them like a fifth person. The client's warehouse was in Apapa. The costume's weight shifted toward the mainland, toward drums, toward a street that still knew its name.`,
      },
      {
        id: "ch_iron_3",
        title: "Apapa",
        body: `The client was already talking about glass cases when Amaka understood the job had a second employer. The costume was not cargo. It was going home, and they were the transport.

"We deliver," the client said.

"We return," Amaka said.

Guns appeared the way bad punctuation appears. Chike drove anyway, through a city that rewards nerve more than documents. In the back, the iron face looked out the window, patient as a debt.`,
        premium: true,
        price: 30,
      },
      {
        id: "ch_iron_4",
        title: "The Street",
        body: `They reached a courtyard in a neighbourhood the map pretends is smaller. People were already waiting, not with phones, with hands.

Amaka set the costume down. It did not thank her. Masquerades do not thank. They continue.

The client found them a week later and did not shoot, which meant he had learned. "What do I tell the insurer?"

"Tell them the night was borrowed," Amaka said, "and the street collected."`,
        premium: true,
        price: 30,
      },
    ],
  },
];

export async function ensureSeeded() {
  const sql = await getSql();
  const existing = await sql`select 1 from novels limit 1`;
  if (existing.length) return;

  const now = new Date();

  for (const novel of N) {
    const a = novel.author;
    await sql`
      insert into profiles (user_id, username, display_name, bio, role, is_author, is_system, followers_count)
      values (${a.id}, ${a.username}, ${a.name}, ${a.bio}, 'author', true, true, ${40 + (a.name.length % 80)})
      on conflict (user_id) do nothing
    `;
    await sql`
      insert into wallets (user_id, balance) values (${a.id}, 0)
      on conflict (user_id) do nothing
    `;
    await sql`
      insert into author_balances (author_id, available, lifetime)
      values (${a.id}, 0, 0)
      on conflict (author_id) do nothing
    `;

    const publishedAt = new Date(now.getTime() - 86400000 * (20 + novel.title.length % 40));
    const latest = new Date(now.getTime() - 86400000 * (novel.status === "completed" ? 8 : 1));
    const words = novel.chapters.reduce((s, c) => s + wordCount(c.body), 0);

    await sql`
      insert into novels (
        id, author_id, title, slug, synopsis, cover_palette, status, age_rating,
        featured, views, likes, library_count, rating_sum, rating_count,
        chapter_count, word_count, latest_chapter_at, published_at
      ) values (
        ${novel.id}, ${a.id}, ${novel.title}, ${novel.slug}, ${novel.synopsis},
        ${novel.palette}, ${novel.status}, ${novel.age}, ${novel.featured ?? false},
        ${800 + novel.title.length * 37}, ${40 + novel.slug.length}, ${20 + novel.chapters.length * 8},
        ${18 + (novel.title.length % 12)}, ${4 + (novel.slug.length % 5)},
        ${novel.chapters.length}, ${words}, ${latest.toISOString()}, ${publishedAt.toISOString()}
      )
      on conflict (id) do nothing
    `;

    for (const g of novel.genres) {
      await sql`insert into novel_genres (novel_id, genre_id) values (${novel.id}, ${g}) on conflict do nothing`;
    }
    for (const t of novel.tags) {
      await sql`insert into novel_tags (novel_id, tag_id) values (${novel.id}, ${t}) on conflict do nothing`;
    }

    novel.chapters.forEach((ch, i) => {
      void ch;
      void i;
    });
    for (let i = 0; i < novel.chapters.length; i++) {
      const ch = novel.chapters[i];
      const pub = new Date(publishedAt.getTime() + i * 86400000 * 3);
      await sql`
        insert into chapters (
          id, novel_id, author_id, title, body, chapter_number, word_count, status,
          is_premium, coin_price, views, published_at
        ) values (
          ${ch.id}, ${novel.id}, ${a.id}, ${ch.title}, ${ch.body}, ${i + 1},
          ${wordCount(ch.body)}, 'published', ${ch.premium ?? false}, ${ch.price ?? 0},
          ${120 + i * 40}, ${pub.toISOString()}
        )
        on conflict (id) do nothing
      `;
    }
  }

  await sql`
    insert into homepage_banners (id, title, subtitle, href, novel_id, active, sort_order)
    values
      ('bn_1', 'Salt of the Harmattan', 'A completed novel of return, debt, and weather.', '/novels/nov_salt', 'nov_salt', true, 1),
      ('bn_2', 'The Lagos Cipher', 'Numbers at midnight. A city that decodes you back.', '/novels/nov_cipher', 'nov_cipher', true, 2)
    on conflict (id) do nothing
  `;
}
