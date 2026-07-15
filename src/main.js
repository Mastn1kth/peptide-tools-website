import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE || API_BASE;
const DEFAULT_INPUT =
  'C[C@@H](C(=O)N[C@@H](CCC(=O)O)C(=O)O)NC(=O)[C@H](C(C)C)NC(=O)[C@H](Cc1ccc(cc1)O)NC(=O)[C@@H]2CCCN2C(=O)[C@H](Cc3ccccc3)N';

const examples = {
  fasta: 'ADWAK',
  insulin: 'GIVEQCCTSICSLYQLENYCN',
  smiles: DEFAULT_INPUT,
};

const team = [
  {
    name: 'Andrey Frolov',
    role: 'Science lead',
    initials: 'AF',
    image: 'https://peptide-tools.com/assets/foto_Andrey_Frolov.jpg',
    text: 'Physicochemical models, scientific validation, and the practical questions behind each prediction.',
    linkedin: 'https://www.linkedin.com/in/andrey-frolov-031a617a/?originalSubdomain=se',
    github: 'https://github.com/frolov-pchem',
  },
];

let lastResult = null;
let selectedFile = null;
let activeRequest = null;
let requestSequence = 0;

const app = document.querySelector('#app');

function icon(name) {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    flask: '<path d="M9 3h6M10 3v5l-5.5 9.5A2.3 2.3 0 0 0 6.5 21h11a2.3 2.3 0 0 0 2-3.5L14 8V3M7.5 15h9"/>',
    upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1.5S17.9.1 15 2a13.4 13.4 0 0 0-7 0C5.1.1 3.9.5 3.9.5A5.4 5.4 0 0 0 3.7 3a5.8 5.8 0 0 0-1.5 4.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 8 18v4M8 19c-3 .9-3-1.5-4.2-2"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    alert: '<path d="M12 3 2.8 19h18.4L12 3ZM12 9v4m0 3h.01"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || ''}</svg>`;
}

function logo() {
  return `<span class="brand-mark" aria-hidden="true">
    <span></span><i></i><span></span><i></i><span></span>
  </span><span class="brand-name">Peptide<span>/</span>Tools</span>`;
}

function shell(content, active) {
  return `
    <div class="site-noise" aria-hidden="true"></div>
    <header class="site-header">
      <a class="brand" href="/home" data-link aria-label="Peptide Tools home">${logo()}</a>
      <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">
        <span></span><span></span>
      </button>
      <nav class="site-nav" aria-label="Main navigation">
        ${navLink('/home', 'Home', active)}
        ${navLink('/documentation', 'Documentation', active)}
        ${navLink('/contacts', 'Contacts', active)}
      </nav>
      <a class="header-action" href="/home#analyser" data-link>Run analysis ${icon('arrow')}</a>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      <div>${logo()}</div>
      <p>Open tools for peptide design, synthesis, and formulation decisions.</p>
      <a href="https://github.com/AstraZeneca/peptide-tools" target="_blank" rel="noreferrer">Source code ${icon('external')}</a>
    </footer>`;
}

function navLink(href, label, active) {
  return `<a href="${href}" data-link ${active === href ? 'aria-current="page"' : ''}>${label}</a>`;
}

function renderHome() {
  return shell(`
    <section class="hero home-hero">
      <div class="hero-copy reveal">
        <div class="eyebrow"><span></span> Open scientific toolkit</div>
        <h1>Know your peptide<br><em>before</em> it reaches the bench.</h1>
        <p>Turn a sequence or chemical structure into decision-ready physicochemical insights in one calculation.</p>
        <div class="hero-actions">
          <a class="button primary" href="#analyser">Start calculating ${icon('arrow')}</a>
          <a class="text-link" href="/documentation" data-link>See how it works</a>
        </div>
      </div>
      <div class="hero-visual reveal delay-1" aria-hidden="true">
        <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
        <div class="amino-card amino-a"><b>NH₂</b><span>N-terminus</span></div>
        <div class="amino-card amino-b"><b>COOH</b><span>C-terminus</span></div>
        <div class="molecule-core"><span>pI</span><strong>8.4</strong><small>predicted</small></div>
        <div class="sequence-ribbon">A · D · W · A · K</div>
      </div>
    </section>

    <section class="proof-strip" aria-label="Available predictions">
      <span>01 <b>Molecular descriptors</b></span>
      <span>02 <b>Isoelectric point</b></span>
      <span>03 <b>Extinction coefficients</b></span>
      <span>04 <b>Stability liabilities</b></span>
    </section>

    <section class="analyser-section" id="analyser">
      <div class="section-intro">
        <div><span class="section-number">01</span><h2>Peptide analyser</h2></div>
        <p>Paste FASTA or SMILES, or upload a supported structure file. The calculation usually takes a few seconds.</p>
      </div>
      <div class="lab-grid">
        <form class="input-panel panel" id="peptide-form">
          <div class="panel-kicker"><span>Input</span><small>FASTA · SMILES · SDF</small></div>
          <label class="field-label" for="peptide-input">Structure or sequence</label>
          <div class="textarea-wrap">
            <textarea id="peptide-input" name="input" rows="9" required spellcheck="false" aria-describedby="input-help">${escapeHtml(DEFAULT_INPUT)}</textarea>
            <span class="line-count">TXT</span>
          </div>
          <p class="field-help" id="input-help">One sequence or structure per calculation.</p>
          <div class="examples" aria-label="Load example">
            <span>Try an example</span>
            <button type="button" data-example="fasta">Short FASTA</button>
            <button type="button" data-example="insulin">Peptide chain</button>
            <button type="button" data-example="smiles">SMILES</button>
          </div>

          <div class="upload-box">
            ${icon('upload')}
            <div><strong>Drop in a structure file</strong><span id="file-name">.smi, .sdf or .fasta</span></div>
            <label class="file-button" for="file-input">Choose file</label>
            <input id="file-input" type="file" accept=".smi,.sdf,.fasta" />
          </div>

          <fieldset class="options-grid">
            <legend>FASTA options</legend>
            ${toggle('ionizable-nterm', 'Ionizable N-terminus', true)}
            ${toggle('ionizable-cterm', 'Ionizable C-terminus', false)}
            ${toggle('no-free-cys', 'Exclude free Cys thiols', true)}
            <label class="compact-field"><span>Disulfide bonds</span><input id="disulfide" value="max" aria-label="Number of disulfide bonds" /></label>
          </fieldset>

          <button class="submit-button" type="submit"><span>Calculate properties</span>${icon('arrow')}</button>
          <p class="form-note">Predictions support research decisions and are not a substitute for experimental validation.</p>
        </form>

        <section class="results-panel panel" id="results-panel" aria-live="polite">
          ${lastResult ? renderResults(lastResult) : emptyResults()}
        </section>
      </div>
    </section>

    <section class="method-section">
      <div class="method-visual"><span>8</span><p>independent pI models<br>combined into one interval</p></div>
      <div class="method-copy"><span class="section-number">02</span><h2>Built for modified peptides, not only sequences.</h2><p>Peptide Tools starts from the complete 2D chemical structure, detecting ionizable fragments that sequence-only calculators can miss.</p><a class="text-link" href="/documentation" data-link>Explore the methodology ${icon('arrow')}</a></div>
    </section>
  `, '/home');
}

function toggle(id, label, checked) {
  return `<label class="toggle-row" for="${id}"><span>${label}</span><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}/><i aria-hidden="true"></i></label>`;
}

function emptyResults() {
  return `<div class="panel-kicker"><span>Results</span><small>Awaiting input</small></div>
    <div class="empty-results">
      <svg viewBox="0 0 500 220" role="img" aria-label="Illustration of a charge curve">
        <path class="axis" d="M35 185H470M58 200V20"/>
        <path class="curve" d="M58 45C145 48 161 63 210 102s75 72 135 75 92 1 125 0"/>
        <circle cx="238" cy="128" r="7"/><path class="guide" d="M238 128V185"/>
      </svg>
      <h3>Your result will appear here</h3>
      <p>Run the example to see molecular descriptors, pI consensus, charge, extinction coefficients, and stability alerts.</p>
      <div><span>MW</span><span>pI</span><span>ε280</span><span>Liabilities</span></div>
    </div>`;
}

function loadingResults() {
  return `<div class="panel-kicker"><span>Results</span><small>Calculating</small></div>
    <div class="loading-state"><div class="loader-orbit"><i></i><span></span></div><h3>Reading the structure</h3><p>Running descriptors, charge models, and stability alerts…</p></div>`;
}

function renderResults(payload) {
  const result = payload?.result || payload;
  const descriptors = first(result?.output_descriptors);
  const ext = first(result?.output_extn_coeff);
  const pi = first(result?.output_pIChemiSt);
  const liabilities = first(result?.output_liabilities)?.liabilities || {};

  if (!descriptors && result?.error) return errorResults('The structure could not be processed. Check the format and try again.');
  if (!descriptors) return errorResults('The server returned an incomplete result. Please try again.');

  const piMean = pi?.pI?.['pI mean'];
  const piErr = pi?.pI?.err;
  const charge = pi?.QpH7?.['Q at pH7.4 mean'];
  const chargeErr = pi?.QpH7?.err;
  const pkaRows = [
    ...Object.values(pi?.frag_acid_pkas_fasta || {}),
    ...Object.values(pi?.frag_base_pkas_fasta || {}),
    ...Object.values(pi?.frag_acid_pkas_calc || {}),
    ...Object.values(pi?.frag_base_pkas_calc || {}),
  ];

  return `<div class="panel-kicker"><span>Results</span><small>Calculation complete</small></div>
    <div class="result-status">${icon('check')} <span>Structure parsed successfully</span></div>
    <div class="metric-grid">
      ${metric('Molecular weight', fmt(descriptors.molecular_weight, 1), 'Da')}
      ${metric('Sequence length', descriptors.seq_length ?? '—', 'residues')}
      ${metric('Isoelectric point', fmt(piMean, 1), piErr != null ? `± ${fmt(piErr, 1)}` : '')}
      ${metric('Charge at pH 7.4', signed(charge), chargeErr != null ? `± ${fmt(chargeErr, 1)}` : '')}
    </div>
    <div class="result-section extinction-section">
      <div class="result-heading"><div><small>Optical properties</small><h3>Extinction coefficients</h3></div><span>cm⁻¹ M⁻¹</span></div>
      <div class="wavelengths">${wavelength('205', ext?.e205)}${wavelength('214', ext?.e214)}${wavelength('280', ext?.e280)}</div>
    </div>
    ${result.filename ? `<div class="result-section chart-section"><div class="result-heading"><div><small>Consensus model</small><h3>Charge vs pH</h3></div>${pi?.pI_interval ? `<span>pI interval ${escapeHtml(pi.pI_interval.join('–'))}</span>` : ''}</div><figure class="chart-frame"><img class="result-chart" src="${IMAGE_BASE}/image/${encodeURIComponent(result.filename)}" alt="Predicted charge versus pH curve" /></figure></div>` : ''}
    ${pkaRows.length ? `<div class="result-section"><div class="result-heading"><div><small>Ionizable fragments</small><h3>Fragment pKa</h3></div><span>${escapeHtml(pi?.pKa_set || '')}</span></div><div class="pka-list">${pkaRows.map(pkaRow).join('')}</div></div>` : ''}
    ${Object.keys(liabilities).length ? `<div class="result-section"><div class="result-heading"><div><small>Formulation watchlist</small><h3>Stability liabilities</h3></div><span>${Object.keys(liabilities).length} alerts</span></div><div class="liability-list">${Object.values(liabilities).map(liabilityCard).join('')}</div></div>` : ''}
    <details class="structure-details"><summary>Input structures <span>View</span></summary><div><small>Sequence</small><code>${escapeHtml(descriptors.fasta || 'Not available')}</code><small>Canonical SMILES</small><code>${escapeHtml(descriptors.smiles || 'Not available')}</code></div></details>`;
}

function metric(label, value, unit) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(unit)}</small></div>`;
}

function wavelength(nm, value) {
  return `<div><span>ε ${nm} nm</span><strong>${value == null ? '—' : Number(value).toLocaleString('en-US')}</strong></div>`;
}

function pkaRow(row) {
  return `<div><span class="type-dot ${row.type === 'acid' ? 'acid' : 'base'}"></span><strong>${escapeHtml(row.frag)}</strong><span>${escapeHtml(row.type)}</span><span>×${escapeHtml(row.count)}</span><b>${fmt(row.pka, 1)}</b></div>`;
}

function liabilityCard(item) {
  return `<details><summary><span>${escapeHtml(item.liability)}</span><b>${escapeHtml(item.match_count)} match${Number(item.match_count) === 1 ? '' : 'es'}</b></summary><div class="liability-body"><p><small>Conditions favouring stability</small>${escapeHtml(item.factors_favoring_stability || '—')}</p><p><small>Conditions that may compromise stability</small>${escapeHtml(item.factors_disfavoring_stability || '—')}</p>${item.comments && item.comments !== '-' ? `<p><small>Comment</small>${escapeHtml(item.comments)}</p>` : ''}</div></details>`;
}

function errorResults(message) {
  return `<div class="panel-kicker"><span>Results</span><small>Input needs attention</small></div><div class="error-state">${icon('alert')}<h3>We could not calculate this structure</h3><p>${escapeHtml(message)}</p><button type="button" id="return-to-input">Review input</button></div>`;
}

function renderDocumentation() {
  const outputs = [
    ['Molecular descriptors', 'Molecular weight, sequence length, LogP, canonical sequence, and SMILES.'],
    ['pI & charge', 'A consensus of eight models, uncertainty, pI interval, and charge at pH 7.4.'],
    ['Extinction coefficients', 'Sequence-based ε values at 205, 214, and 280 nm.'],
    ['Stability liabilities', 'Structural alerts with conditions that favour or compromise stability.'],
  ];
  return shell(`
    <section class="page-hero docs-hero">
      <div class="eyebrow"><span></span> Documentation</div>
      <h1>From chemical structure<br>to a clearer decision.</h1>
      <p>The complete visual guide to inputs, assumptions, pI modelling, optical properties, and stability alerts.</p>
      <div class="doc-index"><a href="#quick-start">01 Quick start</a><a href="#outputs">02 Outputs</a><a href="#pi-science">03 pI science</a><a href="#extinction">04 Extinction</a><a href="#stability">05 Stability</a><a href="#references">06 References</a></div>
    </section>
    <section class="docs-layout">
      <aside><span>On this page</span><a href="#quick-start">Quick start</a><a href="#outputs">What you get</a><a href="#pi-science">pI & solubility</a><a href="#modified">Modified peptides</a><a href="#extinction">Extinction coefficients</a><a href="#stability">Stability alerts</a><a href="#references">Key references</a></aside>
      <div class="docs-content">
        <section id="quick-start" class="doc-section"><span class="section-number">01</span><h2>Quick start</h2><p class="lead">A complete analysis takes three short steps. FASTA is ideal for natural peptides; SMILES or SDF preserves chemical modifications.</p><div class="steps-grid">${step('1', 'Add a structure', 'Paste FASTA or SMILES, or upload .smi, .sdf, or .fasta.')}${step('2', 'Set termini', 'Choose ionizable termini and define disulfide-bond handling.')}${step('3', 'Read the result', 'Compare the consensus pI, charge curve, and stability alerts.')}</div><div class="doc-callout"><b>Tip</b><p>Use a 2D chemical structure for modified peptides. Sequence-only input cannot describe every cap, linker, or non-natural residue.</p></div>${docPlate('Visual walkthrough', 'Input → calculation → result', 'The original user guide is preserved here in a readable, full-size format.', '/docs/Picture_user_guide.png', 'Annotated quick user guide for the Peptide Tools input and results interface', true)}</section>
        <section id="outputs" class="doc-section"><span class="section-number">02</span><h2>What the calculation returns</h2><div class="output-list">${outputs.map(([title, text], index) => `<article><span>0${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div></section>
        <section id="pi-science" class="doc-section science-block"><span class="section-number">03</span><h2>Isoelectric point, charge & solubility</h2><p class="lead">The isoelectric point is the pH where net peptide charge reaches zero. Solubility frequently drops near this region, which makes pI useful when choosing purification and formulation conditions.</p>${docPlate('Purification & formulation', 'Why pI matters', 'The charge curve locates the pI, while experimental examples show how solubility minima can track that point.', '/docs/For_server_1.png', 'Relationship between peptide charge, isoelectric point, and solubility across pH')}</section>
        <section id="modified" class="doc-section"><span class="section-number">04</span><h2>Why modified peptides need structures</h2><p class="lead">A one-letter sequence can miss the effect of non-natural amino acids, terminal caps, linkers, and other ionizable fragments. The same visible sequence may therefore produce the wrong pI.</p>${docPlate('Sequence limitation', 'Fast can still be wrong', 'A Lys analogue changes the chemical charge model even when a sequence-based calculator cannot represent the modification.', '/docs/For_server_2.png', 'Comparison showing failure of sequence-based pI prediction for a modified peptide')}${docPlate('Structure-first model', 'How pIChemiSt calculates pI', 'The structure is split into ionizable fragments, matched to predefined or predicted pKa values, and combined with the Henderson–Hasselbalch equation.', '/docs/For_server_3.png', 'Workflow for calculating isoelectric point from the 2D structure of a modified peptide')}</section>
        <section id="extinction" class="doc-section"><span class="section-number">05</span><h2>Extinction coefficients</h2><p class="lead">Absorbance provides a practical route to peptide concentration when weighing is complicated by water, salts, or counter-ions. Peptide Tools estimates ε at 205, 214, and 280 nm.</p>${docPlate('Optical properties', 'From sequence composition to absorbance', 'The implemented equations give a rapid estimate for canonical amino-acid sequences and should be interpreted alongside experimental context.', '/docs/For_server_4.png', 'Equations and assumptions used to estimate peptide extinction coefficients')}</section>
        <section id="stability" class="doc-section"><span class="section-number">06</span><h2>Chemical stability alerts</h2><p class="lead">Sequence and substructure alerts flag common non-enzymatic degradation routes early, supporting derisking before synthesis and formulation work.</p>${docPlate('Formulation watchlist', 'Structural liabilities worth checking', 'Alerts cover deamidation, isomerization, racemization, backbone hydrolysis, N-terminal cyclization, oxidation, and disulfide scrambling.', '/docs/For_server_5.png', 'Overview of chemical stability structural alerts for peptide therapeutics')}</section>
        <section id="references" class="doc-section"><span class="section-number">07</span><h2>Key references</h2><div class="reference-list"><a href="https://pubs.acs.org/doi/10.1021/acs.jcim.2c01261" target="_blank" rel="noreferrer"><div><small>Journal of Chemical Information and Modeling</small><h3>pIChemiSt: estimating pI from 2D chemical structure</h3></div>${icon('external')}</a><a href="https://github.com/AstraZeneca/peptide-tools" target="_blank" rel="noreferrer"><div><small>Open source · GitHub</small><h3>Peptide Tools Python calculation toolkit</h3></div>${icon('external')}</a></div></section>
      </div>
    </section>
  `, '/documentation');
}

function docPlate(kicker, title, text, src, alt, portrait = false) {
  const size = portrait ? 'width="2250" height="2244"' : 'width="3000" height="1688"';
  return `<figure class="doc-plate ${portrait ? 'doc-plate-portrait' : ''}"><figcaption><div><small>${escapeHtml(kicker)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div><a href="${src}" target="_blank" rel="noreferrer">Open full size ${icon('external')}</a></figcaption><div class="doc-image-scroll" role="region" aria-label="Scrollable figure: ${escapeHtml(title)}" tabindex="0"><img src="${src}" alt="${escapeHtml(alt)}" ${size} loading="lazy" /></div></figure>`;
}

function step(number, title, text) {
  return `<article><span>${number}</span><h3>${title}</h3><p>${text}</p></article>`;
}

function renderContacts() {
  return shell(`
    <section class="page-hero contacts-hero">
      <div class="eyebrow"><span></span> People behind the tools</div>
      <h1>Built by scientists,<br>for people making peptides.</h1>
      <p>Peptide Tools brings scientific modelling, product design, and Python engineering into one open workflow.</p>
    </section>
    <section class="team-section">
      <div class="section-intro"><div><span class="section-number">01</span><h2>Project author</h2></div><p>Questions about physicochemical models, scientific validation, or local installation can be addressed through the profiles below.</p></div>
      <div class="team-grid">${team.map(personCard).join('')}</div>
    </section>
    <section class="contact-band">
      <div><span class="section-number">02</span><h2>Contribute to the toolkit.</h2><p>Report an issue, propose a scientific improvement, or integrate the calculation tools into your own workflow.</p></div>
      <a class="button light" href="https://github.com/AstraZeneca/peptide-tools" target="_blank" rel="noreferrer">Open GitHub repository ${icon('arrow')}</a>
    </section>
  `, '/contacts');
}

function personCard(person, index) {
  return `<article class="person-card reveal" style="--delay:${index * 100}ms"><div class="portrait-wrap"><span>${person.initials}</span><img src="${person.image}" alt="Portrait of ${person.name}" loading="lazy" /></div><div class="person-number">0${index + 1}</div><small>${person.role}</small><h2>${person.name}</h2><p>${person.text}</p><div class="social-links"><a href="${person.linkedin}" target="_blank" rel="noreferrer" aria-label="${person.name} on LinkedIn">${icon('linkedin')} LinkedIn</a><a href="${person.github}" target="_blank" rel="noreferrer" aria-label="${person.name} on GitHub">${icon('github')} GitHub</a></div></article>`;
}

function render() {
  document.body.classList.remove('nav-open');
  selectedFile = null;
  activeRequest?.abort();
  activeRequest = null;
  requestSequence += 1;
  const path = normalizePath(location.pathname);
  const pages = {
    '/home': renderHome,
    '/documentation': renderDocumentation,
    '/contacts': renderContacts,
  };
  app.innerHTML = (pages[path] || renderHome)();
  bindCommon();
  if (path === '/home') bindHome();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function bindCommon() {
  document.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      history.pushState({}, '', `${url.pathname}${url.hash}`);
      render();
      if (url.hash) requestAnimationFrame(() => document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' }));
    });
  });
  const toggle = document.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
}

function bindHome() {
  const input = document.querySelector('#peptide-input');
  document.querySelectorAll('[data-example]').forEach((button) => button.addEventListener('click', () => {
    clearSelectedFile();
    input.value = examples[button.dataset.example];
    input.focus();
  }));
  input?.addEventListener('input', clearSelectedFile);
  document.querySelector('#file-input')?.addEventListener('change', (event) => {
    selectedFile = event.target.files?.[0] || null;
    document.querySelector('#file-name').textContent = selectedFile ? selectedFile.name : '.smi, .sdf or .fasta';
  });
  document.querySelector('#peptide-form')?.addEventListener('submit', submitAnalysis);
  bindResultActions();
}

async function submitAnalysis(event) {
  event.preventDefault();
  const panel = document.querySelector('#results-panel');
  const submitButton = event.currentTarget.querySelector('[type="submit"]');
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const currentRequest = ++requestSequence;
  submitButton.disabled = true;
  panel.innerHTML = loadingResults();
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    let input = document.querySelector('#peptide-input').value.trim();
    if (selectedFile) input = await uploadFile(selectedFile, controller.signal);
    if (!input) throw new Error('Add a FASTA sequence, SMILES structure, or supported file.');
    const payload = {
      input: input.replace(/\r\n|\r|\n/g, 'ENDOFLINE'),
      print_fragment_pkas: true,
      generate_fragment_images: false,
      ionizable_cterm: document.querySelector('#ionizable-cterm').checked,
      ionizable_nterm: document.querySelector('#ionizable-nterm').checked,
      no_free_cys_thiols: document.querySelector('#no-free-cys').checked,
      n_disulfide_bonds: document.querySelector('#disulfide').value.trim() || 'max',
    };
    const response = await fetch(`${API_BASE}/submitJob`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('The input was not recognised as valid FASTA, SMILES, SDF, or SMI.');
    const data = await response.json();
    if (currentRequest !== requestSequence) return;
    if (typeof data.result === 'string') throw new Error('Batch output was created, but this preview cannot display it yet.');
    lastResult = data;
    panel.innerHTML = renderResults(data);
    bindResultActions();
  } catch (error) {
    if (error.name === 'AbortError' || currentRequest !== requestSequence) return;
    panel.innerHTML = errorResults(error.message || 'The calculation service is currently unavailable.');
    bindResultActions();
  } finally {
    if (currentRequest === requestSequence) {
      submitButton.disabled = false;
      activeRequest = null;
    }
  }
}

async function uploadFile(file, signal) {
  const body = new FormData();
  body.append('uploads[]', file, file.name);
  const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body, signal });
  if (!response.ok) throw new Error('The file could not be uploaded. Check its type and size.');
  const data = await response.json();
  const filename = data?.[0]?.filename;
  if (!filename) throw new Error('The upload service did not return a file reference.');
  return filename;
}

function clearSelectedFile() {
  if (!selectedFile) return;
  selectedFile = null;
  const fileInput = document.querySelector('#file-input');
  if (fileInput) fileInput.value = '';
  const fileName = document.querySelector('#file-name');
  if (fileName) fileName.textContent = '.smi, .sdf or .fasta';
}

function bindResultActions() {
  document.querySelector('#return-to-input')?.addEventListener('click', () => {
    document.querySelector('#peptide-input')?.focus();
    document.querySelector('#analyser')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelector('.result-chart')?.addEventListener('error', (event) => {
    event.currentTarget.closest('.chart-section')?.remove();
  });
}

function normalizePath(path) {
  if (path === '/' || path === '') return '/home';
  return path.replace(/\/$/, '');
}

function first(value) {
  if (!value || typeof value !== 'object') return null;
  return value['1'] || Object.values(value)[0] || null;
}

function fmt(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '—';
}

function signed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.addEventListener('popstate', render);
render();
