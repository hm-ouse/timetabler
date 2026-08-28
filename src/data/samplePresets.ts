import { FestivalData, SheetTabInfo } from '../types';

export interface SampleRatingSheet {
  id: string;
  title: string;
  scaleType: string;
  description: string;
  csvContent: string;
  tabs?: Array<{ id: string; name: string; csvContent: string; description?: string }>;
}

export const SAMPLE_RATING_SHEETS: SampleRatingSheet[] = [
  {
    id: 'festival-crew-multi-tab',
    title: 'Festival Squad Multi-Person Workbook (4 Tabs)',
    scaleType: 'Multi-Tab / Multi-Person',
    description: 'Real-world crew workbook with individual member rating tabs and an overall group aggregate page.',
    csvContent: `Artist,Rating,Review Summary,Genre
LCD Soundsystem,9.7,Squad Consensus #1: Best live festival party on earth,Dance-Punk
Charli xcx,9.6,Squad Consensus #2: Unmissable brat rave energy,Hyperpop
Fontaines D.C.,9.3,Squad Consensus #3: Huge guitars and poetry,Post-Punk
Justice,9.4,Squad Consensus #4: Colossal electro monolith,Electro
Michael Kiwanuka,9.1,Squad Consensus #5: Transcendent soulful evening,Soul
Dua Lipa,9.0,Squad Consensus #6: Flawless modern pop staging,Pop
Fred again..,9.2,Squad Consensus #7: Massive emotional singalongs,Electronic
The Smile,8.9,High artistic consensus: Yorke & Greenwood genius,Art Rock
Slowdive,8.7,Epic twilight wall of sound,Shoegaze
Idles,8.6,Visceral punk energy,Punk
Sampha,8.8,Intimate soul and piano wizardry,R&B
Little Simz,9.2,Effortless flow and charisma,Hip Hop
Barry Can't Swim,8.5,Warm uplifting house grooves,House
Khruangbin,8.4,Hypnotic sunset psych,Psychedelic
Overmono,8.6,Peak nighttime club euphoria,Bass Music
Coldplay,8.2,Big stadium spectacle,Pop Rock
Declan McKenna,6.5,Mid-afternoon casual listen,Indie Pop
Blossoms,5.9,Generic radio pop,Indie Pop`,
    tabs: [
      {
        id: 'tab-aggregate',
        name: '📊 Group Aggregate (Average)',
        description: 'Combined average scores across all squad members',
        csvContent: `Artist,Rating,Review Summary,Genre
LCD Soundsystem,9.7,Squad Consensus #1: Best live festival party on earth,Dance-Punk
Charli xcx,9.6,Squad Consensus #2: Unmissable brat rave energy,Hyperpop
Fontaines D.C.,9.3,Squad Consensus #3: Huge guitars and poetry,Post-Punk
Justice,9.4,Squad Consensus #4: Colossal electro monolith,Electro
Michael Kiwanuka,9.1,Squad Consensus #5: Transcendent soulful evening,Soul
Dua Lipa,9.0,Squad Consensus #6: Flawless modern pop staging,Pop
Fred again..,9.2,Squad Consensus #7: Massive emotional singalongs,Electronic
The Smile,8.9,High artistic consensus: Yorke & Greenwood genius,Art Rock
Slowdive,8.7,Epic twilight wall of sound,Shoegaze
Idles,8.6,Visceral punk energy,Punk
Sampha,8.8,Intimate soul and piano wizardry,R&B
Little Simz,9.2,Effortless flow and charisma,Hip Hop
Barry Can't Swim,8.5,Warm uplifting house grooves,House
Khruangbin,8.4,Hypnotic sunset psych,Psychedelic
Overmono,8.6,Peak nighttime club euphoria,Bass Music
Coldplay,8.2,Big stadium spectacle,Pop Rock
Declan McKenna,6.5,Mid-afternoon casual listen,Indie Pop
Blossoms,5.9,Generic radio pop,Indie Pop`,
      },
      {
        id: 'tab-alex',
        name: '🎸 Alex (Post-Punk & Rock)',
        description: "Alex's personal ratings focusing on heavy guitars, post-punk, and live acts",
        csvContent: `Artist,Rating,Review Summary,Genre
Fontaines D.C.,10.0,My absolute #1 priority of the weekend. Romance is album of the decade.,Post-Punk
Idles,9.8,Need to be in the center of the mosh pit. Brutal and joyful.,Punk Rock
LCD Soundsystem,9.9,Never miss LCD. Best drums in modern music.,Dance-Punk
The Smile,9.5,Thom Yorke and Jonny Greenwood are virtuosos.,Art Rock
Slowdive,9.3,Immense volume and beautiful shoegaze guitars.,Shoegaze
Squid,9.0,Complex krautrock dynamics.,Post-Punk
Fat Dog,8.8,Total chaotic dance-punk delirium.,Dance Punk
Amyl and the Sniffers,9.4,Amy Taylor is an Australian rock hurricane.,Pub Rock
Yard Act,8.5,Great lyrics and infectious basslines.,Post-Punk
Geese,8.7,Incredible erratic falsetto vocals.,Art Punk
English Teacher,8.9,Yorkshire indie poetry perfection.,Indie Rock
Michael Kiwanuka,8.5,Beautiful voice and arrangements.,Soul
PJ Harvey,9.2,Iconic stage presence.,Art Rock
The National,8.9,Cathartic emotional anthems.,Indie Rock
Charli xcx,7.5,Fun pop party but prefer guitars.,Pop
Dua Lipa,6.8,Good pop, but will probably clash with Idles.,Pop
Coldplay,6.0,A bit too commercial for my taste.,Pop Rock
Peggy Gou,4.5,Not my scene at all.,House`,
      },
      {
        id: 'tab-sam',
        name: '🎧 Sam (Electronic & Late-Night)',
        description: "Sam's personal ratings focusing on electronic, techno, house, and DJ sets",
        csvContent: `Artist,Rating,Review Summary,Genre
Justice,10.0,The ultimate electronic live spectacle. Earth-shattering bass and lights.,Electro
Fred again..,9.9,Deeply emotional live show. Unmatched rave euphoria.,Electronic
Charli xcx,9.8,Club classics all night. Unstoppable energy.,Hyperpop
Bicep,9.6,Visuals and chroma laser breaks are mind-bending.,Live Electronic
Overmono,9.5,Crisp 2-step garage and heavy sub-bass.,Bass Music
Barry Can't Swim,9.3,Sunny organic house vibes.,House
Disclosure,9.1,Classic floor-filling house anthems.,House
LCD Soundsystem,9.7,Peak electronic dance-punk energy.,Dance-Punk
Floating Points,9.2,Modular synth mastery.,Ambient Techno
Nia Archives,9.0,Jungle breakbeats and high energy live vocals.,Jungle
Peggy Gou,8.4,Catchy sunset house dance party.,House
Four Tet,9.6,Genius unreleased edits and dubplates.,Electronic
Little Simz,8.8,Huge percussion and tight rap flow.,Hip Hop
Dua Lipa,8.9,Dance-pop production is pristine.,Pop
Fontaines D.C.,6.5,Decent rock band, but I'll be at West Holts / Levels.,Post-Punk
Coldplay,5.0,Skipping to catch late night DJ sets.,Pop Rock`,
      },
      {
        id: 'tab-taylor',
        name: '✨ Taylor (Pop & Singalongs)',
        description: "Taylor's personal ratings focusing on pop, R&B, big vocalists, and anthems",
        csvContent: `Artist,Rating,Review Summary,Genre
Dua Lipa,10.0,Headline queen! Non-stop pop choreography and mega hits.,Pop
Coldplay,9.8,Confetti, fireworks, LED wristbands. Magical singalong spectacle.,Pop Rock
Charli xcx,9.7,Party girl anthem of the summer.,Hyperpop
SZA,9.6,Vulnerable, raw vocals and gorgeous stage set.,R&B
Little Simz,9.5,Incredible stage command and musicianship.,Hip Hop
Michael Kiwanuka,9.4,Soul-stirring vocals that make you cry.,Soul
The Last Dinner Party,9.2,Theatrical baroque indie harmonies.,Baroque Pop
LCD Soundsystem,9.0,Dance party with all our friends.,Dance-Punk
Barry Can't Swim,8.8,Feel-good sunny melodic music.,House
Bombay Bicycle Club,8.7,Nostalgic joyous indie pop hooks.,Indie Pop
Sampha,9.1,Pure vocal magic on piano.,R&B
Arlo Parks,8.5,Sweet poetic bedroom pop.,Indie Pop
Fred again..,8.9,Emotional festival memory maker.,Electronic
Olivia Rodrigo,9.0,Pop-punk powerhouse vocals.,Pop Rock
CMAT,8.8,Witty country pop theatre.,Country Pop
Idles,4.0,Way too aggressive and noisy for me.,Punk
Squid,4.5,Too dissonant and chaotic.,Experimental Rock`,
      },
    ],
  },
  {
    id: 'indie-rock-10',
    title: 'Indie & Alternative (/10 Scale)',
    scaleType: 'Scale 1-10',
    description: 'Bands rated out of 10 with detailed album notes and live performance verdicts.',
    csvContent: `Artist,Rating,Review Summary,Genre
Dua Lipa,9.5,Absolute masterclass in modern pop live performance with incredible band and staging.,Pop
Coldplay,9.0,Unrivalled spectacle and stadium energy. Crowd euphoric singalongs.,Rock / Pop
LCD Soundsystem,9.8,Best live dance-punk band on earth. Tight grooves and emotional peak moments.,Electronic / Dance-Punk
Fontaines D.C.,9.2,Raw post-punk fury with poetic lyricism. Unmissable live presence.,Post-Punk
The National,8.8,Heart-wrenching melancholia and explosive cathartic climaxes.,Indie Rock
Michael Kiwanuka,9.4,Soulful transcendent voice backed by stunning rich arrangements.,Soul / Folk
The Last Dinner Party,8.5,Theatrical baroque indie with soaring vocals and incredible musicianship.,Indie Rock
Little Simz,9.6,Top-tier lyricist and charismatic performer with huge brass/percussion energy.,Hip Hop
Jungle,8.7,Non-stop disco funk groove party. Impossible to stand still.,Neo-Soul / Funk
PJ Harvey,9.1,Iconic avant-garde art-rock performance with hypnotic sonic intensity.,Art Rock
Idles,8.4,Pure visceral energy, positive mosh pits, and blistering punk riffs.,Punk Rock
Alvvays,8.2,Jangle pop perfection with heavenly melodic hooks.,Dream Pop
Khruangbin,8.6,Hypnotic surf-soul and global psych grooves. Perfect twilight vibe.,Psychedelic Rock
Charli xcx,9.7,Electrifying club-ready pop powerhouse with unhinged rave energy.,Hyperpop
Barry Can't Swim,8.3,Warm infectious organic house grooves that bring pure sunshine vibes.,Electronic
SZA,9.3,Soul-stirring R&B vocals and deeply vulnerable anthems.,R&B
Yard Act,7.8,Sharp-witted dance-punk spoken-word satire with infectious basslines.,Post-Punk
Gossip,7.5,Beth Ditto's powerhouse vocals and fiery soul-punk revivalism.,Indie Pop
Confidence Man,8.9,Ridiculously fun choreographed electro-pop party that never stops.,Dance Pop
Disclosure,8.5,Floor-filling house anthems and seamless live electronic setup.,Electronic / House
Bombay Bicycle Club,7.6,Joyous uplifting indie pop singalongs with bright brass section.,Indie Rock
Peggy Gou,7.2,Slick feel-good house beats and high energy crowd engagement.,House / Techno
Sampha,9.0,Intimate emotional piano layered with intricate rhythmic synth journeys.,Alternative R&B
The Streets,8.1,Mike Skinner's legendary garage storytelling and chaotic festival anthems.,UK Garage
Arlo Parks,8.0,Poetic bedroom-pop intimacy and velvet-smooth vocal delivery.,Indie Pop
Squid,7.4,Complex mathematical krautrock and brass-infused post-punk experimentation.,Krautrock
Slowdive,8.9,Immense walls of ethereal shoegaze distortion and transcendent reverb.,Shoegaze
Kae Tempest,8.6,Goosebump-inducing spoken word over heavy atmospheric electronic beats.,Spoken Word
Declan McKenna,6.8,Glam indie pop with catchy choruses but slightly patchy mid-set pacing.,Indie Pop
Fat Dog,7.9,Chaotic high-octane punk-techno hysteria.,Dance Punk
Blossoms,5.8,Standard catchy radio indie rock. Good background listening.,Indie Pop
CMAT,8.3,Country-pop brilliance infused with camp wit and colossal vocal range.,Country Pop
Amyl and the Sniffers,8.8,Explosive Australian pub-punk hurricane led by unstoppable Amy Taylor.,Pub Rock
Bicep,9.2,Mind-bending euphoric live electronic visual spectacle and breaks.,Live Electronic
Olivia Rodrigo,7.9,High octane pop-punk teenage angst performed with immense vocal power.,Pop Rock
Fred again..,9.5,Deeply emotional communal rave experience connecting real vocal samples.,Electronic
Justice,9.4,Monolithic French electro with earth-shattering lighting rig and heavy bass.,Electro
Lorde,8.7,Sensory theatrical pop with deeply resonant emotional storytelling.,Art Pop
Vampire Weekend,8.8,Joyous Afro-pop polyrhythms and sparkling guitar hooks.,Indie Pop
Black Country New Road,8.4,Chamber rock beauty with emotional saxophone and violin crescendos.,Chamber Rock
The Smile,9.3,Thom Yorke and Jonny Greenwood wizardry with complex polyrhythmic jazz-rock.,Experimental Rock
Geese,8.0,Erratic country-tinged post-punk brilliance with dynamic falsettos.,Art Punk
English Teacher,8.5,Mercury prize-worthy poetic indie rock with sharp socio-political bite.,Indie Rock
Bleachers,6.2,Energetic Springsteen-style anthem pop, slightly formulaic.,Indie Pop
Scouting for Girls,3.2,Overly commercial cheesy mid-2000s pop rock.,Pop Rock
James Blunt,4.1,Competent vocal ballads but rather bland for a major festival slot.,Pop`,
  },
  {
    id: 'electronic-dance-5',
    title: 'Electronic, Pop & Beats (/5 Star Scale)',
    scaleType: 'Scale 1-5',
    description: 'Star ratings out of 5 with stage vibe notes and electronic festival recommendations.',
    csvContent: `Artist,Stars,Review Summary,Genre
Fred again..,5.0,Unbelievable communal euphoria and unmatched emotional live performance.,Electronic
Justice,4.8,Colossal electro rock spectacle. Visual production of the highest order.,Electro
Charli xcx,5.0,Peak pop cultural moment. Incessant high energy sweatfest.,Hyperpop
Bicep,4.8,Stunning audio-visual live show. Euphoric breaks and laser magic.,UK Bass
Peggy Gou,3.5,Accessible breezy house grooves. Fun sunset dance party.,House
Barry Can't Swim,4.5,Warm acoustic textures blended with lively melodic house.,House
Disclosure,4.5,Live drum pads and synth wizardry with classic anthems.,House
Four Tet,4.9,Unpredictable genius set blending ambient textures with heavy bass.,Electronic
Overmono,4.8,Crisp 2-step garage and breakbeat euphoria. Peak nighttime energy.,Electronic
Skrillex,4.4,Master of crowd control with rapid-fire transitions and monstrous drops.,Bass Music
Chase & Status,4.6,Thunderous drum and bass anthems that will shake the field.,Drum & Bass
Jungle,4.5,Immaculate live band soul-funk disco with glorious vocal harmonies.,Funk
Confidence Man,4.7,Total festival joy with synchronised dances and costume changes.,Dance Pop
Floating Points,4.6,Complex modular synth explorations building into hypnotic dance grooves.,Ambient Techno
Dua Lipa,4.8,Dazzling choreography and flawless vocal performance throughout.,Pop
Sampha,4.7,Soul-stirring piano and rich electronic percussive layers.,R&B
Little Simz,4.9,Effortless flow and commanding stage charisma.,Hip Hop
LCD Soundsystem,5.0,The ultimate festival headliner. Wall of percussion and dance-punk brilliance.,Dance Punk
Fontaines D.C.,4.6,Tense brooding energy bursting into explosive anthems.,Post-Punk
The Streets,4.0,Nostalgic British garage bangers with rowdy crowd interaction.,Garage
Kaytranada,4.3,Bouncy signature basslines and infectious soulful grooves.,Dance
Nia Archives,4.5,High energy junglist breakbeats with live singing and sunny vibes.,Jungle
Salute,4.4,Speed garage and French touch euphoric house rhythms.,Garage
Mall Grab,4.1,Raw industrial rave energy mixed with melodic vocal hooks.,Techno
Calvin Harris,3.0,Massive hits played predictably without much live spontaneity.,EDM
The Chainsmokers,2.0,Formulaic drop-heavy commercial set with grating vocal tracks.,EDM`,
  },
  {
    id: 'alternative-metal-4',
    title: 'Alt, Metal & Punk (/4 Point Tier)',
    scaleType: 'Scale 1-4',
    description: 'Four-point scale (4=Must See, 3=Great, 2=Average, 1=Skip) commonly used on festival boards.',
    csvContent: `Band,Rating,Verdict,Genre
Idles,4,Absolute must-see mosh pit brotherhood with relentless punk drive.,Punk
Fontaines D.C.,4,Phenomenal songwriting and magnetic frontman stage presence.,Post-Punk
Amyl and the Sniffers,4,Wild untamed pub-rock tornado with furious guitar riffs.,Pub Punk
The Smile,4,Exquisite technical musicianship and dark experimental art-rock.,Art Rock
Slowdive,4,Oceanic wall of shoegaze soundscapes and dreamlike frequencies.,Shoegaze
Yard Act,3,Witty social commentary backed by infectious groove-heavy rhythms.,Post-Punk
PJ Harvey,4,Spellbinding theatrical avant-rock masterwork.,Alternative
LCD Soundsystem,4,Unmatched live percussion and dance-rock transcendence.,Dance-Punk
Michael Kiwanuka,4,Warm vintage soul grooves that elevate the entire crowd.,Soul
The Last Dinner Party,3,Glamorous baroque rock with dramatic vocal harmonies.,Indie
Squid,3,Adventurous mathematical post-punk with brass dynamics.,Art Rock
Fat Dog,3,Unruly blend of techno bass and abrasive punk vocals.,Electro Punk
Black Country New Road,3,Emotionally devastating orchestral chamber-rock beauty.,Chamber Rock
English Teacher,3,Smart inventive guitar music with poetic Yorkshire flair.,Indie Rock
Geese,3,Spastic angular guitar workouts and eccentric vocal delivery.,Art Punk
Declan McKenna,2,Decent catchy melodies but lacks punch for a late festival slot.,Indie Pop
Blossoms,2,Inoffensive radio pop indie. Pleasant but unmemorable.,Indie
The 1975,2,Polished 80s synth-pop with somewhat self-indulgent stage antics.,Pop Rock
Scouting for Girls,1,Corny nostalgic pop rock without any edge.,Pop Rock
Example,1,Dated commercial dance rap that has not aged well.,Dance Rap`,
  },
];

export const SAMPLE_FESTIVALS: FestivalData[] = [
  {
    name: 'Glastonbury Festival 2026',
    location: 'Worthy Farm, Pilton, UK',
    year: '2026',
    sourceType: 'preset',
    days: [
      { id: 'friday', name: 'Friday 26 June', date: '2026-06-26' },
      { id: 'saturday', name: 'Saturday 27 June', date: '2026-06-27' },
      { id: 'sunday', name: 'Sunday 28 June', date: '2026-06-28' },
    ],
    stages: [
      'Pyramid Stage',
      'Other Stage',
      'West Holts',
      'Woodsies',
      'The Park Stage',
      'Acoustic Stage',
      'Levels (Silver Hayes)',
    ],
    sets: [
      // Friday - Pyramid Stage
      { id: 'g-f-pyr-1', artist: 'Dua Lipa', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '22:00', endTime: '23:45', description: 'Headline pop performance' },
      { id: 'g-f-pyr-2', artist: 'LCD Soundsystem', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '19:45', endTime: '21:00', description: 'Dance-punk sub-headline' },
      { id: 'g-f-pyr-3', artist: 'PJ Harvey', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '18:00', endTime: '19:00', description: 'Art rock masterclass' },
      { id: 'g-f-pyr-4', artist: 'Michael Kiwanuka', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '16:15', endTime: '17:15', description: 'Soul & folk transcendence' },
      { id: 'g-f-pyr-5', artist: 'The Last Dinner Party', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '14:30', endTime: '15:30', description: 'Baroque indie rock' },
      { id: 'g-f-pyr-6', artist: 'English Teacher', stage: 'Pyramid Stage', dayId: 'friday', dayName: 'Friday', startTime: '13:00', endTime: '13:45', description: 'Opening slot' },

      // Friday - Other Stage
      { id: 'g-f-oth-1', artist: 'Idles', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '22:30', endTime: '23:45', description: 'Furious punk headline' },
      { id: 'g-f-oth-2', artist: 'Fontaines D.C.', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '20:30', endTime: '21:30', description: 'Irish post-punk anthems' },
      { id: 'g-f-oth-3', artist: 'Jungle', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '18:45', endTime: '19:45', description: 'Sunset neo-soul dance' },
      { id: 'g-f-oth-4', artist: 'Yard Act', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '17:00', endTime: '18:00', description: 'Dance punk satire' },
      { id: 'g-f-oth-5', artist: 'Confidence Man', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '15:15', endTime: '16:15', description: 'Electro pop party' },
      { id: 'g-f-oth-6', artist: 'Blossoms', stage: 'Other Stage', dayId: 'friday', dayName: 'Friday', startTime: '13:30', endTime: '14:30', description: 'Indie rock' },

      // Friday - West Holts
      { id: 'g-f-wes-1', artist: 'Sampha', stage: 'West Holts', dayId: 'friday', dayName: 'Friday', startTime: '22:15', endTime: '23:45', description: 'Soul & electronic headline' },
      { id: 'g-f-wes-2', artist: 'Khruangbin', stage: 'West Holts', dayId: 'friday', dayName: 'Friday', startTime: '20:15', endTime: '21:15', description: 'Psych soul sunset' },
      { id: 'g-f-wes-3', artist: 'Barry Can\'t Swim', stage: 'West Holts', dayId: 'friday', dayName: 'Friday', startTime: '18:30', endTime: '19:30', description: 'Melodic organic house' },
      { id: 'g-f-wes-4', artist: 'Nia Archives', stage: 'West Holts', dayId: 'friday', dayName: 'Friday', startTime: '16:45', endTime: '17:45', description: 'Jungle vocal set' },
      { id: 'g-f-wes-5', artist: 'CMAT', stage: 'West Holts', dayId: 'friday', dayName: 'Friday', startTime: '15:00', endTime: '16:00', description: 'Country pop brilliance' },

      // Friday - Woodsies
      { id: 'g-f-woo-1', artist: 'Charli xcx', stage: 'Woodsies', dayId: 'friday', dayName: 'Friday', startTime: '22:30', endTime: '23:45', description: 'Brat hyperpop party' },
      { id: 'g-f-woo-2', artist: 'Slowdive', stage: 'Woodsies', dayId: 'friday', dayName: 'Friday', startTime: '20:30', endTime: '21:30', description: 'Shoegaze walls of sound' },
      { id: 'g-f-woo-3', artist: 'Alvvays', stage: 'Woodsies', dayId: 'friday', dayName: 'Friday', startTime: '18:45', endTime: '19:45', description: 'Jangle dream pop' },
      { id: 'g-f-woo-4', artist: 'Fat Dog', stage: 'Woodsies', dayId: 'friday', dayName: 'Friday', startTime: '17:00', endTime: '18:00', description: 'Punk techno mania' },
      { id: 'g-f-woo-5', artist: 'Geese', stage: 'Woodsies', dayId: 'friday', dayName: 'Friday', startTime: '15:15', endTime: '16:15', description: 'Art punk falsettos' },

      // Friday - The Park Stage
      { id: 'g-f-prk-1', artist: 'The Smile', stage: 'The Park Stage', dayId: 'friday', dayName: 'Friday', startTime: '23:00', endTime: '00:15', description: 'Thom Yorke experimental rock' },
      { id: 'g-f-prk-2', artist: 'Black Country New Road', stage: 'The Park Stage', dayId: 'friday', dayName: 'Friday', startTime: '21:15', endTime: '22:15', description: 'Chamber rock' },
      { id: 'g-f-prk-3', artist: 'Squid', stage: 'The Park Stage', dayId: 'friday', dayName: 'Friday', startTime: '19:30', endTime: '20:30', description: 'Mathematical post punk' },
      { id: 'g-f-prk-4', artist: 'Arlo Parks', stage: 'The Park Stage', dayId: 'friday', dayName: 'Friday', startTime: '17:45', endTime: '18:45', description: 'Poetic indie soul' },

      // Saturday - Pyramid Stage
      { id: 'g-s-pyr-1', artist: 'Coldplay', stage: 'Pyramid Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '21:45', endTime: '23:45', description: 'Stadium pop rock spectacle' },
      { id: 'g-s-pyr-2', artist: 'Little Simz', stage: 'Pyramid Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '19:30', endTime: '20:45', description: 'Hip hop triumph' },
      { id: 'g-s-pyr-3', artist: 'Michael Kiwanuka', stage: 'Pyramid Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '17:30', endTime: '18:30', description: 'Soul & arrangements' },
      { id: 'g-s-pyr-4', artist: 'Bombay Bicycle Club', stage: 'Pyramid Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '15:45', endTime: '16:45', description: 'Uplifting indie pop' },
      { id: 'g-s-pyr-5', artist: 'Declan McKenna', stage: 'Pyramid Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '14:00', endTime: '15:00', description: 'Glam indie pop' },

      // Saturday - Other Stage
      { id: 'g-s-oth-1', artist: 'Disclosure', stage: 'Other Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '22:30', endTime: '23:45', description: 'Live electronic headline' },
      { id: 'g-s-oth-2', artist: 'The Streets', stage: 'Other Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '20:30', endTime: '21:30', description: 'UK garage anthems' },
      { id: 'g-s-oth-3', artist: 'Amyl and the Sniffers', stage: 'Other Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '18:45', endTime: '19:45', description: 'High octane punk rock' },
      { id: 'g-s-oth-4', artist: 'Gossip', stage: 'Other Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '17:00', endTime: '18:00', description: 'Soul punk powerhouse' },

      // Saturday - West Holts
      { id: 'g-s-wes-1', artist: 'Bicep', stage: 'West Holts', dayId: 'saturday', dayName: 'Saturday', startTime: '22:15', endTime: '23:45', description: 'Chroma AV live dance' },
      { id: 'g-s-wes-2', artist: 'Overmono', stage: 'West Holts', dayId: 'saturday', dayName: 'Saturday', startTime: '20:15', endTime: '21:15', description: 'UK bass breaks' },
      { id: 'g-s-wes-3', artist: 'Floating Points', stage: 'West Holts', dayId: 'saturday', dayName: 'Saturday', startTime: '18:30', endTime: '19:30', description: 'Modular electronics' },

      // Sunday - Pyramid Stage
      { id: 'g-u-pyr-1', artist: 'SZA', stage: 'Pyramid Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '21:30', endTime: '23:15', description: 'R&B headline closing' },
      { id: 'g-u-pyr-2', artist: 'The National', stage: 'Pyramid Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '19:15', endTime: '20:30', description: 'Cathartic indie rock' },
      { id: 'g-u-pyr-3', artist: 'Vampire Weekend', stage: 'Pyramid Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '17:00', endTime: '18:15', description: 'Afro-indie pop' },

      // Sunday - Other Stage
      { id: 'g-u-oth-1', artist: 'The National', stage: 'Other Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '21:45', endTime: '23:00', description: 'Alternative headline' },
      { id: 'g-u-oth-2', artist: 'Justice', stage: 'Other Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '20:00', endTime: '21:15', description: 'French electro spectacle' },
      { id: 'g-u-oth-3', artist: 'Fred again..', stage: 'Other Stage', dayId: 'sunday', dayName: 'Sunday', startTime: '18:00', endTime: '19:15', description: 'Communal electronic set' },
    ],
  },
  {
    name: 'Primavera Sound Barcelona 2026',
    location: 'Parc del Fòrum, Barcelona, Spain',
    year: '2026',
    sourceType: 'preset',
    days: [
      { id: 'thursday', name: 'Thursday 4 June', date: '2026-06-04' },
      { id: 'friday', name: 'Friday 5 June', date: '2026-06-05' },
      { id: 'saturday', name: 'Saturday 6 June', date: '2026-06-06' },
    ],
    stages: ['Estrella Damm', 'Santander', 'Cupra', 'Amazon Music', 'Plenitude', 'Boiler Room'],
    sets: [
      { id: 'ps-t-1', artist: 'Charli xcx', stage: 'Estrella Damm', dayId: 'thursday', dayName: 'Thursday', startTime: '23:00', endTime: '00:30', description: 'Brat live' },
      { id: 'ps-t-2', artist: 'Fontaines D.C.', stage: 'Santander', dayId: 'thursday', dayName: 'Thursday', startTime: '21:30', endTime: '22:45', description: 'Romance album tour' },
      { id: 'ps-t-3', artist: 'Justice', stage: 'Cupra', dayId: 'thursday', dayName: 'Thursday', startTime: '01:00', endTime: '02:30', description: 'Late night electro' },
      { id: 'ps-t-4', artist: 'Slowdive', stage: 'Amazon Music', dayId: 'thursday', dayName: 'Thursday', startTime: '20:00', endTime: '21:15', description: 'Sunset shoegaze' },
      { id: 'ps-f-1', artist: 'LCD Soundsystem', stage: 'Estrella Damm', dayId: 'friday', dayName: 'Friday', startTime: '23:45', endTime: '01:30', description: 'Dance punk marathon' },
      { id: 'ps-f-2', artist: 'The National', stage: 'Santander', dayId: 'friday', dayName: 'Friday', startTime: '21:45', endTime: '23:15', description: 'Main stage set' },
      { id: 'ps-f-3', artist: 'Barry Can\'t Swim', stage: 'Cupra', dayId: 'friday', dayName: 'Friday', startTime: '02:00', endTime: '03:30', description: 'Sunrise live house' },
      { id: 'ps-s-1', artist: 'SZA', stage: 'Estrella Damm', dayId: 'saturday', dayName: 'Saturday', startTime: '23:30', endTime: '01:00', description: 'Headliner' },
      { id: 'ps-s-2', artist: 'PJ Harvey', stage: 'Santander', dayId: 'saturday', dayName: 'Saturday', startTime: '21:30', endTime: '22:45', description: 'Art rock performance' },
    ],
  },
  {
    name: 'ArcTanGent Festival 2026',
    location: 'Fernhill Farm, Compton Martin, UK',
    year: '2026',
    sourceType: 'preset',
    days: [
      { id: 'thursday', name: 'Thursday 13 August', date: '2026-08-13' },
      { id: 'friday', name: 'Friday 14 August', date: '2026-08-14' },
      { id: 'saturday', name: 'Saturday 15 August', date: '2026-08-15' },
    ],
    stages: ['Main Stage (Arc)', 'Yohkai Stage', 'Bixler Stage', 'PX3 Stage', 'Elephant in the Bar Room'],
    sets: [
      // Thursday
      { id: 'atg-t-1', artist: 'Alcest', stage: 'Main Stage (Arc)', dayId: 'thursday', dayName: 'Thursday', startTime: '21:30', endTime: '23:00', description: 'Blackgaze & shoegaze headline' },
      { id: 'atg-t-2', artist: 'Arcane Roots', stage: 'Main Stage (Arc)', dayId: 'thursday', dayName: 'Thursday', startTime: '19:45', endTime: '20:45', description: 'Heavy math rock return' },
      { id: 'atg-t-3', artist: 'A.A. Williams', stage: 'Yohkai Stage', dayId: 'thursday', dayName: 'Thursday', startTime: '20:30', endTime: '21:30', description: 'Dark post-rock elegance' },
      { id: 'atg-t-4', artist: 'Agent Fresco', stage: 'Bixler Stage', dayId: 'thursday', dayName: 'Thursday', startTime: '19:00', endTime: '20:00', description: 'Math pop virtuosos' },
      { id: 'atg-t-5', artist: 'Alpha Male Tea Party', stage: 'PX3 Stage', dayId: 'thursday', dayName: 'Thursday', startTime: '18:15', endTime: '19:15', description: 'Riff heavy math rock' },

      // Friday
      { id: 'atg-f-1', artist: 'Barrens', stage: 'Main Stage (Arc)', dayId: 'friday', dayName: 'Friday', startTime: '21:45', endTime: '23:00', description: 'Atmospheric post-rock' },
      { id: 'atg-f-2', artist: 'Amplifier', stage: 'Main Stage (Arc)', dayId: 'friday', dayName: 'Friday', startTime: '20:00', endTime: '21:00', description: 'Progressive space rock' },
      { id: 'atg-f-3', artist: 'Squid', stage: 'Yohkai Stage', dayId: 'friday', dayName: 'Friday', startTime: '20:30', endTime: '21:30', description: 'Krautrock dynamics' },
      { id: 'atg-f-4', artist: 'Slowdive', stage: 'Main Stage (Arc)', dayId: 'friday', dayName: 'Friday', startTime: '18:15', endTime: '19:15', description: 'Shoegaze walls' },

      // Saturday
      { id: 'atg-s-1', artist: 'The Smile', stage: 'Main Stage (Arc)', dayId: 'saturday', dayName: 'Saturday', startTime: '21:30', endTime: '23:00', description: 'Polyrhythmic art rock' },
      { id: 'atg-s-2', artist: 'Black Country New Road', stage: 'Yohkai Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '20:00', endTime: '21:00', description: 'Chamber rock' },
      { id: 'atg-s-3', artist: 'Fat Dog', stage: 'Bixler Stage', dayId: 'saturday', dayName: 'Saturday', startTime: '19:00', endTime: '20:00', description: 'Punk techno' },
    ],
  },
];
