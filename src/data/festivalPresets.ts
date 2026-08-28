import { FestivalData } from '../types';
import { parseFestivalCsv } from '../utils/timetableParser';

export const COSMIC_VIBRATION_2026_CSV = `// copyright,Licensed under a Creative Commons Attribution-NonCommercial 3.0 License https://creativecommons.org/licenses/by-nc/3.0/. Free for non-commercial use. Contact halvin@clashfinder.com for other uses.
// created,2026-08-18 11:19
// lastEdit,2026-08-18 12:55
// modified,2026-08-18 12:55
// name,Cosmic Vibration 2026
// id,cosmicvibration2026
// url,https://clashfinder.com/s/cosmicvibration2026/
// printAdvisory,5
// timezone,Europe/London
// tzOffset,3600
// tzNote,Start and end times are given in the timezone of the event. Offset by -tzOffset for UTC.
// Start,End,Name,Location,Short Name,Extra Data
2026/08/29 12:00,2026/08/29 12:30,Doors,Ant & Leki,doors(1),
2026/08/29 13:05,2026/08/29 14:10,Breath/Rust,Ant & Leki,breath(1),
2026/08/29 14:10,2026/08/29 15:15,Labrys,Ant & Leki,labrys(1),
2026/08/29 15:15,2026/08/29 16:20,Gilded Cage,Ant & Leki,gilded(1),
2026/08/29 16:20,2026/08/29 17:25,Gnasch,Ant & Leki,gnasch(1),
2026/08/29 17:25,2026/08/29 18:30,Haavat,Ant & Leki,haavat(1),
2026/08/29 18:30,2026/08/29 19:35,Seven Sisters,Ant & Leki,sevens(1),
2026/08/29 19:35,2026/08/29 20:40,Devastator,Ant & Leki,devast(1),
2026/08/29 20:40,2026/08/29 22:00,Final Dose,Ant & Leki,finald(1),
2026/08/29 22:00,2026/08/29 23:05,Pagan Altar,Ant & Leki,pagana(1),
2026/08/30 12:00,2026/08/30 12:35,Doors,Ant & Leki,doors(4),
2026/08/30 13:05,2026/08/30 14:10,Requiem Blues,Ant & Leki,requie(1),
2026/08/30 14:10,2026/08/30 15:15,Tumandumband,Ant & Leki,tumand(1),
2026/08/30 15:15,2026/08/30 16:20,Greedy Karl,Ant & Leki,greedy(1),
2026/08/30 16:20,2026/08/30 17:25,Amon Acid,Ant & Leki,amonac(1),
2026/08/30 17:25,2026/08/30 18:30,Vaticinal Rites,Ant & Leki,vatici(1),
2026/08/30 18:30,2026/08/30 19:35,Bloody Head,Ant & Leki,bloody(1),
2026/08/30 19:35,2026/08/30 20:40,Atomic Rooster,Ant & Leki,atomic(1),
2026/08/30 20:40,2026/08/30 21:45,?,Ant & Leki,noname(1),
2026/08/30 22:00,2026/08/30 23:05,Hallas,Ant & Leki,hallas(1),
2026/08/29 12:00,2026/08/29 12:30,Doors,Martin Bedford,doors(2),
2026/08/29 13:25,2026/08/29 14:30,Vassal,Martin Bedford,vassal(1),
2026/08/29 14:30,2026/08/29 15:35,Big Biffa,Martin Bedford,bigbif(1),
2026/08/29 15:35,2026/08/29 16:40,Slug Milk,Martin Bedford,slugmi(1),
2026/08/29 16:40,2026/08/29 17:45,Newsun,Martin Bedford,newsun(1),
2026/08/29 17:45,2026/08/29 18:50,City Kings,Martin Bedford,cityki(1),
2026/08/29 18:50,2026/08/29 19:55,Parish,Martin Bedford,parish(1),
2026/08/29 19:55,2026/08/29 21:00,Killer Kin,Martin Bedford,killer(1),
2026/08/30 12:00,2026/08/30 12:35,Doors,Martin Bedford,doors(5),
2026/08/30 13:25,2026/08/30 14:30,Machiavellian Art,Martin Bedford,machia(1),
2026/08/30 14:30,2026/08/30 15:35,Asterias Rising,Martin Bedford,asteri(1),
2026/08/30 15:35,2026/08/30 16:40,Greet,Martin Bedford,greet(1),
2026/08/30 16:40,2026/08/30 17:45,R Loomes,Martin Bedford,rloome(1),
2026/08/30 17:45,2026/08/30 18:50,Flickers From the Fen,Martin Bedford,flicke(1),
2026/08/30 18:50,2026/08/30 19:55,Madmess,Martin Bedford,madmes(1),
2026/08/29 12:00,2026/08/29 12:30,Doors,The Crypt,doors(3),
2026/08/29 13:40,2026/08/29 14:45,Warpstormer,The Crypt,warpst(1),
2026/08/29 14:45,2026/08/29 15:50,Wizard Master,The Crypt,wizard(1),
2026/08/29 15:50,2026/08/29 16:55,Owl,The Crypt,owl(1),
2026/08/29 16:55,2026/08/29 18:00,Axe,The Crypt,axe(1),
2026/08/29 18:00,2026/08/29 19:05,Gravekvlt,The Crypt,gravek(1),
2026/08/29 19:05,2026/08/29 20:10,Hangdemang,The Crypt,hangde(1),
2026/08/29 20:10,2026/08/29 21:15,Freeways,The Crypt,freewa(1),
2026/08/30 12:00,2026/08/30 12:35,Doors,The Crypt,doors(6),
2026/08/30 13:40,2026/08/30 14:45,Red Spektor,The Crypt,redspe(1),
2026/08/30 14:45,2026/08/30 15:50,Dungeon,The Crypt,dungeo(1),
2026/08/30 15:50,2026/08/30 16:55,Black Groove,The Crypt,blackg(1),
2026/08/30 16:55,2026/08/30 18:00,Mother Nature,The Crypt,mother(1),
2026/08/30 18:00,2026/08/30 19:05,Aggressive Perfector,The Crypt,aggres(1),
2026/08/30 19:05,2026/08/30 20:10,Outback,The Crypt,outbac(1),
2026/08/30 20:10,2026/08/30 21:15,Old Horn Tooth,The Crypt,oldhor(1),
2026/08/30 21:30,2026/08/30 22:35,Blind Monarch,The Crypt,blindm(1),`;

const parsed = parseFestivalCsv(COSMIC_VIBRATION_2026_CSV, 'Cosmic Vibration 2026', 'preset');

export const COSMIC_VIBRATION_2026: FestivalData = {
  ...parsed,
  name: 'Cosmic Vibration 2026',
  year: '2026',
  sourceUrl: 'https://clashfinder.com/s/cosmicvibration2026/',
  sourceType: 'preset',
};

export const FESTIVAL_PRESETS: FestivalData[] = [
  COSMIC_VIBRATION_2026,
];
