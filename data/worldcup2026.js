/**
 * worldcup2026.js
 * Copa del Mundo 2026 - Datos de los partidos (fase de grupos)
 * 48 equipos, 12 grupos (A-L), 6 partidos por grupo, 72 partidos totales
 */

const GROUPS = {
  A: ['USA', 'Panamá', 'El Salvador', 'Jamaica'],
  B: ['México', 'Honduras', 'Costa Rica', 'Cuba'],
  C: ['Canadá', 'Uruguay', 'Chile', 'Bolivia'],
  D: ['Argentina', 'Perú', 'Ecuador', 'Paraguay'],
  E: ['Brasil', 'Colombia', 'Venezuela', 'Trinidad y Tobago'],
  F: ['Francia', 'Bélgica', 'Países Bajos', 'Polonia'],
  G: ['España', 'Alemania', 'Croacia', 'República Checa'],
  H: ['Inglaterra', 'Portugal', 'Italia', 'Turquía'],
  I: ['Japón', 'Corea del Sur', 'Irán', 'Australia'],
  J: ['Arabia Saudita', 'Marruecos', 'Egipto', 'Túnez'],
  K: ['Nigeria', 'Camerún', 'Senegal', 'Ghana'],
  L: ['Serbia', 'Suiza', 'Dinamarca', 'Austria'],
};

/**
 * Genera los 6 partidos de un grupo:
 *   Jornada 1: [0]vs[1]  |  [2]vs[3]
 *   Jornada 2: [0]vs[2]  |  [1]vs[3]
 *   Jornada 3: [0]vs[3]  |  [1]vs[2]  (simultáneos)
 */
function buildGroupMatches(groupLetter, teams, dates, startId) {
  const [t0, t1, t2, t3] = teams;
  const { md1, md2, md3 } = dates;
  return [
    { id: startId,     group: groupLetter, home: t0, away: t1, date: md1[0] },
    { id: startId + 1, group: groupLetter, home: t2, away: t3, date: md1[1] },
    { id: startId + 2, group: groupLetter, home: t0, away: t2, date: md2[0] },
    { id: startId + 3, group: groupLetter, home: t1, away: t3, date: md2[1] },
    { id: startId + 4, group: groupLetter, home: t0, away: t3, date: md3[0] },
    { id: startId + 5, group: groupLetter, home: t1, away: t2, date: md3[1] },
  ];
}

// Todas las fechas en UTC. Los partidos de jornada 3 son simultáneos dentro del grupo.
const schedules = {
  A: { md1: ['2026-06-11T21:00:00Z', '2026-06-12T01:00:00Z'], md2: ['2026-06-17T21:00:00Z', '2026-06-18T01:00:00Z'], md3: ['2026-06-25T21:00:00Z', '2026-06-25T21:00:00Z'] },
  B: { md1: ['2026-06-12T18:00:00Z', '2026-06-12T21:00:00Z'], md2: ['2026-06-18T21:00:00Z', '2026-06-19T01:00:00Z'], md3: ['2026-06-25T18:00:00Z', '2026-06-25T18:00:00Z'] },
  C: { md1: ['2026-06-13T01:00:00Z', '2026-06-13T18:00:00Z'], md2: ['2026-06-19T18:00:00Z', '2026-06-19T21:00:00Z'], md3: ['2026-06-26T01:00:00Z', '2026-06-26T01:00:00Z'] },
  D: { md1: ['2026-06-13T21:00:00Z', '2026-06-14T01:00:00Z'], md2: ['2026-06-20T01:00:00Z', '2026-06-20T18:00:00Z'], md3: ['2026-06-26T18:00:00Z', '2026-06-26T18:00:00Z'] },
  E: { md1: ['2026-06-14T18:00:00Z', '2026-06-14T21:00:00Z'], md2: ['2026-06-20T21:00:00Z', '2026-06-21T01:00:00Z'], md3: ['2026-06-26T21:00:00Z', '2026-06-26T21:00:00Z'] },
  F: { md1: ['2026-06-15T01:00:00Z', '2026-06-15T18:00:00Z'], md2: ['2026-06-21T18:00:00Z', '2026-06-21T21:00:00Z'], md3: ['2026-06-27T01:00:00Z', '2026-06-27T01:00:00Z'] },
  G: { md1: ['2026-06-15T21:00:00Z', '2026-06-16T01:00:00Z'], md2: ['2026-06-22T01:00:00Z', '2026-06-22T18:00:00Z'], md3: ['2026-06-27T18:00:00Z', '2026-06-27T18:00:00Z'] },
  H: { md1: ['2026-06-16T18:00:00Z', '2026-06-16T21:00:00Z'], md2: ['2026-06-22T21:00:00Z', '2026-06-23T01:00:00Z'], md3: ['2026-06-27T21:00:00Z', '2026-06-27T21:00:00Z'] },
  I: { md1: ['2026-06-17T01:00:00Z', '2026-06-17T18:00:00Z'], md2: ['2026-06-23T18:00:00Z', '2026-06-23T21:00:00Z'], md3: ['2026-06-28T01:00:00Z', '2026-06-28T01:00:00Z'] },
  J: { md1: ['2026-06-17T21:00:00Z', '2026-06-18T01:00:00Z'], md2: ['2026-06-24T01:00:00Z', '2026-06-24T18:00:00Z'], md3: ['2026-06-28T18:00:00Z', '2026-06-28T18:00:00Z'] },
  K: { md1: ['2026-06-18T18:00:00Z', '2026-06-18T21:00:00Z'], md2: ['2026-06-24T21:00:00Z', '2026-06-25T01:00:00Z'], md3: ['2026-06-29T01:00:00Z', '2026-06-29T01:00:00Z'] },
  L: { md1: ['2026-06-19T01:00:00Z', '2026-06-19T18:00:00Z'], md2: ['2026-06-25T01:00:00Z', '2026-06-25T18:00:00Z'], md3: ['2026-06-29T18:00:00Z', '2026-06-29T18:00:00Z'] },
};

let currentId = 1;
const matches = [];

for (const [letter, teams] of Object.entries(GROUPS)) {
  const groupMatches = buildGroupMatches(letter, teams, schedules[letter], currentId);
  matches.push(...groupMatches);
  currentId += 6;
}

module.exports = { matches, GROUPS };
