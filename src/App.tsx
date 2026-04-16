import { useEffect, useRef, useState, type CSSProperties } from 'react';
import NeuroLightBackdrop from './components/NeuroLightBackdrop';
import { portfolioContent, portfolioUi, type Lang } from './data/portfolioContent';

type SectionId = 'info' | 'work' | 'archive' | 'contact';
type ArchiveTab = 'core' | 'works';

const sectionIds: SectionId[] = ['info', 'work', 'archive', 'contact'];
const emptyMenuFill: Record<SectionId, number> = { info: 0, work: 0, archive: 0, contact: 0 };
const LANG_STORAGE_KEY = 'site_lang';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const isLang = (value: string | null): value is Lang => value === 'en' || value === 'ru';
const isArchiveTab = (value: string | null): value is ArchiveTab => value === 'core' || value === 'works';
const isVideoAsset = (value: string) => /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(value);

type MiniComparatorProps = {
  key?: string;
  beforeSrc: string;
  afterSrc: string;
  ariaLabel: string;
};

function MiniComparator({ beforeSrc, afterSrc, ariaLabel }: MiniComparatorProps) {
  const [reveal, setReveal] = useState(0.04);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateReveal = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const next = clamp01((clientX - rect.left) / rect.width);
    setReveal(next);
  };

  const handlePointerDown = (event: import('react').PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    rootRef.current?.setPointerCapture(event.pointerId);
    updateReveal(event.clientX);
  };

  const handlePointerMove = (event: import('react').PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateReveal(event.clientX);
  };

  const handlePointerUp = (event: import('react').PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    rootRef.current?.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className="archive-mini-comparator"
      style={{ '--reveal': `${reveal * 100}%` } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="img"
      aria-label={ariaLabel}
    >
      <img className="archive-mini-base" src={beforeSrc} alt="" loading="lazy" draggable={false} />
      <div className="archive-mini-reveal">
        <img className="archive-mini-top" src={afterSrc} alt="" loading="lazy" draggable={false} />
      </div>
      <div className="archive-mini-divider">
        <span className="archive-mini-handle" />
      </div>
    </div>
  );
}

export default function App() {
  const {
    heroIntro,
    sceneLabel,
    sceneStatement,
    summaryParagraphs,
    coreSkills,
    heroMedia,
    aboutRows,
    experienceTitle,
    experienceHighlights,
    education,
    courses,
    publications,
    selectedProjects,
    contacts,
  } = portfolioContent;

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      return isLang(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  });
  const [activeSection, setActiveSection] = useState<SectionId>('info');
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>('core');
  const [showOtherProjects, setShowOtherProjects] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; kind: 'image' | 'video'; poster?: string | null } | null>(
    null,
  );
  const [menuFill, setMenuFill] = useState<Record<SectionId, number>>(emptyMenuFill);
  const [now, setNow] = useState(() => new Date());
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isDarkScene, setIsDarkScene] = useState(false);

  const infoSceneRef = useRef<HTMLElement | null>(null);
  const aboutExtendedRef = useRef<HTMLElement | null>(null);

  const base = import.meta.env.BASE_URL;
  const resumeHref = `${base}resume/Daria_Melnikova_CV.pdf`;
  const labComparatorPairs = [
    [
      `${base}projects/3d/TBI/concussion-device-cad.webp`,
      `${base}projects/concussion-device-render.webp`,
    ],
    [
      `${base}projects/3d/camera/cam.webp`,
      `${base}projects/3d/camera/render-camera-module.webp`,
    ],
  ] as const;
  const ui = portfolioUi[lang];
  const archiveUi =
    lang === 'ru'
      ? {
          tabs: {
            core: 'Основные проекты',
            works3d: '3D Works',
          },
          readMore: 'Подробнее',
          repo: 'Открыть репозиторий',
          noItems: 'В этом разделе пока нет элементов.',
          comparatorTitle: 'Сравнение этапов рендера',
          comparatorNote:
            'Этот блок использует эффект multi-stage-comparator. Сюда можно подставить пары изображений «до/после» материалов и рендера.',
          openComparator: 'Открыть эффект в отдельной вкладке',
          labTitle: '3D Lab: объекты и Gaussian Splatting',
          labNote:
            'Отдельная страница для 3D-направления: предметные модели, lookdev, заметки и идеи по Gaussian Splatting.',
          openLab: 'Открыть 3D Lab',
          showOtherProjects: 'Other Projects',
          hideOtherProjects: 'Hide Other Projects',
        }
      : {
          tabs: {
            core: 'Main Projects',
            works3d: '3D Works',
          },
          readMore: 'Read more',
          repo: 'Open repository',
          noItems: 'No items in this section yet.',
          comparatorTitle: 'Render Stage Comparator',
          comparatorNote:
            'This block uses the multi-stage-comparator effect. You can place before/after material and render shots here.',
          openComparator: 'Open effect in a new tab',
          labTitle: '3D Lab: Objects and Gaussian Splatting',
          labNote:
            'A standalone page for the 3D track: hard-surface object studies, lookdev notes, and Gaussian Splatting exploration.',
          openLab: 'Open 3D Lab',
          showOtherProjects: 'Other Projects',
          hideOtherProjects: 'Hide Other Projects',
        };
  const coreProjects = selectedProjects.filter((project) => project.category === 'core');
  const worksProjects = selectedProjects.filter(
    (project) => project.category === 'hard3d' || project.category === 'other3d',
  );
  const archiveProjects = archiveTab === 'core' ? coreProjects : worksProjects;
  const premiumProjects = archiveProjects.filter((project) => project.isPremium);
  const otherProjects = archiveProjects.filter((project) => !project.isPremium);
  const visibleArchiveProjects =
    archiveTab === 'core' ? [...premiumProjects, ...(showOtherProjects ? otherProjects : [])] : worksProjects;
  const threeDLabHref = `${base}#/3d-lab`;
  const handleOpenThreeDLab = (event: import('react').MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const scrollingRoot = document.scrollingElement ?? document.documentElement;
    scrollingRoot.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);

    window.requestAnimationFrame(() => {
      window.location.hash = '/3d-lab';
      window.requestAnimationFrame(() => {
        const nextScrollingRoot = document.scrollingElement ?? document.documentElement;
        nextScrollingRoot.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo(0, 0);
      });
    });
  };

  const navItems: Array<{ id: SectionId; index: string; title: string }> = [
    { id: 'info', index: '01', title: ui.nav.info },
    { id: 'work', index: '02', title: ui.nav.work },
    { id: 'archive', index: '03', title: ui.nav.archive },
    { id: 'contact', index: '04', title: ui.nav.contact },
  ];

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const timeLabelRaw = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en',
    timeZone: 'Europe/Samara',
  }).format(now);
  const timeLabel = lang === 'en' ? timeLabelRaw.toUpperCase() : timeLabelRaw;
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Samara',
  }).format(now);

  const darkOpacity = clamp01((sceneProgress - 0.08) / 0.2);
  const darkExpand = clamp01((sceneProgress - 0.12) / 0.34);
  const darkInset = (1 - darkExpand) * 36;
  const wordOpacity = clamp01((sceneProgress - 0.18) / 0.16);
  const wordScale = 0.86 + wordOpacity * 0.14;
  const introOpacity = 1 - clamp01((sceneProgress - 0.08) / 0.2);
  const thumbsOpacity = 1 - clamp01((sceneProgress - 0.28) / 0.18);
  const galleryOpacity = clamp01((sceneProgress - 0.46) / 0.16);
  const galleryLift = (1 - galleryOpacity) * 50;
  const bottomOpacity = clamp01((sceneProgress - 0.62) / 0.14);

  const timeSeed = now.getTime();
  const coordX = (Math.sin(timeSeed / 2400) * 2.8).toFixed(3);
  const coordY = (8 + Math.cos(timeSeed / 1900) * 1.8).toFixed(3);
  const coordZ = (42 + Math.sin(timeSeed / 1500) * 4.5).toFixed(3);

  const sceneStyle = {
    '--dark-opacity': `${darkOpacity}`,
    '--dark-inset': `${darkInset}%`,
    '--word-opacity': `${wordOpacity}`,
    '--word-scale': `${wordScale}`,
    '--intro-opacity': `${introOpacity}`,
    '--thumbs-opacity': `${thumbsOpacity}`,
    '--gallery-opacity': `${galleryOpacity}`,
    '--gallery-lift': `${galleryLift}px`,
    '--bottom-opacity': `${bottomOpacity}`,
  } as CSSProperties;

  const showIntroNeuro = !isDarkScene;

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures (private mode / disabled storage)
    }
  }, [lang]);

  useEffect(() => {
    setShowOtherProjects(false);
    setLightboxImage(null);
  }, [archiveTab]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxImage]);

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      const viewportH = window.innerHeight;
      const section = infoSceneRef.current;
      let isInfoDark = false;

      if (section) {
        const rect = section.getBoundingClientRect();
        const sectionDistance = Math.max(section.offsetHeight - viewportH, 1);
        const passed = clamp01(-rect.top / sectionDistance);
        const dark = passed > 0.18 && passed < 0.95;
        isInfoDark = dark;

        setSceneProgress((prev) => (Math.abs(prev - passed) > 0.003 ? passed : prev));
      }

      const scrollY = window.scrollY;
      const doc = document.documentElement;
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);

      const nextFill: Record<SectionId, number> = { ...emptyMenuFill };
      sectionIds.forEach((id, index) => {
        const currentEl = document.getElementById(id);
        if (!currentEl) return;

        const start = Math.max(0, Math.min(currentEl.offsetTop - viewportH * 0.62, maxScroll));
        const nextEl = sectionIds[index + 1] ? document.getElementById(sectionIds[index + 1]) : null;
        const rawEnd = nextEl ? nextEl.offsetTop - viewportH * 0.62 : maxScroll;
        const end = Math.max(start + 1, Math.min(rawEnd, maxScroll));
        const distance = end - start;
        nextFill[id] = clamp01((scrollY - start) / distance);
      });

      const aboutExtendedEl = aboutExtendedRef.current;
      const isExtendedDark =
        !!aboutExtendedEl &&
        aboutExtendedEl.getBoundingClientRect().top < viewportH * 0.72 &&
        aboutExtendedEl.getBoundingClientRect().bottom > viewportH * 0.2;
      const nextDarkUi = isInfoDark || isExtendedDark;
      setIsDarkScene((prev) => (prev === nextDarkUi ? prev : nextDarkUi));

      if (scrollY >= maxScroll - 2) {
        sectionIds.forEach((id) => {
          nextFill[id] = 1;
        });
      }

      const activationLine = scrollY + viewportH * 0.62;
      let nextActive: SectionId = sectionIds[0];
      sectionIds.forEach((id) => {
        const sectionEl = document.getElementById(id);
        if (!sectionEl) return;
        if (activationLine >= sectionEl.offsetTop) {
          nextActive = id;
        }
      });

      setActiveSection((prev) => (prev === nextActive ? prev : nextActive));
      setMenuFill((prev) => {
        const changed = sectionIds.some((id) => Math.abs(prev[id] - nextFill[id]) > 0.006);
        return changed ? nextFill : prev;
      });
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    return () => revealObserver.disconnect();
  }, []);

  return (
    <>
      <NeuroLightBackdrop visible={showIntroNeuro} />

      <div className={`page-mark${isDarkScene ? ' is-dark' : ''}`} aria-hidden="true">
        neuro
      </div>

      <header className={`frame${isDarkScene ? ' is-dark' : ''}`}>
        <div className="frame-inner">
          <nav className="side-nav" aria-label="Primary">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={['menu-item', activeSection === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                style={{ '--fill': `${menuFill[item.id]}` } as CSSProperties}
              >
                <span>{item.index}</span>
                <span>{item.title}</span>
              </a>
            ))}
          </nav>

          <div className="frame-right">
            <div className="lang-switch" role="group" aria-label={ui.langSwitcherAria}>
              <button
                type="button"
                className={['lang-btn', lang === 'en' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                className={['lang-btn', lang === 'ru' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setLang('ru')}
                aria-pressed={lang === 'ru'}
              >
                RU
              </button>
            </div>

            <div className="meta">
              <div className="meta-name">
                <strong>{ui.fullName}</strong>
                <span>{ui.role}</span>
              </div>
              <div className="meta-time">
                <strong>{timeLabel}</strong>
                <span>{ui.samTag}</span>
              </div>
              <div className="meta-date">{dateLabel}</div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="info" className="info-scene" ref={infoSceneRef}>
          <div className="info-sticky" style={sceneStyle}>
            <div className="scene-dark-layer" aria-hidden="true" />
            <div className="scene-wordmark" aria-hidden="true">
              About
            </div>

            <div className="scene-gallery" aria-hidden="true">
              {heroMedia.map((photo) => {
                const isVideo = (photo as { kind?: string }).kind === 'video';
                return isVideo ? (
                  <video
                    key={photo.src}
                    className={`scene-photo ${photo.className}`}
                    src={photo.src}
                    poster={photo.poster}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    aria-label={photo.alt[lang]}
                  />
                ) : (
                  <img
                    key={photo.src}
                    className={`scene-photo ${photo.className}`}
                    src={photo.src}
                    alt={photo.alt[lang]}
                    loading="lazy"
                  />
                );
              })}
            </div>

            <div className="synapse-overlay" aria-hidden="true">
              <div className="synapse-vignette" />
              <div className="synapse-scanlines" />
              <div className="synapse-corner synapse-corner-tl" />
              <div className="synapse-corner synapse-corner-tr" />
              <div className="synapse-corner synapse-corner-bl" />
              <div className="synapse-corner synapse-corner-br" />

              <div className="synapse-coords">
                <span>X: {coordX}</span>
                <span>Y: {coordY}</span>
                <span>Z: {coordZ}</span>
                <span>{ui.synapseOrbitMode}</span>
              </div>
            </div>

            <div className="scene-bottom" aria-hidden="true">
              <div className="scene-bottom-left">
                <span>[01]</span>
                <strong>{sceneLabel[lang]}</strong>
              </div>
              <p>{sceneStatement[lang]}</p>
            </div>

            <div className="hero-floor">
              <div className="intro">
                <p>{heroIntro[lang]}</p>
                <div className="scroll-hint">{ui.scrollHint}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-extended" ref={aboutExtendedRef}>
          <div className="about-extended-mark" aria-hidden="true">
            About
          </div>
          <div className="about-extended-list">
            {aboutRows.map((item) => (
              <article className="about-extended-row" key={item.index}>
                <div className="about-extended-index">{item.index}</div>
                <h3>{item.title[lang]}</h3>
                <p>{item.text[lang]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="work" className="content-section reveal">
          <div className="section-head">
            <span>[02]</span>
            <h2>{ui.sections.work}</h2>
          </div>

          <div className="columns">
            <article className="panel">
              <h3>{ui.blocks.summary}</h3>
              {summaryParagraphs[lang].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>

            <article className="panel">
              <h3>{ui.blocks.coreSkills}</h3>
              <ul>
                {coreSkills[lang].map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </article>
          </div>

          <article className="panel wide">
            <h3>{experienceTitle[lang]}</h3>
            <ul>
              {experienceHighlights[lang].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel wide">
            <h3>{ui.blocks.educationCourses}</h3>
            <div className="publication-grid">
              <article className="publication-item">
                <p className="publication-meta">{ui.blocks.education}</p>
                {education.map((item) => (
                  <p key={`${item.year}-${item.program.en}`}>
                    <strong>{item.year}</strong> - {item.degree[lang]}, {item.institution[lang]}: {item.program[lang]}
                  </p>
                ))}
              </article>
              <article className="publication-item">
                <p className="publication-meta">{ui.blocks.courses}</p>
                {courses.map((item) => (
                  <p key={`${item.year}-${item.title.en}`}>
                    <strong>{item.year}</strong> - {item.title[lang]}
                  </p>
                ))}
              </article>
            </div>
          </article>

          <article className="panel wide">
            <h3>{ui.blocks.selectedPublications}</h3>
            <div className="publication-grid">
              {publications.map((item) => (
                <article className="publication-item" key={item.doi}>
                  <p className="publication-title">
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.title[lang]}
                    </a>
                  </p>
                  <p className="publication-meta">{item.venue[lang]}</p>
                  <p className="publication-note">{item.note[lang]}</p>
                  <p className="publication-doi">
                    {ui.labels.doi}:{' '}
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.doi}
                    </a>
                  </p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section id="archive" className="content-section reveal">
          <div className="archive-head">
            <span>[03]</span>
            <h2>{ui.sections.archive}</h2>
            <div />
          </div>

          <div className="archive-stack">
            <div className="archive-tabs" role="tablist" aria-label={ui.sections.archive}>
              <button
                type="button"
                role="tab"
                aria-selected={archiveTab === 'core'}
                className={['archive-tab', archiveTab === 'core' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setArchiveTab('core')}
              >
                {archiveUi.tabs.core}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={archiveTab === 'works'}
                className={['archive-tab', archiveTab === 'works' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setArchiveTab('works')}
              >
                {archiveUi.tabs.works3d}
              </button>
            </div>

            {archiveTab === 'works' ? (
              <article className="panel archive-lab-panel archive-lab-cta">
                <div className="archive-lab-comparators">
                  {labComparatorPairs.map(([beforeSrc, afterSrc], index) => (
                    <MiniComparator
                      key={`${beforeSrc}-${index}`}
                      beforeSrc={beforeSrc}
                      afterSrc={afterSrc}
                      ariaLabel={index === 0 ? 'Concussion device hard-surface to color render comparator' : 'Camera module hard-surface to color render comparator'}
                    />
                  ))}
                </div>
                <h3>{archiveUi.labTitle}</h3>
                <p>{archiveUi.labNote}</p>
                <p>{lang === 'ru' ? 'Все 3D-проекты собраны внутри 3D Lab.' : 'All 3D projects are collected in 3D Lab.'}</p>
                <a className="resume-link" href={threeDLabHref} onClick={handleOpenThreeDLab}>
                  {archiveUi.openLab}
                </a>
              </article>
            ) : null}

            {archiveTab === 'core' ? (
              <div className="archive-card-list">
                {visibleArchiveProjects.length === 0 ? <p>{archiveUi.noItems}</p> : null}

                {visibleArchiveProjects.map((item, itemIndex) => {
                  const itemTitle = item.title[lang];
                  const hasImages = item.images.length > 0;
                  return (
                    <article className="archive-card" key={`${item.title.en}-${itemIndex}`}>
                      <div className="archive-card-top">
                        <p className="archive-focus">{item.focus[lang]}</p>
                        <div className="archive-year">{item.year[lang]}</div>
                      </div>

                      <div className={['archive-card-layout', hasImages ? '' : 'no-images'].filter(Boolean).join(' ')}>
                        <div className="archive-card-copy">
                          <h3>{itemTitle}</h3>
                          <p className="archive-summary">{item.summary[lang]}</p>
                          <p className="archive-metric">{item.metric[lang]}</p>
                          {item.repoHref ? (
                            <a
                              className="archive-repo-link"
                              href={item.repoHref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${ui.archiveRepoAriaLabelPrefix} ${itemTitle}`}
                            >
                              {archiveUi.repo}
                            </a>
                          ) : null}
                        </div>

                        {hasImages ? (
                          <div className="archive-thumbs archive-thumbs-side" aria-label={itemTitle}>
                            {item.images.map((image, index) => (
                              (() => {
                                const mediaKind: 'image' | 'video' = isVideoAsset(image) ? 'video' : 'image';
                                const previewSrc = item.previewImages?.[index] ?? image;
                                const videoPoster = item.previewImages?.[index] ?? null;
                                return (
                                  <button
                                    key={`${itemTitle}-${index}`}
                                    type="button"
                                    className="archive-thumb archive-thumb-btn"
                                    onClick={() => setLightboxImage({ src: image, title: itemTitle, kind: mediaKind, poster: videoPoster })}
                                    aria-label={`${itemTitle} ${mediaKind} ${index + 1}`}
                                  >
                                    {mediaKind === 'video' && previewSrc === image ? (
                                      <video src={image} poster={videoPoster ?? undefined} muted loop autoPlay playsInline preload="metadata" />
                                    ) : (
                                      <img src={previewSrc} alt="" loading="lazy" />
                                    )}
                                  </button>
                                );
                              })()
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {archiveTab === 'core' && otherProjects.length > 0 ? (
                  <button
                    type="button"
                    className="archive-other-toggle"
                    onClick={() => setShowOtherProjects((prev) => !prev)}
                  >
                    {showOtherProjects ? archiveUi.hideOtherProjects : archiveUi.showOtherProjects}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section id="contact" className="content-section reveal">
          <div className="section-head">
            <span>[04]</span>
            <h2>{ui.sections.contact}</h2>
          </div>

          <article className="panel wide">
            {contacts.email ? (
              <p>
                {ui.labels.email}:{' '}
                <a href={`mailto:${contacts.email}`} target="_blank" rel="noreferrer">
                  {contacts.email}
                </a>
              </p>
            ) : null}
            {contacts.github ? (
              <p>
                {ui.labels.github}:{' '}
                <a href={contacts.github} target="_blank" rel="noreferrer">
                  {contacts.github}
                </a>
              </p>
            ) : null}
            {contacts.orcid ? (
              <p>
                {ui.labels.orcid}:{' '}
                <a href={contacts.orcid} target="_blank" rel="noreferrer">
                  {contacts.orcid}
                </a>
              </p>
            ) : null}
            {contacts.site ? (
              <p>
                {ui.labels.portfolio}:{' '}
                <a href={contacts.site} target="_blank" rel="noreferrer">
                  {contacts.site}
                </a>
              </p>
            ) : null}
            <a className="resume-link" href={resumeHref} download>
              {ui.resumeDownload}
            </a>
          </article>
        </section>
      </main>

      {lightboxImage ? (
        <div className="image-lightbox" onClick={() => setLightboxImage(null)} role="dialog" aria-modal="true">
          <div className="image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="image-lightbox-close"
              onClick={() => setLightboxImage(null)}
              aria-label="Close image preview"
            >
              ×
            </button>
            {lightboxImage.kind === 'video' ? (
              <video src={lightboxImage.src} poster={lightboxImage.poster ?? undefined} controls autoPlay loop playsInline preload="metadata" />
            ) : (
              <img src={lightboxImage.src} alt={lightboxImage.title} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

