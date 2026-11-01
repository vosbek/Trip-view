/* ───────────────────────── Matt's QCon SF schedule ─────────────────────────
   From qconsf.com/schedule/nov2026 (checked Nov 1; "subject to change"). One pick per slot,
   with the strongest alternative in the same slot. Workshops are per-session registrations. */
const QS = 'https://qconsf.com';
const QCON = {
  mon: [
    { t: '7:15', k: 'meta', title: 'Badge pickup + breakfast', room: 'Market Street Foyer · Pacific Level' },
    { t: '9:00', k: 'key', pick: { title: 'Keynote: The Harness Is the New Operating System', who: 'Manju Rajashekhar, Mad Labs', room: 'Grand Ballroom', url: '/keynote/nov2026/harness-new-operating-system' } },
    { t: '10:35', pick: { title: 'Running Software Factory Efficiently at Uber Scale: Holding Agent Spend Steady While Requests Grew 9X', who: 'Uday Kiran Medisetty, Uber', room: 'Ballroom A', url: '/presentation/nov2026/running-software-factory-efficiently-uber-scale-holding-agent-spend-steady', why: 'Software factory, at scale' },
      alt: { title: 'Legacy vs. AI-Native Is the Wrong Question', who: 'Freshworks · sponsored', room: 'Pacific LM', url: '/presentation/nov2026/legacy-vs-ai-native-wrong-question-architecting-modern-platform' } },
    { t: '11:45', pick: { title: 'Everything I Knew About Developer Experience Is Wrong for Agents', who: 'Emmanuel Paraskakis, Level 250', room: 'Pacific DEKJ', url: '/presentation/nov2026/everything-i-knew-about-developer-experience-wrong-agents', why: 'DevEx when the user is an agent' },
      alt: { title: 'How Airbnb Guardrailed Its AI Customer Support Agent', who: 'Weiping Peng, Airbnb', room: 'Ballroom A', url: '/presentation/nov2026/how-airbnb-guardrailed-its-ai-customer-support-agent' } },
    { t: '12:35', k: 'meta', title: 'Lunch + topic tables', room: 'Atrium level' },
    { t: '1:35', pick: { title: 'Your Agents Lack Context: Here’s How to Fix “You’re absolutely right!”', who: 'Brandon Waselnuk, Unblocked · sponsored', room: 'Pacific LM', url: '/presentation/nov2026/your-agents-lack-context-heres-how-fix-youre-absolutely-right', why: 'Context engine territory' },
      alt: { title: 'LLM Flip-Flops: From Reliability Risk to a Hill-Climbing Signal', who: 'Dianhuan Lin, Datadog', room: 'Ballroom A', url: '/presentation/nov2026/llm-flip-flops-reliability-risk-hill-climbing-signal' } },
    { t: '2:45', pick: { title: 'No New Backend: The API Layer Behind 800+ Agent-Built Apps at Duolingo', who: 'Sarah Deitke, Duolingo', room: 'Pacific DEKJ', url: '/presentation/nov2026/no-new-backend-api-layer-behind-800-agent-built-apps-duolingo', why: 'Agent-built apps, governed' },
      alt: { title: 'Wait, You’re Still Doing PRs?', who: 'Lee Faus, Atomic · sponsored', room: 'Pacific LM', url: '/presentation/nov2026/wait-youre-still-doing-prs' } },
    { t: '3:55', pick: { title: 'Practical Concerns Running Agents in Production', who: 'Amanda Walker, Google', room: 'Ballroom A', url: '/presentation/nov2026/practical-concerns-running-agents-production' },
      alt: { title: 'AI Amplifies Everything, Including Your Mess', who: 'Caio Sousa, Nu · sponsored', room: 'Pacific LM', url: '/presentation/nov2026/ai-amplifies-everything-including-your-mess-lessons-delivering-ai-global-scale' } },
    { t: '5:05', pick: { title: 'Testing & Verification for Code-Generating Agents', who: 'Speaker TBA', room: 'Ballroom A', url: '/presentation/nov2026/testing-verification-code-generating-agents', why: 'Trusting agent-written code' },
      alt: { title: 'It’s Never the Thing That Broke: Learning From Incidents at (AI) Speed', who: 'Vanessa Huerta Granda, Enova', room: 'Seacliff ABC', url: '/presentation/nov2026/its-never-thing-broke-learning-incidents-ai-speed' } },
    { t: '6:00', k: 'meta', title: 'Conference social (until 7)', room: 'Ballroom Foyer · Pacific Level' },
  ],
  tue: [
    { t: '8:00', k: 'meta', title: 'Breakfast', room: 'Pacific Level' },
    { t: '9:00', k: 'key', pick: { title: 'Keynote: Learning Out Loud (Under Near-Existential Pressure)', who: 'Laura Savino, Adobe Photoshop', room: 'Grand Ballroom', url: '/keynote/nov2026/learning-out-loud-under-near-existential-pressure' } },
    { t: '10:35', pick: { title: 'Feeling Faster Isn’t a Metric: Measuring AI’s Real Engineering Impact', who: 'Jeremy Castile, GitKraken · sponsored', room: 'Pacific L-O', url: '/presentation/nov2026/feeling-faster-isnt-metric-measuring-ais-real-engineering-impact', why: 'Evidence for the AI rollout' },
      alt: { title: 'Skills, Memory, or Fine-Tuning? The Engineering Loop Behind Self-Improving Agents', who: 'Abhinav Sinha, Lucidic AI', room: 'Ballroom A', url: '/presentation/nov2026/skills-memory-or-fine-tuning-engineering-loop-behind-self-improving-agents' } },
    { t: '11:45', pick: { title: 'Inside Asimov: BlackRock’s Platform Architecture for Applied AI at Scale', who: 'Dan Wolf & Sri Annapurna Bhupatiraju, BlackRock', room: 'Ballroom A', url: '/presentation/nov2026/inside-asimov-blackrocks-platform-architecture-applied-ai-scale', why: 'Regulated-enterprise AI platform' },
      alt: { title: 'Use AI to Multiply Your Team as a Staff Engineer', who: 'Jordan Cutler, Pinterest', room: 'Pacific DEKJ', url: '/presentation/nov2026/use-ai-multiply-your-team-staff-engineer' } },
    { t: '12:35', k: 'meta', title: 'Lunch + topic tables', room: 'Atrium level' },
    { t: '1:35', pick: { title: 'The Revenge of the Data Scientist: Why Reliable AI Needs Evals, Traces, and Metrics', who: 'Hamel Husain', room: 'Ballroom A', url: '/presentation/nov2026/revenge-data-scientist-why-reliable-ai-needs-evals-traces-and-metrics' },
      alt: { title: 'Scaling Tech by Aligning Humans', who: 'Scott Behrens, Netflix', room: 'Pacific DEKJ', url: '/presentation/nov2026/scaling-tech-aligning-humans' } },
    { t: '2:45', pick: { title: 'Lessons from Building a $100M Product in Six Weeks at OpenAI', who: 'Brian Yang, OpenAI', room: 'Ballroom A', url: '/presentation/nov2026/lessons-building-100m-product-six-weeks-openai' },
      alt: { title: 'Trust, but Verify: Delivering Quality with Agentic Workflows', who: 'Adrian Hatch, Antithesis · sponsored', room: 'Pacific LM', url: '/presentation/nov2026/trust-verify-delivering-quality-agentic-workflows' } },
    { t: '3:55', pick: { title: 'Learning What’s Already There: A Breadth-Based Approach to Onboarding', who: 'Laura de Vesine', room: 'Pacific DEKJ', url: '/presentation/nov2026/learning-whats-already-there-breadth-based-approach-onboarding', why: 'Cartographer’s problem, by hand' },
      alt: { title: 'When Your Users Are Agents: Lessons from a Distributed Postgres Platform', who: 'Gwen Shapira, Nile', room: 'Ballroom BC', url: '/presentation/nov2026/when-your-users-are-agents-lessons-distributed-postgres-platform' } },
    { t: '5:05', pick: { title: 'Adaptive Systems in Production: What Recommendation Systems Can Teach Us About Agents', who: 'Mallika Rao, Zocdoc', room: 'Ballroom BC', url: '/presentation/nov2026/adaptive-systems-production-what-recommendation-systems-can-teach-us-about' },
      alt: { title: 'Failing in Layers: Rebuilding Netflix’s ML Serving Platform', who: 'Rajat Shah & Wenbing Bai, Netflix', room: 'Ballroom A', url: '/presentation/nov2026/failing-layers-lessons-rebuilding-netflixs-ml-serving-platform' } },
    { t: '6:00', k: 'meta', title: 'Reception (until 6:30)', room: 'Ballroom Foyer · Pacific Level' },
  ],
  wed: [
    { t: '8:00', k: 'meta', title: 'Breakfast', room: 'Pacific Level' },
    { t: '9:00', k: 'key', pick: { title: 'Keynote: The Execution Muscle: Why Great Teams Are Built, Not Hired', who: 'Charlotte Mestwerdt, Bravely', room: 'Grand Ballroom', url: '/keynote/nov2026/execution-muscle-why-great-teams-are-built-not-hired' } },
    { t: '10:35', pick: { title: 'How Netflix Retrofitted Its SDLC for AI Coding Agents', who: 'Mark Khuzam, Netflix', room: 'Ballroom BC', url: '/presentation/nov2026/how-netflix-retrofitted-its-sdlc-ai-coding-agents', why: 'The AI-DLC question, answered by Netflix' },
      alt: { title: 'Features With Futures', who: 'Kent Beck', room: 'Ballroom A', url: '/presentation/nov2026/features-futures' } },
    { t: '11:45', pick: { title: 'No More Small Systems: How AI May Bring Large System Problems to Everyone', who: 'Adam Bender, Google', room: 'Ballroom A', url: '/presentation/nov2026/no-more-small-systems-how-ai-may-bring-large-system-problems-everyone' },
      alt: { title: 'Making Production Legible to Agents: Building an Observability MCP', who: 'Liz Fong-Jones, Honeycomb', room: 'Ballroom BC', url: '/presentation/nov2026/making-production-legible-agents-lessons-building-observability-mcp' } },
    { t: '12:35', k: 'meta', title: 'Lunch + topic tables', room: 'Atrium level' },
    { t: '1:35', pick: { title: 'Growing Engineers in the Era of Agentic Coding', who: 'Adam Berry, Netflix', room: 'Ballroom A', url: '/presentation/nov2026/growing-engineers-era-agentic-coding' },
      alt: { title: 'The Death of the Code Review', who: 'Laurie Voss, Arize AI', room: 'Seacliff ABC', url: '/presentation/nov2026/death-code-review' } },
    { t: '2:45', pick: { title: 'Shipping Faster, Understanding Less', who: 'Margaret-Anne Storey, University of Victoria', room: 'Ballroom A', url: '/presentation/nov2026/shipping-faster-understanding-less', why: 'Research, not vendor claims' },
      alt: { title: 'Why Most Platform Teams Fail: The Adoption Problem Nobody Wants to Own', who: 'Shweta Vohra, Booking.com', room: 'Pacific DEKJ', url: '/presentation/nov2026/why-most-platform-teams-fail-adoption-problem-nobody-wants-own' } },
    { t: '3:55', pick: { title: 'The Diary of an AI Adopter: From Skeptical to Enthusiastic in an Org-Wide AI Migration', who: 'Tara Hernandez, MongoDB', room: 'Ballroom A', url: '/presentation/nov2026/diary-ai-adopter-how-i-went-skeptical-enthusiastic-our-organizations-ai', why: 'Rollout to thousands of devs' },
      alt: { title: 'Avoiding Prompt Debt & Other Context Failures', who: 'Drew Breunig, Cmpnd', room: 'Ballroom BC', url: '/presentation/nov2026/avoiding-prompt-debt-other-context-failures' } },
    { t: '4:45', k: 'meta', title: 'Closing reception', room: 'Ballroom Foyer' },
    { t: '5:15', k: 'key', pick: { title: 'Evening keynote: Game Time: How to (Unsuccessfully) 10x in a Week & (Successfully) 10x in a Year', who: 'Plum Ertz, Ro', room: 'Grand Ballroom', url: '/keynote/nov2026/game-time-how-unsuccessfully-10x-week-successfully-10x-year' } },
  ],
  thu: [
    { t: '9:00', k: 'train', pick: { title: 'Measuring What Matters: Building a Developer Productivity Program Engineers Can Trust', who: 'Grey Newell · half day', room: 'Hyatt Regency', url: '/training/nov2026/measuring-what-matters-building-developer-productivity-program-engineers-can-trust', why: 'Measurement for 4,000 devs' },
      alt: { title: 'Supercharge Your Work With Claude Code and Codex', who: 'Khawaja Shams · half day', room: 'Hyatt Regency', url: '/training/nov2026/supercharge-your-work-claude-code-and-codex' } },
    { t: '1:00', k: 'train', pick: { title: 'How To Write Skills That Actually Work', who: 'Baruch Sadogursky · half day', room: 'Hyatt Regency', url: '/training/nov2026/how-write-skills-actually-work', why: 'Agent skills' },
      alt: { title: 'AI-Assisted Coding Master Class: Build Your Mission Control', who: 'Sepehr Khosravi & Dev Bali · half day', room: 'Hyatt Regency', url: '/training/nov2026/ai-assisted-coding-master-class-build-your-mission-control' } },
  ],
  fri: [
    { t: '9:00', k: 'train', pick: { title: 'Effective AI-Native Development with Harness Engineering', who: 'Zichuan Xiong & Premanand Chandrasekaran · full day', room: 'Hyatt Regency', url: '/training/nov2026/effective-ai-native-development-harness-engineering', why: 'Harness + factory, hands-on' },
      alt: { title: 'Agent MCP Workshop: Building Your Own Java-Based MCP Server', who: 'David Parry, Qodo · full day', room: 'Hyatt Regency', url: '/training/nov2026/agent-mcp-workshop-building-your-own-java-based-mcp-server' } },
  ],
};
const QCON_NOTE = {
  thu: 'Register for both. Workshops are booked per session and seats are capped.',
  fri: 'Register for this one too; it runs all day.',
};
function qconPm(t) { const h = +t.split(':')[0]; return h >= 7 && h <= 11 ? 'AM' : 'PM'; }
function qconAgenda(dayId, { print = false } = {}) {
  const rows = QCON[dayId];
  if (!rows) return null;
  const link = (x, cls) => el('a', { class: cls, href: QS + x.url, target: '_blank', rel: 'noopener', text: x.title, onclick: (e) => e.stopPropagation() });
  const items = rows.map((r) => {
    const time = el('span', { class: 'qa-t', text: `${r.t}${print ? ` ${qconPm(r.t)}` : ''}` });
    if (r.k === 'meta') return el('li', { class: 'qa-meta' }, [time, el('span', { class: 'qa-b' }, [el('span', { class: 'qa-title', text: r.title }), el('span', { class: 'qa-room', text: r.room })])]);
    const p = r.pick;
    return el('li', { class: `qa-${r.k || 'talk'}` }, [time, el('span', { class: 'qa-b' }, [
      link(p, 'qa-title'),
      el('span', { class: 'qa-who' }, [p.who, el('b', { class: 'qa-room', text: ` · ${p.room}` })]),
      p.why ? el('span', { class: 'qa-why', text: p.why }) : null,
      r.alt ? el('span', { class: 'qa-alt' }, ['or ', link(r.alt, ''), el('span', { class: 'qa-room', text: ` · ${r.alt.room}` })]) : null,
    ])]);
  });
  return el('div', { class: 'qagenda' }, [
    el('div', { class: 'qa-h' }, [el('span', { text: 'My QCon schedule' }), el('a', { href: `${QS}/schedule/nov2026`, target: '_blank', rel: 'noopener', text: 'Full program ↗', onclick: (e) => e.stopPropagation() })]),
    QCON_NOTE[dayId] ? el('p', { class: 'qa-note', text: QCON_NOTE[dayId] }) : null,
    el('ol', {}, items),
  ]);
}
