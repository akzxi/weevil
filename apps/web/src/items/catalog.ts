import type { ItemDef, ItemKind, Socket } from './types'

// Shared colours for the 8×8 icons. `.` is transparent.
const C = {
  k: '#1f1e1d', // outline / ink
  w: '#f4f1ea', // paper
  g: '#9a958c', // grey
  r: '#d64541', // red
  b: '#3a6fd8', // blue
  n: '#2f9e5b', // green
  o: '#e8853a', // orange
  y: '#f5c842', // yellow
  p: '#7a5bd6', // purple
  d: '#4f3aa3', // dark purple
  c: '#7fd3e8', // cyan / glass
  t: '#a0683a', // tan / wood
  m: '#e4637f', // magenta
}

const item = (
  kind: ItemKind,
  id: string,
  name: string,
  socket: Socket,
  description: string,
  rows: string[],
): ItemDef => ({ id, name, kind, socket, description, icon: { rows, palette: C }, capability: { type: kind, ref: id } })

const skill = (...a: [string, string, Socket, string, string[]]) => item('skill', ...a)
const mcp = (...a: [string, string, Socket, string, string[]]) => item('mcp', ...a)

export const catalog: ItemDef[] = [
  // ── Skills ──────────────────────────────────────────────
  skill('frontend-design', 'Frontend Design', 'head', 'Crafts distinctive, polished interfaces.', [
    '....p...',
    '...pp...',
    '...ppy..',
    '..pppp..',
    '..pypp..',
    '.pppppp.',
    'dddddddd',
    '.dddddd.',
  ]),
  skill('pdf', 'PDF', 'hand', 'Reads, fills and builds PDF files.', [
    '.rrrrrr.',
    '.rwwwwr.',
    '.rwrrwr.',
    '.rwwwwr.',
    '.rwggwr.',
    '.rwwwwr.',
    '.rwggwr.',
    '.rrrrrr.',
  ]),
  skill('docx', 'Word Docs', 'hand', 'Creates and edits Word documents.', [
    '.bbbbbb.',
    '.bwwwwb.',
    '.bwbbwb.',
    '.bwwwwb.',
    '.bwggwb.',
    '.bwwwwb.',
    '.bwggwb.',
    '.bbbbbb.',
  ]),
  skill('xlsx', 'Spreadsheets', 'hand', 'Builds Excel sheets with formulas.', [
    'nnnnnnnn',
    'nwwnwwnn',
    'nwwnwwnn',
    'nnnnnnnn',
    'nwwnwwnn',
    'nwwnwwnn',
    'nnnnnnnn',
    '........',
  ]),
  skill('pptx', 'Slide Decks', 'hand', 'Makes PowerPoint presentations.', [
    'oooooooo',
    'owwwwwwo',
    'owwwwkwo',
    'owwkwkwo',
    'owkkwkwo',
    'owwwwwwo',
    'oooooooo',
    '...oo...',
  ]),
  skill('webapp-testing', 'Webapp Testing', 'hand', 'Drives a browser to test web apps.', [
    '..kkk...',
    '.kcwck..',
    '.kccck..',
    '.kccck..',
    '..kkk...',
    '....kk..',
    '.....kk.',
    '......kk',
  ]),
  skill('mcp-builder', 'MCP Builder', 'back', 'Guides building new MCP servers.', [
    '..kkkk..',
    '..k..k..',
    'tttttttt',
    'tyyttyyt',
    'tttttttt',
    'tttttttt',
    'tttttttt',
    '.k....k.',
  ]),
  skill('skill-creator', 'Skill Creator', 'head', 'Writes and refines new skills.', [
    '...y....',
    '..yyy...',
    '.yyyyy..',
    'yyyyyyy.',
    '.yyyyy..',
    '..yyy...',
    '...y....',
    '........',
  ]),
  skill('canvas-design', 'Canvas Design', 'hand', 'Paints posters and visual art.', [
    '......kk',
    '.....kk.',
    '....kk..',
    '...tt...',
    '..tt....',
    '.mmm....',
    'mmmm....',
    'mm......',
  ]),
  skill('brand-guidelines', 'Brand Guidelines', 'head', 'Keeps work on-brand and on-tone.', [
    '........',
    'y..y..y.',
    'yy.yy.yy',
    'yyyyyyyy',
    'yryybyyy',
    'yyyyyyyy',
    'yyyyyyyy',
    '........',
  ]),

  // ── MCP servers ─────────────────────────────────────────
  mcp('github', 'GitHub', 'back', 'Repos, issues and pull requests.', [
    '..kkkk..',
    '.kkkkkk.',
    'kkwkkwkk',
    'kkkkkkkk',
    'kkkkkkkk',
    '.kkkkkk.',
    '..k..k..',
    '..k..k..',
  ]),
  mcp('playwright', 'Playwright', 'head', 'Automates a real browser.', [
    '........',
    '.nnn.rrr',
    'nnnnrrrr',
    'nknnrkrr',
    'nnnnrrrr',
    'nkkn.rkr',
    '.nnn.rrr',
    '........',
  ]),
  mcp('context7', 'Context7', 'hand', 'Up-to-date library documentation.', [
    'kkkkkkk.',
    'kwwwwwbk',
    'kwkkwwbk',
    'kwwwwwbk',
    'kwkkkwbk',
    'kwwwwwbk',
    'kkkkkkbk',
    '.kkkkkkk',
  ]),
  mcp('slack', 'Slack', 'back', 'Reads and posts team messages.', [
    '.cc..nn.',
    '.cc..nn.',
    'cccccnnn',
    '.cc..nn.',
    '.mm..yy.',
    'mmmmyyyy',
    '.mm..yy.',
    '.mm..yy.',
  ]),
  mcp('filesystem', 'Filesystem', 'back', 'Reads and writes local files.', [
    '........',
    'yyy.....',
    'yyyyyyyy',
    'yttttttt',
    'yttttttt',
    'yttttttt',
    'yyyyyyyy',
    '........',
  ]),
  mcp('postgres', 'Postgres', 'head', 'Queries a PostgreSQL database.', [
    '..bbbb..',
    '.bbbbbb.',
    'bbwbbbbb',
    'bbkbbbbb',
    'bbbbbbbb',
    '.bbbbbb.',
    '.b.bb...',
    '.b..b...',
  ]),
  mcp('sentry', 'Sentry', 'head', 'Inspects errors and crash reports.', [
    '...dd...',
    '..dddd..',
    '.dddddd.',
    'dddddddd',
    'dcccccdd',
    'dcccccdd',
    'dddddddd',
    '........',
  ]),
  mcp('notion', 'Notion', 'hand', 'Searches and edits workspace pages.', [
    'kkkkkkkk',
    'kwwwwwwk',
    'kwkwwkwk',
    'kwkkwkwk',
    'kwkwkkwk',
    'kwkwwkwk',
    'kwwwwwwk',
    'kkkkkkkk',
  ]),
  mcp('linear', 'Linear', 'feet', 'Tracks issues and project cycles.', [
    '........',
    '........',
    '.pp.....',
    '.pp.....',
    '.pppp...',
    '.pppppp.',
    '.wwwwww.',
    '........',
  ]),
  mcp('brave-search', 'Brave Search', 'feet', 'Searches the web privately.', [
    '........',
    '.oo.....',
    '.oo.....',
    '.oo.....',
    '.oooo...',
    '.oooooo.',
    '.kkkkkk.',
    '........',
  ]),
]
