import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/InterTight';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']});

// Palette taken from phamlinhquan.io.vn
const RED = '#FF2A00';
const INK = '#000000';
const GREY = '#6B6B6B';
const PAPER = '#FFFFFF';
const LINE = '#E6E6E6';

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const io = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// ---------- timeline (frames @30fps) ----------
const INTRO = {from: 0, dur: 120};
const STATS = {from: 120, dur: 105};
const S1 = {from: 225, dur: 24 + 3 * 120};
const S2 = {from: S1.from + S1.dur, dur: 24 + 120 + 108 + 141};
const S3 = {from: S2.from + S2.dur, dur: 24 + 7 * 80};
const OUTRO = {from: S3.from + S3.dur, dur: 150};
export const TOTAL = OUTRO.from + OUTRO.dur;
const CUTS = [STATS.from, S1.from, S2.from, S3.from, OUTRO.from];

// ---------- primitives ----------
const Reveal: React.FC<{at: number; dur?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at,
  dur = 22,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  const y = io(f, at, at + dur, 115, 0);
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em', ...style}}>
      <div style={{transform: `translateY(${y}%)`}}>{children}</div>
    </div>
  );
};

const Fade: React.FC<{at: number; dur?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at,
  dur = 16,
  dy = 16,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{opacity: io(f, at, at + dur), transform: `translateY(${io(f, at, at + dur, dy, 0)}px)`, ...style}}>
      {children}
    </div>
  );
};

const Header: React.FC<{right: string}> = ({right}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 34, opacity: io(f, 0, 10)}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 500, letterSpacing: '0.01em'}}>
        <span>PHAM LINH QUAN — DA NANG, VIETNAM</span>
        <span>{right}</span>
      </div>
      <div style={{height: 2, background: INK, width: `${io(f, 0, 24, 0, 100)}%`, marginTop: 12}} />
    </div>
  );
};

const AvailableTag: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 20, fontWeight: 500}}>
      <div style={{width: 12, height: 12, borderRadius: 6, background: RED, opacity: 0.55 + 0.45 * Math.sin(f / 5)}} />
      AVAILABLE FOR REMOTE WORK
    </div>
  );
};

const TICKER = ['29.2M VIEWS', '26K SUBSCRIBERS', 'TOP VIDEO 9.9M', '181 VIDEOS', '10+ VIDEOS / WEEK', 'US CREATOR BRANDS', 'PREMIERE PRO', 'AFTER EFFECTS'];
const Ticker: React.FC<{top: number; left?: number; width?: number; at?: number}> = ({top, left = 0, width = 1920, at = 0}) => {
  const f = useCurrentFrame();
  const row = [...TICKER, ...TICKER, ...TICKER];
  return (
    <div style={{position: 'absolute', left, width, top, height: 56, background: INK, overflow: 'hidden', clipPath: `inset(0 ${io(f, at, at + 20, 100, 0)}% 0 0)`}}>
      <div style={{display: 'flex', whiteSpace: 'nowrap', height: '100%', alignItems: 'center', transform: `translateX(${-f * 3.5}px)`}}>
        {row.map((t, i) => (
          <span key={i} style={{color: PAPER, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', paddingLeft: 30, display: 'flex', alignItems: 'center', gap: 30}}>
            {t}
            <span style={{color: RED, fontSize: 20}}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// One clip. Before its turn it shows its first frame; during its turn it plays with sound;
// afterwards it keeps playing muted until the trimmed source runs out.
const MAXV = 290;
const ClipVideo: React.FC<{src: string; ts: number; te: number}> = ({src, ts, te}) => {
  const f = useCurrentFrame();
  const local = f - ts;
  const s = staticFile(`clips/${src}.mp4`);
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
  if (local < 0)
    return (
      <Freeze frame={20}>
        <OffthreadVideo src={s} muted style={style} />
      </Freeze>
    );
  if (local >= MAXV)
    return (
      <Freeze frame={MAXV - 1}>
        <OffthreadVideo src={s} muted style={style} />
      </Freeze>
    );
  const dur = te - ts;
  return (
    <Sequence from={ts} durationInFrames={MAXV} layout="none">
      <OffthreadVideo
        src={s}
        style={style}
        volume={(vf) => interpolate(vf, [0, 5, dur - 8, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      />
    </Sequence>
  );
};

type Item = {src: string; label: string; kind: string};
type Turn = {ts: number; te: number};

// 0..1, how "on" a clip is around its turn
const activeness = (f: number, t: Turn) => io(f, t.ts - 4, t.ts + 8) * (1 - io(f, t.te - 4, t.te + 8));

const Phone: React.FC<{item: Item; turn: Turn; x: number; y: number; h: number; enterAt: number; showLabel?: boolean}> = ({
  item,
  turn,
  x,
  y,
  h,
  enterAt,
  showLabel = true,
}) => {
  const f = useCurrentFrame();
  const w = (h * 9) / 16;
  const a = activeness(f, turn);
  const enter = io(f, enterAt, enterAt + 20);
  const scale = 0.9 + 0.1 * a;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: enter, transform: `translateY(${(1 - enter) * 60}px)`}}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 18,
          overflow: 'hidden',
          background: '#111',
          transform: `scale(${scale})`,
          transformOrigin: '50% 50%',
          filter: `grayscale(${1 - a}) brightness(${0.75 + 0.25 * a})`,
          opacity: 0.45 + 0.55 * a,
          boxShadow: `0 ${20 * a}px ${50 * a}px rgba(0,0,0,${0.25 * a})`,
          outline: a > 0.5 ? `3px solid ${RED}` : 'none',
          outlineOffset: 6,
        }}
      >
        <ClipVideo src={item.src} ts={turn.ts} te={turn.te} />
      </div>
      {showLabel && (
        <div style={{marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 600, opacity: 0.4 + 0.6 * a}}>
          <span>{item.label}</span>
          <span style={{color: a > 0.5 ? RED : GREY, fontWeight: 500}}>{item.kind}</span>
        </div>
      )}
    </div>
  );
};

// Left column shared by every work section
const SectionText: React.FC<{num: string; title: string; meta: string; desc: string; items: Item[]; turns: Turn[]}> = ({
  num,
  title,
  meta,
  desc,
  items,
  turns,
}) => {
  const f = useCurrentFrame();
  let idx = 0;
  turns.forEach((t, i) => {
    if (f >= t.ts) idx = i;
  });
  const t = turns[idx];
  const progress = interpolate(f, [t.ts, t.te], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 80, top: 140, width: 470, height: 860}}>
      <Reveal at={0}>
        <div style={{color: RED, fontSize: 34, fontWeight: 700}}>{num}</div>
      </Reveal>
      <Reveal at={3} style={{marginTop: 8}}>
        <div style={{fontSize: 88, fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.045em'}}>{title}</div>
      </Reveal>
      <Fade at={8} style={{marginTop: 26, fontSize: 18, fontWeight: 500, color: GREY, letterSpacing: '0.04em'}}>
        {meta}
      </Fade>
      <Fade at={11} style={{marginTop: 18, fontSize: 26, lineHeight: 1.35}}>
        {desc}
      </Fade>
      <Fade at={16} style={{position: 'absolute', bottom: 40, left: 0, right: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, color: GREY, letterSpacing: '0.06em'}}>
          <span>NOW PLAYING</span>
          <span>
            {String(idx + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </div>
        <div style={{overflow: 'hidden', marginTop: 10, height: 50}}>
          <div key={idx} style={{fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap', transform: `translateY(${io(f, t.ts, t.ts + 12, 100, 0)}%)`}}>
            {items[idx].label}
          </div>
        </div>
        <div style={{height: 4, background: LINE, marginTop: 14}}>
          <div style={{height: 4, background: RED, width: `${progress * 100}%`}} />
        </div>
      </Fade>
    </div>
  );
};

// ---------- scenes ----------
const MONTAGE = [
  {src: 'bf-eminem', at: 30},
  {src: 'ryse-gadget', at: 10},
  {src: 'ad-proof', at: 60},
  {src: 'bf-kanye', at: 20},
  {src: 'bashi-152', at: 40},
  {src: 'ryse-cost', at: 0},
  {src: 'bf-travis', at: 15},
];

const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const name: React.CSSProperties = {fontSize: 250, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 0.86};
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Header right="SHOWREEL 2026" />
      <Fade at={4} style={{position: 'absolute', left: 80, top: 128}}>
        <AvailableTag />
      </Fade>
      <div style={{position: 'absolute', left: 72, top: 180}}>
        <Reveal at={6}>
          <div style={name}>Pham Linh</div>
        </Reveal>
        <Reveal at={12}>
          <div style={name}>Quan</div>
        </Reveal>
      </div>
      <Reveal at={26} style={{position: 'absolute', left: 80, top: 650}}>
        <div style={{fontSize: 70, fontWeight: 500, letterSpacing: '-0.04em'}}>
          Video Editor &amp; Motion Designer<span style={{color: RED}}>.</span>
        </div>
      </Reveal>
      <Fade at={36} style={{position: 'absolute', left: 80, top: 760, width: 1050, fontSize: 30, lineHeight: 1.35}}>
        I built a YouTube channel from zero to 29.2M views, doing everything myself. I also edit Reels for US creator brands.
      </Fade>
      {/* quick-cut teaser */}
      <div
        style={{
          position: 'absolute',
          left: 1452,
          top: 128,
          width: 388,
          height: 690,
          borderRadius: 18,
          overflow: 'hidden',
          background: '#111',
          clipPath: `inset(${io(f, 10, 32, 100, 0)}% 0 0 0 round 18px)`,
        }}
      >
        {MONTAGE.map((m, i) => (
          <Sequence key={m.src} from={20 + i * 14} durationInFrames={i === MONTAGE.length - 1 ? 200 : 14} layout="none">
            <AbsoluteFill>
              <OffthreadVideo src={staticFile(`clips/${m.src}.mp4`)} startFrom={m.at} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </AbsoluteFill>
          </Sequence>
        ))}
      </div>
      <Fade at={30} style={{position: 'absolute', left: 1452, top: 836, width: 388, display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 600}}>
        <span>SELECTED WORK</span>
        <span style={{color: RED}}>2023 → NOW</span>
      </Fade>
      <Ticker top={1024 - 56 - 40} at={40} />
    </AbsoluteFill>
  );
};

const STAT_DATA = [
  {v: 29.2, suf: 'M', dec: 1, label: 'TOTAL VIEWS ON BEATFRAME'},
  {v: 26, suf: 'K', dec: 0, label: 'SUBSCRIBERS, FROM ZERO'},
  {v: 9.9, suf: 'M', dec: 1, label: 'VIEWS ON THE TOP VIDEO'},
  {v: 181, suf: '', dec: 0, label: 'VIDEOS, MADE SOLO'},
];

const Stats: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Header right="BEATFRAME / YOUTUBE" />
      <div style={{position: 'absolute', left: 76, top: 140}}>
        <Reveal at={2}>
          <div style={{fontSize: 104, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.95}}>A YouTube channel,</div>
        </Reveal>
        <Reveal at={7}>
          <div style={{fontSize: 104, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.95}}>
            built from zero<span style={{color: RED}}>.</span> <span style={{color: GREY, fontWeight: 500}}>Fully solo.</span>
          </div>
        </Reveal>
      </div>
      <Ticker top={430} left={80} width={1760} at={6} />
      <div style={{position: 'absolute', left: 80, top: 486, width: 1760, height: 300, display: 'flex', border: `2px solid ${INK}`, borderTop: 'none', boxSizing: 'border-box', clipPath: `inset(0 0 ${io(f, 8, 26, 100, 0)}% 0)`}}>
        {STAT_DATA.map((s, i) => {
          const p = io(f, 12 + i * 5, 52 + i * 5);
          return (
            <div key={s.label} style={{flex: 1, borderLeft: i ? `2px solid ${INK}` : 'none', padding: '40px 0 0 34px'}}>
              <div style={{fontSize: 132, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
                {(s.v * p).toFixed(s.dec)}
                {s.suf}
              </div>
              <div style={{fontSize: 21, fontWeight: 500, marginTop: 24}}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <Fade at={34} style={{position: 'absolute', left: 80, top: 830, fontSize: 30, fontWeight: 500}}>
        <span style={{borderBottom: `2px solid ${INK}`}}>youtube.com/@Beatframe999</span> <span style={{color: RED}}>→</span>
      </Fade>
    </AbsoluteFill>
  );
};

// Section 01 — BeatFrame
const S1_ITEMS: Item[] = [
  {src: 'bf-eminem', label: '01. EMINEM DISS', kind: 'SHORT'},
  {src: 'bf-kanye', label: '02. KANYE', kind: 'SHORT'},
  {src: 'bf-travis', label: '03. TRAVIS SCOTT MOMENT', kind: 'SHORT'},
];
const S1_TURNS: Turn[] = S1_ITEMS.map((_, i) => ({ts: 24 + i * 120, te: 24 + (i + 1) * 120}));

const StageGrid: React.FC<{items: Item[]; turns: Turn[]; h: number; gap: number; top: number; enterAt?: number}> = ({items, turns, h, gap, top, enterAt = 4}) => {
  const w = (h * 9) / 16;
  const total = items.length * w + (items.length - 1) * gap;
  const x0 = 600 + (1320 - total) / 2;
  return (
    <>
      {items.map((it, i) => (
        <Phone key={it.src} item={it} turn={turns[i]} x={x0 + i * (w + gap)} y={top} h={h} enterAt={enterAt + i * 4} />
      ))}
    </>
  );
};

const Section1: React.FC = () => (
  <AbsoluteFill style={{background: PAPER}}>
    <Header right="SELECTED WORK" />
    <SectionText
      num="01"
      title="BeatFrame"
      meta="YOUTUBE · OWN CHANNEL · 2025 → NOW"
      desc="English-language rap and music entertainment. Ideas, script, editing, voiceover, SFX and captions, all solo."
      items={S1_ITEMS}
      turns={S1_TURNS}
    />
    <StageGrid items={S1_ITEMS} turns={S1_TURNS} h={720} gap={34} top={130} />
  </AbsoluteFill>
);

// Section 02 — US creator Reels
const S2_ITEMS: Item[] = [
  {src: 'bashi-152', label: '01. BASHIRI SMITH', kind: 'REEL'},
  {src: 'bashi-156', label: '02. BASHIRI SMITH', kind: 'REEL'},
  {src: 'justin', label: '03. JUSTIN PHAN', kind: 'VIDEO'},
];
const S2_TURNS: Turn[] = [
  {ts: 24, te: 144},
  {ts: 144, te: 252},
  {ts: 252, te: 393},
];

const Section2: React.FC = () => {
  const f = useCurrentFrame();
  const out = io(f, 244, 262);
  const cardIn = io(f, 248, 268);
  const jt = S2_TURNS[2];
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Header right="SELECTED WORK" />
      <SectionText
        num="02"
        title="US creator Reels"
        meta="INSTAGRAM · VIA A CREATIVE AGENCY · 2024 → 2025"
        desc="Short-form Reels for creator and coach brands, including Bashiri Smith (207K followers) and Justin Phan."
        items={S2_ITEMS}
        turns={S2_TURNS}
      />
      <div style={{position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateX(${-out * 160}px)`}}>
        <StageGrid items={S2_ITEMS.slice(0, 2)} turns={S2_TURNS.slice(0, 2)} h={720} gap={60} top={130} />
      </div>
      {f >= 244 && (
        <div style={{position: 'absolute', left: 640, top: 150, width: 1200}}>
          <div
            style={{
              width: 1200,
              height: 800,
              borderRadius: 18,
              overflow: 'hidden',
              background: '#111',
              clipPath: `inset(${(1 - cardIn) * 100}% 0 0 0 round 18px)`,
              transform: `scale(${0.94 + 0.06 * cardIn})`,
              outline: `3px solid ${RED}`,
              outlineOffset: 6,
            }}
          >
            <ClipVideo src="justin" ts={jt.ts} te={jt.te} />
          </div>
          <div style={{marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 600, opacity: cardIn}}>
            <span>03. JUSTIN PHAN</span>
            <span style={{color: RED, fontWeight: 500}}>VIDEO</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Section 03 — Ads & product shorts (carousel)
const S3_ITEMS: Item[] = [
  {src: 'ad-proof', label: '01. PROOF AD', kind: 'AD'},
  {src: 'ad-leadform', label: '02. LEAD FORM AD', kind: 'AD'},
  {src: 'reel-creator', label: '03. CREATOR REEL', kind: 'REEL'},
  {src: 'ryse-gadget', label: '04. COOLEST GADGET EVER', kind: 'PRODUCT'},
  {src: 'ryse-8k', label: '05. SOMEONE QUOTE ME 8K', kind: 'PRODUCT'},
  {src: 'ryse-waitdont', label: "06. WAIT, DON'T", kind: 'PRODUCT'},
  {src: 'ryse-cost', label: '07. WHY IT COSTS SO MUCH', kind: 'PRODUCT'},
];
const S3_TURNS: Turn[] = S3_ITEMS.map((_, i) => ({ts: 24 + i * 80, te: 24 + (i + 1) * 80}));

const Section3: React.FC = () => {
  const f = useCurrentFrame();
  const h = 680;
  const w = (h * 9) / 16;
  const step = w + 44;
  let p = 0;
  S3_TURNS.forEach((t, i) => {
    if (i > 0) p += io(f, t.ts - 10, t.ts + 8);
  });
  const slideIn = io(f, 0, 26, 700, 0);
  const center = 1260;
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Header right="SELECTED WORK" />
      <div style={{position: 'absolute', left: 600, top: 90, right: 0, bottom: 0, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${slideIn - 600}px)`}}>
          {S3_ITEMS.map((it, i) => (
            <Phone key={it.src} item={it} turn={S3_TURNS[i]} x={center - w / 2 + (i - p) * step} y={50} h={h} enterAt={0} />
          ))}
        </div>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(90deg, ${PAPER}, rgba(255,255,255,0))`}} />
        <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(270deg, ${PAPER}, rgba(255,255,255,0))`}} />
      </div>
      <SectionText
        num="03"
        title="Ads & product shorts"
        meta="CLIENT WORK · SHORT-FORM"
        desc="Direct-response ads, product shorts and creator reels, cut for the first three seconds."
        items={S3_ITEMS}
        turns={S3_TURNS}
      />
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const big: React.CSSProperties = {fontSize: 168, fontWeight: 700, letterSpacing: '-0.06em', lineHeight: 0.9};
  const contacts = [
    {k: 'EMAIL', v: 'phamlinhquan270403@gmail.com'},
    {k: 'PORTFOLIO', v: 'phamlinhquan.io.vn'},
    {k: 'YOUTUBE', v: 'youtube.com/@Beatframe999'},
  ];
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Header right="CONTACT" />
      <div style={{position: 'absolute', left: 72, top: 150}}>
        <Reveal at={4}>
          <div style={big}>Let's make videos</div>
        </Reveal>
        <Reveal at={10}>
          <div style={big}>
            people finish<span style={{color: RED}}>.</span>
          </div>
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 600, display: 'flex', borderTop: `2px solid ${INK}`, clipPath: `inset(0 ${io(f, 18, 40, 100, 0)}% 0 0)`}}>
        {contacts.map((c, i) => (
          <div key={c.k} style={{flex: c.k === 'EMAIL' ? 1.25 : 1, padding: '30px 0 0 0', borderLeft: i ? `2px solid ${INK}` : 'none', paddingLeft: i ? 34 : 0}}>
            <div style={{fontSize: 18, fontWeight: 600, color: GREY, letterSpacing: '0.06em'}}>{c.k}</div>
            <div style={{fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 12}}>{c.v}</div>
          </div>
        ))}
      </div>
      <Fade at={34} style={{position: 'absolute', left: 80, right: 80, bottom: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <AvailableTag />
        <span style={{fontSize: 20, fontWeight: 500, color: GREY}}>DA NANG, VIETNAM / REMOTE ONLY</span>
      </Fade>
      <AbsoluteFill style={{background: PAPER, opacity: io(f, 136, 150)}} />
    </AbsoluteFill>
  );
};

// Black slab with a red leading edge, wiping across each cut
const Wipes: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {CUTS.map((c) => {
        if (f < c - 10 || f > c + 10) return null;
        const x = f < c ? io(f, c - 10, c, -100, 0) : io(f, c, c + 10, 0, 100);
        return (
          <AbsoluteFill key={c} style={{transform: `translateX(${x}%)`}}>
            <AbsoluteFill style={{background: INK}} />
            <div style={{position: 'absolute', top: 0, bottom: 0, width: 28, background: RED, ...(f < c ? {right: -28} : {left: -28})}} />
          </AbsoluteFill>
        );
      })}
    </>
  );
};

export const Showreel: React.FC = () => {
  const bedVol = (f: number) =>
    0.55 *
    interpolate(f, [0, 6, S1.from - 6, S1.from + 10, OUTRO.from - 10, OUTRO.from + 6, TOTAL - 25, TOTAL], [0, 1, 1, 0, 0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  return (
    <AbsoluteFill style={{background: PAPER, fontFamily, color: INK}}>
      <Sequence from={INTRO.from} durationInFrames={INTRO.dur}>
        <Intro />
      </Sequence>
      <Sequence from={STATS.from} durationInFrames={STATS.dur}>
        <Stats />
      </Sequence>
      <Sequence from={S1.from} durationInFrames={S1.dur}>
        <Section1 />
      </Sequence>
      <Sequence from={S2.from} durationInFrames={S2.dur}>
        <Section2 />
      </Sequence>
      <Sequence from={S3.from} durationInFrames={S3.dur}>
        <Section3 />
      </Sequence>
      <Sequence from={OUTRO.from} durationInFrames={OUTRO.dur}>
        <Outro />
      </Sequence>
      <Wipes />
      <Audio src={staticFile('audio/bed.wav')} volume={bedVol} />
      {CUTS.map((c) => (
        <Sequence key={c} from={c - 10} durationInFrames={20}>
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.45} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
