import type { Lang } from './portfolioContent';

export type LabStoryUiText = {
  back: string;
  title: string;
  subtitle: string;
  scrollToEnter: string;
  enteringLab: string;
  arenaTitle: string;
  arenaHint: string;
  arenaHintMobile: string;
  overlayClose: string;
  backToIntro: string;
  boostLabel: string;
  controlMove: string;
  controlTurn: string;
  controlOpen: string;
  noVideo: string;
  galleryTabs: { hard3d: string; other3d: string };
};

export const labStoryText: Record<Lang, LabStoryUiText> = {
  en: {
    back: 'Back to portfolio',
    title: 'Selected\n3D Projects,\nBuilt for\nReal Work',
    subtitle: 'Product visualization / environments / visual development',
    scrollToEnter: 'Scroll to explore the portfolio',
    enteringLab: 'Opening the project space...',
    arenaTitle: '3D Portfolio',
    arenaHint: 'Fly to a project and press E to open it',
    arenaHintMobile: 'Tap a project card to view details',
    overlayClose: 'Close',
    backToIntro: 'Back',
    boostLabel: 'Boost',
    controlMove: 'Move',
    controlTurn: 'Turn',
    controlOpen: 'Open',
    noVideo: 'Video reel is unavailable. Fallback texture is shown.',
    galleryTabs: { hard3d: 'Product Studies', other3d: 'Environments & Scenes' },
  },
  ru: {
    back: 'Назад к портфолио',
    title: 'Избранные\n3D-проекты\nдля реальных\nзадач',
    subtitle: 'Продуктовая визуализация / окружения / визуальная разработка',
    scrollToEnter: 'Прокрутите, чтобы открыть портфолио',
    enteringLab: 'Открываем пространство проектов...',
    arenaTitle: '3D-портфолио',
    arenaHint: 'Подлетите к работе и нажмите E, чтобы открыть',
    arenaHintMobile: 'Нажмите на карточку проекта, чтобы посмотреть детали',
    overlayClose: 'Закрыть',
    backToIntro: 'Назад',
    boostLabel: 'Ускорение',
    controlMove: 'Движение',
    controlTurn: 'Поворот',
    controlOpen: 'Открыть',
    noVideo: 'Видеоролик недоступен. Показан резервный экран.',
    galleryTabs: { hard3d: 'Объектные проекты', other3d: 'Среда и сцены' },
  },
};
