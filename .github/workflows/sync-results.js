// GitHub Actions script — syncs World Cup results from football-data.org to Firebase

const https = require('https');

const FD_API_KEY = process.env.FD_API_KEY;
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;

const TEAM_NAME_MAP = {
  'Mexico': 'Mexico', 'South Africa': 'South Africa', 'Korea Republic': 'South Korea',
  'Czechia': 'Czech Republic', 'Canada': 'Canada', 'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'USA': 'USA', 'United States': 'USA', 'Paraguay': 'Paraguay', 'Qatar': 'Qatar',
  'Switzerland': 'Switzerland', 'Brazil': 'Brazil', 'Morocco': 'Morocco', 'Haiti': 'Haiti',
  'Scotland': 'Scotland', 'Australia': 'Australia', 'Turkey': 'Turkey', 'Germany': 'Germany',
  'Curaçao': 'Curaçao', 'Curacao': 'Curaçao', 'Netherlands': 'Netherlands', 'Japan': 'Japan',
  "Côte d'Ivoire": 'Ivory Coast', 'Ivory Coast': 'Ivory Coast', 'Ecuador': 'Ecuador',
  'Sweden': 'Sweden', 'Ukraine': 'Sweden', 'Tunisia': 'Tunisia', 'Spain': 'Spain',
  'Cabo Verde': 'Cape Verde', 'Belgium': 'Belgium', 'Egypt': 'Egypt',
  'Saudi Arabia': 'Saudi Arabia', 'Uruguay': 'Uruguay', 'Iran': 'Iran',
  'New Zealand': 'New Zealand', 'France': 'France', 'Senegal': 'Senegal',
  'Iraq': 'Iraq', 'Norway': 'Norway', 'Argentina': 'Argentina', 'Algeria': 'Algeria',
  'Austria': 'Austria', 'Jordan': 'Jordan', 'Portugal': 'Portugal',
  'DR Congo': 'DRC', 'England': 'England', 'Croatia': 'Croatia', 'Ghana': 'Ghana',
  'Panama': 'Panama', 'Uzbekistan': 'Uzbekistan', 'Colombia': 'Colombia',
};

const MATCHES = [
  {id:'g01',home:'Mexico',away:'South Africa'},{id:'g02',home:'South Korea',away:'Czech Republic'},
  {id:'g03',home:'Canada',away:'Bosnia & Herzegovina'},{id:'g04',home:'USA',away:'Paraguay'},
  {id:'g05',home:'Qatar',away:'Switzerland'},{id:'g06',home:'Brazil',away:'Morocco'},
  {id:'g07',home:'Haiti',away:'Scotland'},{id:'g08',home:'Australia',away:'Turkey'},
  {id:'g09',home:'Germany',away:'Curaçao'},{id:'g10',home:'Netherlands',away:'Japan'},
  {id:'g11',home:'Ivory Coast',away:'Ecuador'},{id:'g12',home:'Sweden',away:'Tunisia'},
  {id:'g13',home:'Spain',away:'Cape Verde'},{id:'g14',home:'Belgium',away:'Egypt'},
  {id:'g15',home:'Saudi Arabia',away:'Uruguay'},{id:'g16',home:'Iran',away:'New Zealand'},
  {id:'g17',home:'France',away:'Senegal'},{id:'g18',home:'Iraq',away:'Norway'},
  {id:'g19',home:'Argentina',away:'Algeria'},{id:'g20',home:'Austria',away:'Jordan'},
  {id:'g21',home:'Portugal',away:'DRC'},{id:'g22',home:'England',away:'Croatia'},
  {id:'g23',home:'Ghana',away:'Panama'},{id:'g24',home:'Uzbekistan',away:'Colombia'},
  {id:'g25',home:'Czech Republic',away:'South Africa'},{id:'g26',home:'Switzerland',away:'Bosnia & Herzegovina'},
  {id:'g27',home:'Canada',away:'Qatar'},{id:'g28',home:'Mexico',away:'South Korea'},
  {id:'g29',home:'Scotland',away:'Morocco'},{id:'g30',home:'USA',away:'Australia'},
  {id:'g31',home:'Brazil',away:'Haiti'},{id:'g32',home:'Turkey',away:'Paraguay'},
  {id:'g33',home:'Netherlands',away:'Sweden'},{id:'g34',home:'Germany',away:'Ivory Coast'},
  {id:'g35',home:'Ecuador',away:'Curaçao'},{id:'g36',home:'Tunisia',away:'Japan'},
  {id:'g37',home:'Spain',away:'Saudi Arabia'},{id:'g38',home:'Belgium',away:'Iran'},
  {id:'g39',home:'Uruguay',away:'Cape Verde'},{id:'g40',home:'New Zealand',away:'Egypt'},
  {id:'g41',home:'Argentina',away:'Austria'},{id:'g42',home:'France',away:'Iraq'},
  {id:'g43',home:'Norway',away:'Senegal'},{id:'g44',home:'Jordan',away:'Algeria'},
  {id:'g45',home:'Portugal',away:'Uzbekistan'},{id:'g46',home:'England',away:'Ghana'},
  {id:'g47',home:'Panama',away:'Croatia'},{id:'g48',home:'Colombia',away:'DRC'},
  {id:'g49',home:'Switzerland',away:'Canada'},{id:'g50',home:'Bosnia & Herzegovina',away:'Qatar'},
  {id:'g51',home:'Scotland',away:'Brazil'},{id:'g52',home:'Morocco',away:'Haiti'},
  {id:'g53',home:'Czech Republic',away:'Mexico'},{id:'g54',home:'South Africa',away:'South Korea'},
  {id:'g55',home:'Ecuador',away:'Germany'},{id:'g56',home:'Curaçao',away:'Ivory Coast'},
  {id:'g57',home:'Japan',away:'Sweden'},{id:'g58',home:'Tunisia',away:'Netherlands'},
  {id:'g59',home:'Turkey',away:'USA'},{id:'g60',home:'Paraguay',away:'Australia'},
  {id:'g61',home:'Norway',away:'France'},{id:'g62',home:'Senegal',away:'Iraq'},
  {id:'g63',home:'Cape Verde',away:'Saudi Arabia'},{id:'g64',home:'Uruguay',away:'Spain'},
  {id:'g65',home:'Egypt',away:'Iran'},{id:'g66',home:'New Zealand',away:'Belgium'},
  {id:'g67',home:'Panama',away:'England'},{id:'g68',home:'Croatia',away:'Ghana'},
  {id:'g69',home:'Colombia',away:'Portugal'},{id:'g70',home:'DRC',away:'Uzbekistan'},
  {id:'g71',home:'Algeria',away:'Austria'},{id:'g72',home:'Jordan',away:'Argentina'},
  {id:'r32_01',stage:'LAST_32'},{id:'r32_02',stage:'LAST_32'},{id:'r32_03',stage:'LAST_32'},
  {id:'r32_04',stage:'LAST_32'},{id:'r32_05',stage:'LAST_32'},{id:'r32_06',stage:'LAST_32'},
  {id:'r32_07',stage:'LAST_32'},{id:'r32_08',stage:'LAST_32'},{id:'r32_09',stage:'LAST_32'},
  {id:'r32_10',stage:'LAST_32'},{id:'r32_11',stage:'LAST_32'},{id:'r32_12',stage:'LAST_32'},
  {id:'r32_13',stage:'LAST_32'},{id:'r32_14',stage:'LAST_32'},{id:'r32_15',stage:'LAST_32'},
  {id:'r32_16',stage:'LAST_32'},
  {id:'r16_01',stage:'LAST_16'},{id:'r16_02',stage:'LAST_16'},{id:'r16_03',stage:'LAST_16'},
  {id:'r16_04',stage:'LAST_16'},{id:'r16_05',stage:'LAST_16'},{id:'r16_06',stage:'LAST_16'},
  {id:'r16_07',stage:'LAST_16'},{id:'r16_08',stage:'LAST_16'},
  {id:'qf1',stage:'QUARTER_FINALS'},{id:'qf2',stage:'QUARTER_FINALS'},
  {id:'qf3',stage:'QUARTER_FINALS'},{id:'qf4',stage:'QUARTER_FINALS'},
  {id:'sf1',stage:'SEMI_FINALS'},{id:'sf2',stage:'SEMI_FINALS'},
  {id:'bronze',stage:'THIRD_PLACE'},{id:'final',stage:'FINAL'},
];

function normalize(name) { return TEAM_NAME_MAP[name] || name; }

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { ...headers, 'User-Agent': 'WC2026-Prode/1.0' } };
    https.get(url, opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`HTTP ${res.statusCode} from ${url.substring(0,60)}`);
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0,200)}`));
        else resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

function firebaseGet(path) {
  return httpGet(`${FIREBASE_DB_URL}/${path}.json`, {});
}

function firebasePut(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(`${FIREBASE_DB_URL}/${path}.json`);
    const opts = {
      hostname: url.hostname, path: url.pathname,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  console.log('🔄 Fetching WC2026 results from football-data.org...');

  // Try multiple URL approaches to find finished matches
  const urls = [
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026&status=FINISHED',
    'https://api.football-data.org/v4/competitions/WC/matches',
  ];

  let fdMatches = [];
  for (const url of urls) {
    try {
      const data = await httpGet(url, { 'X-Auth-Token': FD_API_KEY });
      const all = data.matches || [];
      console.log(`URL: ${url.substring(40)} → ${all.length} total matches, ${all.filter(m=>m.status==='FINISHED').length} finished`);
      const finished = all.filter(m => m.status === 'FINISHED');
      if (finished.length > 0) { fdMatches = finished; break; }
      if (all.length > 0 && fdMatches.length === 0) fdMatches = finished; // keep trying
    } catch(e) {
      console.log(`URL failed: ${e.message.substring(0,100)}`);
    }
  }

  console.log(`📊 Total finished matches to process: ${fdMatches.length}`);
  if (!fdMatches.length) { console.log('No finished matches yet.'); return; }

  const existingResults = await firebaseGet('wc26/results') || {};
  let updated = 0;
  const koSlotIndex = {};

  fdMatches.sort((a,b) => new Date(a.utcDate) - new Date(b.utcDate));

  fdMatches.forEach(fdMatch => {
    const homeTeam = normalize(fdMatch.homeTeam.name);
    const awayTeam = normalize(fdMatch.awayTeam.name);
    const hg = fdMatch.score.fullTime.home;
    const ag = fdMatch.score.fullTime.away;
    if (hg === null || hg === undefined) return;

    let ourMatch = MATCHES.find(m =>
      m.home && m.away && (
        (m.home === homeTeam && m.away === awayTeam) ||
        (m.home === awayTeam && m.away === homeTeam)
      )
    );

    if (!ourMatch && fdMatch.stage) {
      const stage = fdMatch.stage;
      const stageSlots = MATCHES.filter(m => m.stage === stage);
      if (!koSlotIndex[stage]) koSlotIndex[stage] = 0;
      ourMatch = stageSlots[koSlotIndex[stage]];
      koSlotIndex[stage]++;
    }

    if (!ourMatch) {
      console.log(`⚠️ No match: ${homeTeam} vs ${awayTeam} (${fdMatch.stage})`);
      return;
    }

    const isSwapped = ourMatch.home && ourMatch.home !== homeTeam && ourMatch.away === homeTeam;
    const newHome = isSwapped ? ag : hg;
    const newAway = isSwapped ? hg : ag;

    let penalties = '';
    if (fdMatch.score.penalties && fdMatch.score.penalties.home !== null) {
      const ph = fdMatch.score.penalties.home, pa = fdMatch.score.penalties.away;
      if (ph > pa) penalties = homeTeam; else if (pa > ph) penalties = awayTeam;
    }

    const existing = existingResults[ourMatch.id];
    if (existing && existing.manualOverride) {
      console.log(`⏭️  ${ourMatch.id}: skipping auto-sync (manually overridden by admin)`);
      return;
    }
    if (!existing || existing.homeGoals !== newHome || existing.awayGoals !== newAway) {
      existingResults[ourMatch.id] = {
        homeGoals: newHome, awayGoals: newAway,
        penalties: existing ? (existing.penalties || penalties) : penalties,
        setAt: Date.now(), autoSynced: true
      };
      updated++;
      console.log(`✅ ${ourMatch.id}: ${homeTeam} ${newHome}-${newAway} ${awayTeam}`);
    }
  });

  if (updated > 0) {
    await firebasePut('wc26/results', existingResults);
    console.log(`🎉 Updated ${updated} results in Firebase`);
  } else {
    console.log('✓ All results already up to date');
  }
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
