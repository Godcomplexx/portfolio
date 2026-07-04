import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import Lenis from 'lenis';
import { portfolioContent, portfolioUi, type Lang, type SelectedProject } from './data/portfolioContent';
import { labStoryText } from './data/labStoryText';
import {
  neonGridVertex,
  tunnelParticleVertex,
  tunnelParticleFragment,
  arenaGridFragment,
  projectParticleVertex,
  projectParticleFragment,
  transitionVertex,
  transitionFragment,
  postFxVertex,
  postFxFragment,
} from './labShaders';
import './threeDLab.css';

/* -- constants -- */

type LabOverlayItem = {
  title: Record<Lang, string>;
  year: Record<Lang, string>;
  focus: Record<Lang, string>;
  summary: Record<Lang, string>;
  metric: Record<Lang, string>;
  images: string[];
  previewImages?: string[];
  repoHref?: string | null;
};

const LANG_STORAGE_KEY = 'site_lang';
const MOBILE_BREAKPOINT = 820;
const SCROLL_PAGE_HEIGHT = 3; // total fixed-canvas page span
const SCROLL_PAGE_WIDTH = 1;
const ACT1_END = 0.46; // scroll fraction where act1 ends
const SUCTION_START = ACT1_END;
const SUCTION_END = 0.9;
const ACT3_CONTROL_UNLOCK = 0.82;
const SCREEN_CYCLE_SECONDS = 2.8;

// vehicle
const ACCEL = 8.2;
const FRICTION = 5.8;
const BOOST_MULT = 1.18;
const MAX_SPEED = 18;
const YAW_RESPONSE = 6.4;
const TILT_RESPONSE = 5.2;
const REVERSE_MULT = 0.72;
const MAX_STEER_RATE = 2.6; // rad/sec in tank mode
const CAMERA_POS_RESPONSE = 4.6;
const CAMERA_LOOK_RESPONSE = 5.2;
const CAMERA_YAW_RESPONSE = 4.2;
const ARENA_HALF = 55;
const ACT3_SPAWN_EDGE_INSET = 4;
const ACT3_SPAWN_X = 0;
const ACT3_SPAWN_Z = -ARENA_HALF + ACT3_SPAWN_EDGE_INSET;
const ACT3_SPAWN_ANGLE = 0;
const ACT3_PANEL_ROTATION_Y = 0;
const TRIGGER_RADIUS = 8;
const PROJECT_PANEL_WIDTH = 8.8;
const PROJECT_PANEL_HEIGHT = 6.2;
const ACT3_PROJECT_LANE_OFFSET = 9.6;
const ACT3_PROJECT_TILE_MIN_WIDTH = 4.8;
const ACT3_PROJECT_TILE_MAX_WIDTH = 9.4;
const ACT3_AMBIENT_TILE_MIN_WIDTH = 3.8;
const ACT3_AMBIENT_TILE_MAX_WIDTH = 7.4;
const PROJECT_PARTICLE_COLS = 360;
const PROJECT_PARTICLE_ROWS = 260;
const GALLERY_PARTICLE_COLS = 240;
const GALLERY_PARTICLE_ROWS = 180;

/* -- helpers -- */

const isLang = (v: string | null): v is Lang => v === 'en' || v === 'ru';
const isVideoAsset = (v: string) => /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInCubic = (t: number) => t * t * t;
const easeInQuad = (t: number) => t * t;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
};
const getProjectPreview = (project: SelectedProject) => project.previewImages?.find(Boolean) ?? project.images.find((asset) => !isVideoAsset(asset)) ?? null;
const getProjectArenaAsset = (project: SelectedProject) => project.images.find((asset) => !isVideoAsset(asset)) ?? getProjectPreview(project);
const encodeAssetPath = (file: string) => file.split('/').map((part) => encodeURIComponent(part)).join('/');
const project3dAsset = (file: string) => `${import.meta.env.BASE_URL}projects/3d/${encodeAssetPath(file)}`;
const project3dPosterAsset = (file: string) => `${import.meta.env.BASE_URL}projects/posters/3d/${encodeAssetPath(file)}`;
const ACT3_FEATURED_PROJECT_ASSETS = {
  other3d: project3dAsset('room/render-room-hallway.webp'),
  hard3d: project3dAsset('camera/render-camera-module.webp'),
} as const;
const MAX_OVERLAY_MEDIA = 3;
const ACT3_INTRO_STILL_ASSET = project3dAsset('tentikales/camsmth1.webp');
const ACT3_INTRO_VIDEO_ASSET = project3dAsset('3d cam ver1/0408.mp4');
type ArenaTheme = 'environment' | 'camera' | 'device' | 'vending' | 'experimental';
type ArenaMediaBundle = {
  title: Record<Lang, string>;
  year: Record<Lang, string>;
  focus: Record<Lang, string>;
  summary: Record<Lang, string>;
  metric: Record<Lang, string>;
  media: string[];
  previewImages?: string[];
};
type ArenaMediaBundleEntry = {
  theme: ArenaTheme;
  stills: string[];
  videos?: string[];
  cover?: string;
  bundle: ArenaMediaBundle;
};
type ArenaGalleryMeta = {
  asset: string;
  theme: ArenaTheme;
  bundle: ArenaMediaBundle;
  relatedStills: string[];
  videos: string[];
};
const ACT3_ARENA_MEDIA_BUNDLES = [
  {
    theme: 'environment' as ArenaTheme,
    stills: ['room/render-room-hallway.webp', 'room/lastroom_png.webp', 'room/testroomnew.webp'],
    bundle: {
      title: { en: 'Environment Study', ru: 'Исследование окружения' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Interior lighting / scene composition', ru: 'Интерьерный свет / композиция сцены' },
      summary: {
        en: 'Scene development for interior mood, camera framing, and readable atmosphere studies built from multiple 3D passes.',
        ru: 'Развитие сцены с упором на атмосферу интерьера, кадрирование и читаемую среду на основе нескольких 3D-проходов.',
      },
      metric: { en: 'Grouped from one scene folder', ru: 'Собрано из одной папки сцены' },
      media: [
        project3dAsset('room/render-room-hallway.webp'),
        project3dAsset('room/lastroom_png.webp'),
        project3dAsset('room/testroomnew.webp'),
      ],
    },
  },
  {
    theme: 'camera' as ArenaTheme,
    stills: ['camera/render-camera-module.webp', 'camera/render-camera-closeup.webp', 'camera/cam.webp'],
    videos: ['camera/test.mp4'],
    bundle: {
      title: { en: 'Camera Module Study', ru: 'Исследование камерного модуля' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Product visualization / close detail', ru: 'Продуктовая визуализация / крупные детали' },
      summary: {
        en: 'A set of camera device renders combining wider module views, close shots, and a short motion clip for presentation.',
        ru: 'Серия рендеров камерного устройства: общие планы, крупные детали и короткий motion-клип для презентации.',
      },
      metric: { en: 'Still renders with motion clip', ru: 'Статичные рендеры и motion-клип' },
      media: [
        project3dAsset('camera/render-camera-module.webp'),
        project3dAsset('camera/render-camera-closeup.webp'),
        project3dAsset('camera/cam.webp'),
        project3dAsset('camera/test.mp4'),
      ],
      previewImages: [
        project3dAsset('camera/render-camera-module.webp'),
        project3dAsset('camera/render-camera-closeup.webp'),
        project3dAsset('camera/cam.webp'),
        project3dAsset('camera/render-camera-module.webp'),
      ],
    },
  },
  {
    theme: 'camera' as ArenaTheme,
    stills: [],
    videos: ['3d cam ver1/0408.mp4', '3d cam ver1/0604 (1)(1).mp4'],
    cover: project3dPosterAsset('0408.webp'),
    bundle: {
      title: { en: 'Camera Motion Study', ru: 'Исследование motion-камеры' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Motion preview / camera concept', ru: 'Motion-превью / концепт камеры' },
      summary: {
        en: 'Short motion studies collected from the 3d cam ver1 folder and presented as a separate project block.',
        ru: 'Короткие motion-этюды из папки 3d cam ver1, вынесенные в отдельный проектный блок.',
      },
      metric: { en: 'Video-only project from one folder', ru: 'Отдельный video-only проект из одной папки' },
      media: [
        project3dAsset('3d cam ver1/0408.mp4'),
        project3dAsset('3d cam ver1/0604 (1)(1).mp4'),
      ],
      previewImages: [
        project3dPosterAsset('0408.webp'),
        project3dPosterAsset('0408.webp'),
      ],
    },
  },
  {
    theme: 'camera' as ArenaTheme,
    stills: ['tentikales/camsmth1.webp', 'tentikales/photo_2026-01-25_20-10-12.jpg'],
    bundle: {
      title: { en: 'Tentacle Camera Study', ru: 'Исследование камеры с щупальцами' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Stylized camera concept / mood stills', ru: 'Стилизованный концепт камеры / атмосферные кадры' },
      summary: {
        en: 'A compact two-frame concept set from the tentacle camera folder, kept separate from the main hard-surface camera pack.',
        ru: 'Компактный сет из двух кадров из папки tentikales, отделенный от основного hard-surface набора камеры.',
      },
      metric: { en: 'Two related stills from one folder', ru: 'Два связанных кадра из одной папки' },
      media: [
        project3dAsset('tentikales/camsmth1.webp'),
        project3dAsset('tentikales/photo_2026-01-25_20-10-12.jpg'),
      ],
    },
  },
  {
    theme: 'device' as ArenaTheme,
    stills: ['TBI/concussion-device-cad.webp', 'TBI/concussion-device-render - Copy.webp'],
    bundle: {
      title: { en: 'Device Concept Pack', ru: 'Пакет концептов устройства' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'CAD / prototype exploration', ru: 'CAD / исследование прототипа' },
      summary: {
        en: 'Concept visuals for a hardware device, combining CAD studies, polished render passes, and prototype snapshots.',
        ru: 'Концепт-визуализация аппаратного устройства: CAD-исследования, чистовые рендеры и фотографии прототипов.',
      },
      metric: { en: 'CAD and polished stills from one folder', ru: 'CAD и чистовые рендеры из одной папки' },
      media: [
        project3dAsset('TBI/concussion-device-cad.webp'),
        project3dAsset('TBI/concussion-device-render - Copy.webp'),
      ],
    },
  },
  {
    theme: 'device' as ArenaTheme,
    stills: ['cd/cd.webp', 'cd/cd2.webp', 'cd/test2.webp'],
    videos: ['cd/02.mov'],
    bundle: {
      title: { en: 'Optical Disc Study', ru: 'Исследование оптического объекта' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Material study / reflective surfaces', ru: 'Исследование материалов / отражающие поверхности' },
      summary: {
        en: 'A focused object set built from one folder with reflective surfaces, packaging shots, and a short motion preview.',
        ru: 'Компактный объектный сет из одной папки: отражающие поверхности, продуктовые кадры и короткий motion-превью.',
      },
      metric: { en: 'Still set with same-folder motion', ru: 'Набор рендеров и видео из одной папки' },
      media: [
        project3dAsset('cd/cd.webp'),
        project3dAsset('cd/cd2.webp'),
        project3dAsset('cd/02.mov'),
      ],
      previewImages: [
        project3dAsset('cd/cd.webp'),
        project3dAsset('cd/cd2.webp'),
        project3dAsset('cd/test2.webp'),
      ],
    },
  },
  {
    theme: 'device' as ArenaTheme,
    stills: ['sigh/21.webp', 'sigh/4.webp', 'sigh/Untitled.webp'],
    videos: ['sigh/02.mp4'],
    bundle: {
      title: { en: 'Sigh Disc Study', ru: 'Исследование объекта sigh' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Reflective object / alternate render set', ru: 'Отражающий объект / альтернативный набор рендеров' },
      summary: {
        en: 'A separate object folder with its own stills and motion test, kept independent from the cd pack.',
        ru: 'Отдельная папка объекта со своими рендерами и motion-тестом, отделенная от набора cd.',
      },
      metric: { en: 'One folder = one project', ru: 'Одна папка = один проект' },
      media: [
        project3dAsset('sigh/21.webp'),
        project3dAsset('sigh/4.webp'),
        project3dAsset('sigh/02.mp4'),
      ],
      previewImages: [
        project3dAsset('sigh/21.webp'),
        project3dAsset('sigh/4.webp'),
        project3dAsset('sigh/Untitled.webp'),
      ],
    },
  },
  {
    theme: 'vending' as ArenaTheme,
    stills: ['vend/render-vending-island.webp', 'vend/render-vending-closeup.webp', 'vend/test.webp'],
    videos: ['vend/vending.mp4'],
    bundle: {
      title: { en: 'Product Island Study', ru: 'Исследование продуктового острова' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Display scene / retail presentation', ru: 'Сцена витрины / презентация продукта' },
      summary: {
        en: 'Exploration of presentation islands and close-up product placement, designed as readable commercial 3D scenes.',
        ru: 'Исследование витринных островов и крупных планов продукта в формате читаемых коммерческих 3D-сцен.',
      },
      metric: { en: 'Wide shots with detail variants', ru: 'Общие планы и детальные варианты' },
      media: [
        project3dAsset('vend/render-vending-island.webp'),
        project3dAsset('vend/vending.mp4'),
        project3dAsset('vend/render-vending-closeup.webp'),
        project3dAsset('vend/test.webp'),
      ],
      previewImages: [
        project3dAsset('vend/render-vending-island.webp'),
        project3dAsset('vend/render-vending-island.webp'),
        project3dAsset('vend/render-vending-closeup.webp'),
        project3dAsset('vend/test.webp'),
      ],
    },
  },
  {
    theme: 'experimental' as ArenaTheme,
    stills: ['cube/render-glass-object.webp', 'cube/Untitled.webp'],
    videos: ['cube/without.mp4'],
    bundle: {
      title: { en: 'Glass Object Study', ru: 'Исследование стеклянного объекта' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Look-dev / translucent materials', ru: 'Look-dev / полупрозрачные материалы' },
      summary: {
        en: 'A folder-based study of glass-like surfaces, soft reflections, and a short turntable-style motion test.',
        ru: 'Папочное исследование стеклянных поверхностей, мягких отражений и короткого turntable-motion теста.',
      },
      metric: { en: 'Stills and motion from one object folder', ru: 'Рендеры и motion из одной папки объекта' },
      media: [
        project3dAsset('cube/render-glass-object.webp'),
        project3dAsset('cube/without.mp4'),
        project3dAsset('cube/Untitled.webp'),
      ],
      previewImages: [
        project3dAsset('cube/render-glass-object.webp'),
        project3dAsset('cube/render-glass-object.webp'),
        project3dAsset('cube/Untitled.webp'),
      ],
    },
  },
  {
    theme: 'experimental' as ArenaTheme,
    stills: ['isometric practise/space.webp', 'isometric practise/space2.webp', 'isometric practise/Untitled12.webp'],
    bundle: {
      title: { en: 'Isometric Practice', ru: 'Изометрическая практика' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Stylized scene studies', ru: 'Стилизованные сценовые этюды' },
      summary: {
        en: 'A set of isometric experiments grouped strictly by folder with spatial composition and atmosphere variations.',
        ru: 'Набор изометрических экспериментов, сгруппированных строго по папке, с вариациями композиции и атмосферы.',
      },
      metric: { en: 'Multiple stills from one scene folder', ru: 'Несколько рендеров из одной папки сцены' },
      media: [
        project3dAsset('isometric practise/space.webp'),
        project3dAsset('isometric practise/space2.webp'),
        project3dAsset('isometric practise/Untitled12.webp'),
      ],
    },
  },
  {
    theme: 'experimental' as ArenaTheme,
    stills: ['duck/strange_duck.webp', 'duck/duck.webp', 'duck/ducky.webp'],
    bundle: {
      title: { en: 'Character Form Study', ru: 'Исследование формы персонажа' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Silhouette / stylization', ru: 'Силуэт / стилизация' },
      summary: {
        en: 'A small stylized creature study kept inside one folder for consistent grouping in the lab overlay.',
        ru: 'Небольшое исследование стилизованного персонажа, оставленное в одной папке для согласованной группировки в overlay.',
      },
      metric: { en: 'Three related stills from one folder', ru: 'Три связанных рендера из одной папки' },
      media: [
        project3dAsset('duck/strange_duck.webp'),
        project3dAsset('duck/duck.webp'),
        project3dAsset('duck/ducky.webp'),
      ],
    },
  },
  {
    theme: 'experimental' as ArenaTheme,
    stills: ['test/cup.webp', 'test/photo_2025-09-23_15-22-46.jpg', 'test/photo_2026-01-03_19-11-42.jpg'],
    bundle: {
      title: { en: 'Small Test Study', ru: 'Небольшой тестовый этюд' },
      year: { en: '2025-2026', ru: '2025-2026' },
      focus: { en: 'Quick object tests / snapshots', ru: 'Быстрые объектные тесты / снапшоты' },
      summary: {
        en: 'A compact test folder kept as a standalone project so every top-level 3D directory is represented in the lab.',
        ru: 'Компактная тестовая папка, оставленная отдельным проектом, чтобы каждая верхнеуровневая 3D-директория была представлена в lab.',
      },
      metric: { en: 'One folder = one project', ru: 'Одна папка = один проект' },
      media: [
        project3dAsset('test/cup.webp'),
        project3dAsset('test/photo_2025-09-23_15-22-46.jpg'),
        project3dAsset('test/photo_2026-01-03_19-11-42.jpg'),
      ],
    },
  },
] as const satisfies readonly ArenaMediaBundleEntry[];
const getArenaEntryCoverAsset = (entry: ArenaMediaBundleEntry) => entry.cover ?? project3dAsset(entry.stills[0]);
const ACT3_GALLERY_ASSETS = ACT3_ARENA_MEDIA_BUNDLES.map(getArenaEntryCoverAsset);
const ACT3_VIDEO_POSTERS: Record<string, string> = {
  [ACT3_INTRO_VIDEO_ASSET]: project3dPosterAsset('0408.webp'),
  [project3dAsset('camera/test.mp4')]: project3dAsset('camera/render-camera-module.webp'),
  [project3dAsset('cd/02.mov')]: project3dAsset('cd/cd.webp'),
  [project3dAsset('vend/vending.mp4')]: project3dAsset('vend/render-vending-island.webp'),
  [project3dAsset('cube/without.mp4')]: project3dAsset('cube/render-glass-object.webp'),
};
const ACT3_AMBIENT_GALLERY_ASSETS: string[] = [];
const buildArenaGalleryMetaMap = () => {
  const map = new Map<string, ArenaGalleryMeta>();
  ACT3_ARENA_MEDIA_BUNDLES.forEach((entry) => {
    const primaryAsset = getArenaEntryCoverAsset(entry);
    const relatedStills = entry.stills
      .map(project3dAsset)
      .filter((candidate) => candidate !== primaryAsset);
    const videoAssets = ('videos' in entry ? entry.videos : []).map(project3dAsset);
    map.set(primaryAsset, {
      asset: primaryAsset,
      theme: entry.theme,
      bundle: entry.bundle,
      relatedStills,
      videos: videoAssets,
    });
  });
  return map;
};
const ACT3_ARENA_GALLERY_META_MAP = buildArenaGalleryMetaMap();
const buildGalleryVideoAssignments = () => {
  const assignments = new Map<string, string | null>();
  ACT3_ARENA_MEDIA_BUNDLES.forEach((entry) => {
    const stillAssets = [getArenaEntryCoverAsset(entry)];
    const videoAssets = ('videos' in entry ? entry.videos : []).map(project3dAsset);
    stillAssets.forEach((asset, index) => {
      assignments.set(asset, videoAssets.length > 0 ? videoAssets[index % videoAssets.length] : null);
    });
  });

  return assignments;
};
const ACT3_GALLERY_VIDEO_ASSIGNMENTS = buildGalleryVideoAssignments();
const buildArenaOverlayMap = () => {
  const map = new Map<string, LabOverlayItem>();
  ACT3_GALLERY_ASSETS.forEach((asset) => {
    const meta = ACT3_ARENA_GALLERY_META_MAP.get(asset);
    if (!meta) {
      map.set(asset, {
        title: { en: '3D Gallery Study', ru: '3D-этюд галереи' },
        year: { en: '2025-2026', ru: '2025-2026' },
        focus: { en: '3D visual study', ru: '3D-визуальный этюд' },
        summary: {
          en: 'A selected 3D still from the arena gallery.',
          ru: 'Выбранный 3D-кадр из галереи арены.',
        },
        metric: { en: 'Arena still set', ru: 'Набор рендеров арены' },
        images: [asset],
        previewImages: [asset],
      });
      return;
    }
    const assignedVideo = ACT3_GALLERY_VIDEO_ASSIGNMENTS.get(asset) ?? null;
    const stills = meta.relatedStills;
    const media = assignedVideo
      ? [asset, assignedVideo, stills[0]].filter(Boolean) as string[]
      : [asset, stills[0], stills[1]].filter(Boolean) as string[];
    map.set(asset, {
      title: meta.bundle.title,
      year: meta.bundle.year,
      focus: meta.bundle.focus,
      summary: meta.bundle.summary,
      metric: meta.bundle.metric,
      images: media.slice(0, MAX_OVERLAY_MEDIA),
      previewImages: media.slice(0, MAX_OVERLAY_MEDIA).map((mediaAsset) => ACT3_VIDEO_POSTERS[mediaAsset] ?? mediaAsset),
    });
  });
  return map;
};
const ACT3_ARENA_OVERLAY_MAP = buildArenaOverlayMap();
const isMobileFallbackDevice = () => {
  if (window.innerWidth >= MOBILE_BREAKPOINT) return false;
  const hasHover = window.matchMedia('(any-hover: hover)').matches;
  const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;
  return !(hasHover && hasFinePointer);
};

type LabAct = 'act1_intro' | 'act2_suction' | 'act3_topview';
type LabCategory = 'hard3d' | 'other3d';
type IntroScreenLayout = { position: THREE.Vector3; width: number; height: number };

const arenaThemeToLabCategory = (theme: ArenaTheme): LabCategory =>
  theme === 'environment' || theme === 'experimental' ? 'other3d' : 'hard3d';
const ACT3_LAB_PROJECTS: SelectedProject[] = ACT3_ARENA_MEDIA_BUNDLES.map((entry) => ({
  title: entry.bundle.title,
  year: entry.bundle.year,
  focus: entry.bundle.focus,
  summary: entry.bundle.summary,
  metric: entry.bundle.metric,
  category: arenaThemeToLabCategory(entry.theme),
  images: entry.bundle.media,
  previewImages: ('previewImages' in entry.bundle ? entry.bundle.previewImages : undefined)
    ?? entry.bundle.media.map((mediaAsset) => ACT3_VIDEO_POSTERS[mediaAsset] ?? mediaAsset),
  repoHref: null,
}));

const DEFAULT_SCREEN_LAYOUT: IntroScreenLayout = {
  position: new THREE.Vector3(0, 1.78, 1.45),
  width: 2.78,
  height: 2.08,
};
const INTRO_DISPLAY_BASE_POS = new THREE.Vector3(15.9, -1.92, -4.22);
const INTRO_DISPLAY_BASE_ROT_Y = -1.56;
const INTRO_DISPLAY_BASE_ROT_X = -0.05;
const INTRO_DISPLAY_BASE_SCALE = 2.18;

const buildFallbackTv = () => {
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x5f534a, roughness: 0.88, metalness: 0.08 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x141117, roughness: 0.38, metalness: 0.18 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xb99463, roughness: 0.34, metalness: 0.22 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb3bccb, roughness: 0.24, metalness: 0.76 });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.7, 2.5), shellMat);
  cabinet.position.set(0, 1.84, 0);
  group.add(cabinet);

  const face = new THREE.Mesh(new THREE.BoxGeometry(4.24, 3.02, 0.26), bezelMat);
  face.position.set(0, 1.83, 1.13);
  group.add(face);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.22, 0.22), trimMat);
  crown.position.set(0, 3.28, 1.22);
  group.add(crown);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.86, 0.16, 0.5), trimMat);
  shelf.position.set(0, 0.46, 1.02);
  group.add(shelf);

  const speakerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.76, 0.08), new THREE.MeshBasicMaterial({ color: 0x241f23 }));
  speakerLeft.position.set(-1.78, 1.72, 1.27);
  const speakerRight = speakerLeft.clone();
  speakerRight.position.x = 1.78;
  group.add(speakerLeft, speakerRight);

  for (let i = 0; i < 7; i += 1) {
    const slotL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.05), trimMat);
    slotL.position.set(-1.78, 1.16 + i * 0.2, 1.31);
    const slotR = slotL.clone();
    slotR.position.x = 1.78;
    group.add(slotL, slotR);
  }

  const knobGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 18);
  for (let i = 0; i < 2; i += 1) {
    const knob = new THREE.Mesh(knobGeo, metalMat);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(1.78, 0.92 + i * 0.32, 1.35);
    group.add(knob);
  }

  const standStem = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.32), shellMat);
  standStem.position.set(0, 0.14, -0.18);
  const standFoot = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.34, 0.12, 24), metalMat);
  standFoot.position.set(0, -0.16, -0.08);
  group.add(standStem, standFoot);

  const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.55, 10);
  const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 14), metalMat);
  antennaBase.position.set(0, 3.64, -0.22);
  const antennaL = new THREE.Mesh(antennaGeo, metalMat);
  antennaL.position.set(-0.34, 4.22, -0.22);
  antennaL.rotation.z = 0.52;
  const antennaR = new THREE.Mesh(antennaGeo, metalMat);
  antennaR.position.set(0.34, 4.22, -0.22);
  antennaR.rotation.z = -0.52;
  group.add(antennaBase, antennaL, antennaR);

  return group;
};

const createPastelGradientTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, '#dff7f2');
  base.addColorStop(0.48, '#dcebff');
  base.addColorStop(1, '#e6dcff');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mintBloom = ctx.createRadialGradient(180, 760, 0, 180, 760, 380);
  mintBloom.addColorStop(0, 'rgba(186, 245, 233, 0.88)');
  mintBloom.addColorStop(0.45, 'rgba(186, 245, 233, 0.34)');
  mintBloom.addColorStop(1, 'rgba(186, 245, 233, 0)');
  ctx.fillStyle = mintBloom;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const blueBloom = ctx.createRadialGradient(540, 520, 0, 540, 520, 420);
  blueBloom.addColorStop(0, 'rgba(226, 244, 255, 0.92)');
  blueBloom.addColorStop(0.52, 'rgba(196, 222, 255, 0.24)');
  blueBloom.addColorStop(1, 'rgba(196, 222, 255, 0)');
  ctx.fillStyle = blueBloom;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lilacBloom = ctx.createRadialGradient(860, 880, 0, 860, 880, 360);
  lilacBloom.addColorStop(0, 'rgba(225, 212, 255, 0.78)');
  lilacBloom.addColorStop(0.55, 'rgba(225, 212, 255, 0.26)');
  lilacBloom.addColorStop(1, 'rgba(225, 212, 255, 0)');
  ctx.fillStyle = lilacBloom;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 36; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 120 + Math.random() * 260;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255,255,255,${0.12 + Math.random() * 0.08})`);
    glow.addColorStop(0.6, `rgba(255,255,255,${0.04 + Math.random() * 0.03})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

const createCrtOverlayTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 3) {
    const alpha = y % 6 === 0 ? 0.12 : 0.06;
    ctx.fillStyle = `rgba(8, 12, 16, ${alpha})`;
    ctx.fillRect(0, y, canvas.width, 1);
  }

  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = 0.008 + Math.random() * 0.02;
    ctx.fillStyle = `rgba(210, 220, 235, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  for (let i = 0; i < 14; i += 1) {
    const y = Math.random() * canvas.height;
    const h = 1 + Math.random() * 3;
    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, `rgba(255,255,255,${0.03 + Math.random() * 0.035})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, canvas.width, h * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createProjectParticleGeometry = (width: number, height: number, cols: number, rows: number) => {
  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const randoms = new Float32Array(count);
  const sizes = new Float32Array(count);

  let ptr3 = 0;
  let ptr2 = 0;
  for (let row = 0; row < rows; row += 1) {
    const v = rows === 1 ? 0.5 : row / (rows - 1);
    for (let col = 0; col < cols; col += 1) {
      const u = cols === 1 ? 0.5 : col / (cols - 1);
      positions[ptr3] = (0.5 - u) * width;
      positions[ptr3 + 1] = 0;
      positions[ptr3 + 2] = (v - 0.5) * height;
      uvs[ptr2] = u;
      uvs[ptr2 + 1] = v;
      const idx = row * cols + col;
      randoms[idx] = Math.random();
      sizes[idx] = 1.55 + Math.random() * 0.46;
      ptr3 += 3;
      ptr2 += 2;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.computeBoundingSphere();
  return geometry;
};

const applyFloorTileScale = (
  points: THREE.Object3D,
  baseWidth: number,
  baseDepth: number,
  targetDepth: number,
  minWidth: number,
  maxWidth: number,
  texture: THREE.Texture,
) => {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const normalizedAspect = Math.max(aspect, 1 / Math.max(aspect, 0.0001));
  const sizeBoost =
    normalizedAspect <= 1.12
      ? 1.22
      : normalizedAspect <= 1.35
        ? 1.12
        : 1;
  const adjustedDepth = targetDepth * sizeBoost;
  const targetWidth = clamp(adjustedDepth * aspect, minWidth, maxWidth);
  points.scale.set(targetWidth / baseWidth, 1, adjustedDepth / baseDepth);
  return { width: targetWidth, depth: adjustedDepth };
};

/* -- component -- */

export default function ThreeDLabPage() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const stored = window.localStorage?.getItem(LANG_STORAGE_KEY);
      return isLang(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  const [act, setAct] = useState<LabAct>('act1_intro');
  const [overlayProject, setOverlayProject] = useState<LabOverlayItem | null>(null);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(() => isMobileFallbackDevice());
  const [isVideoFallbackActive, setIsVideoFallbackActive] = useState(false);
  const [arenaControlsReady, setArenaControlsReady] = useState(false);
  const [arenaIntroProgress, setArenaIntroProgress] = useState(0);
  const [introVisible, setIntroVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('INITIALIZING SYSTEM...');
  const loadProgressRef = useRef(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const actRef = useRef<LabAct>('act1_intro');
  const scrollProgressRef = useRef(0);
  const overlayRef = useRef<LabOverlayItem | null>(null);
  const nearbyProjectRef = useRef<LabOverlayItem | null>(null);
  const isMobileRef = useRef(isMobile);
  const arenaControlsReadyRef = useRef(false);
  const arenaIntroProgressRef = useRef(0);
  const resetToIntroRef = useRef<(() => void) | null>(null);
  const introRevealRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const previousActRef = useRef<LabAct>('act1_intro');
  const suctionStartCameraRef = useRef(new THREE.Vector3(-8.2, 1.7, 12.8));
  const act3EntryCameraRef = useRef(new THREE.Vector3());
  const act3EntryLookRef = useRef(new THREE.Vector3());
  const overflowRestoreRef = useRef<{ html: string; body: string } | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* */ }
  }, [lang]);

  // sync refs
  useEffect(() => { actRef.current = act; }, [act]);
  useEffect(() => { overlayRef.current = overlayProject; }, [overlayProject]);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
  useEffect(() => { arenaControlsReadyRef.current = arenaControlsReady; }, [arenaControlsReady]);
  useEffect(() => { arenaIntroProgressRef.current = arenaIntroProgress; }, [arenaIntroProgress]);

  useEffect(() => {
    let resizeRaf = 0;
    const syncMode = () => {
      const next = isMobileFallbackDevice();
      setIsMobile((prev) => (prev === next ? prev : next));
    };
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        syncMode();
      });
    };
    syncMode();
    window.addEventListener('resize', onResize);
    return () => {
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    setIntroVisible(false);
    introRevealRef.current = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIntroVisible(true);
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, []);

  useLayoutEffect(() => {
    overflowRestoreRef.current = {
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    rootRef.current?.style.setProperty('--lab-scroll-progress', '0');
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'auto';
      scrollContainer.scrollTop = 0;
    }
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    scrollProgressRef.current = 0;
    setAct('act1_intro');
    setFlashOpacity(0);
    setScrollProgress(0);
    setOverlayProject(null);
    nearbyProjectRef.current = null;
    setIntroVisible(false);
    introRevealRef.current = 0;

    return () => {
      const previousOverflow = overflowRestoreRef.current;
      document.documentElement.style.overflow = previousOverflow?.html ?? '';
      document.body.style.overflow = previousOverflow?.body ?? '';
      overflowRestoreRef.current = null;
    };
  }, []);

  const base = import.meta.env.BASE_URL;
  const text = labStoryText[lang];
  const ui = portfolioUi[lang];
  const homeHref = `${base}#archive`;
  const suctionHudT = clamp((scrollProgress - SUCTION_START) / (SUCTION_END - SUCTION_START), 0, 1);
  const suctionHudEase = smoothstep(0, 1, clamp(suctionHudT * 1.45, 0, 1));
  const introTitleOffsetX = act === 'act2_suction' ? lerp(0, -240, suctionHudEase) : 0;
  const introTitleOffsetY = act === 'act2_suction'
    ? lerp(18, 36, suctionHudEase)
    : scrollProgress * 34;
  const introTitleScale = act === 'act2_suction' ? lerp(1, 0.88, suctionHudEase) : 1;
  const introTitleBlur = !introVisible ? 14 : act === 'act2_suction' ? lerp(0, 10, suctionHudEase) : 0;
  const introTitleOpacity = !introVisible
    ? 0
    : act === 'act2_suction'
      ? lerp(0.9, 0.12, suctionHudEase)
      : clamp(1 - (scrollProgress * 0.54), 0.62, 1);

  const labProjects = ACT3_LAB_PROJECTS;
  const mobileProjectSections = useMemo(
    () => [
      {
        id: 'hard3d' as LabCategory,
        title: text.galleryTabs.hard3d,
        projects: labProjects.filter((project) => project.category === 'hard3d'),
      },
      {
        id: 'other3d' as LabCategory,
        title: text.galleryTabs.other3d,
        projects: labProjects.filter((project) => project.category === 'other3d'),
      },
    ].filter((section) => section.projects.length > 0),
    [labProjects, text.galleryTabs.hard3d, text.galleryTabs.other3d],
  );

  /* -- Three.js scene -- */

  useEffect(() => {
    const container = canvasContainerRef.current;
    const scrollContainer = scrollContainerRef.current;
    const scrollContent = scrollContentRef.current;
    if (!container || !scrollContainer || !scrollContent) return;

    let disposed = false;
    setIsVideoFallbackActive(false);

    // simulate early loading progress ticks
    setLoadStage('INITIALIZING WEBGL...');
    setLoadProgress(5);
    loadProgressRef.current = 5;
    const earlyTick = setInterval(() => {
      if (loadProgressRef.current < 30) {
        loadProgressRef.current += 2;
        setLoadProgress(loadProgressRef.current);
      }
    }, 200);
    const earlyTickStopTimeout = window.setTimeout(() => clearInterval(earlyTick), 3000);

    // renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 1.0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileRef.current ? 1.1 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 1.5, 6);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();
    const bgDark = new THREE.Color(0x0c0a0a);
    const bgMid = new THREE.Color(0x2b2326);
    const bgBright = new THREE.Color(0xf1e5dc);
    const bgAct3 = new THREE.Color(0xf3eee6);
    const bgCurrent = new THREE.Color();
    const overlayScene = new THREE.Scene();
    const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const createBloomPass = () => new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.0,
      0.4,
      0.9,
    );
    const createPostFxPass = () => new ShaderPass(new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uNoiseStrength: { value: 0.0015 },
        uVignetteStrength: { value: 0.0 },
        uAberration: { value: 0.0 },
        uWarmth: { value: 0.0 },
        uFogAmount: { value: 0.0 },
      },
      vertexShader: postFxVertex,
      fragmentShader: postFxFragment,
    }));
    const composerLegacy = new EffectComposer(renderer);
    const renderPassLegacy = new RenderPass(scene, camera);
    const bloomPassLegacy = createBloomPass();
    const postFxPassLegacy = createPostFxPass();
    composerLegacy.addPass(renderPassLegacy);
    composerLegacy.addPass(bloomPassLegacy);
    composerLegacy.addPass(postFxPassLegacy);
    const composerAct3 = new EffectComposer(renderer);
    const renderPassAct3 = new RenderPass(scene, camera);
    const bloomPassAct3 = createBloomPass();
    const postFxPassAct3 = createPostFxPass();
    const outputPassAct3 = new OutputPass();
    composerAct3.addPass(renderPassAct3);
    composerAct3.addPass(bloomPassAct3);
    composerAct3.addPass(postFxPassAct3);
    composerAct3.addPass(outputPassAct3);
    const transitionMat = new THREE.ShaderMaterial({
      vertexShader: transitionVertex,
      fragmentShader: transitionFragment,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uWhite: { value: 0 },
        uReveal: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), transitionMat));
    const transitionState = { progress: 0, white: 0, reveal: 1 };
    const act3RevealState = { value: 0 };

    // groups
    const act1Group = new THREE.Group();
    const act2Group = new THREE.Group();
    const act3Group = new THREE.Group();
    act2Group.visible = false;
    act3Group.visible = false;
    scene.add(act1Group, act2Group, act3Group);

    /* === ACT 1 - Retro Computer === */

    const introAmbientLight = new THREE.AmbientLight(0xf2efe8, 0);

    scene.fog = new THREE.FogExp2(0x130e0c, 0.0);

    act1Group.add(introAmbientLight);

    const introDisplayGroup = new THREE.Group();
    introDisplayGroup.position.copy(INTRO_DISPLAY_BASE_POS);
    introDisplayGroup.rotation.x = INTRO_DISPLAY_BASE_ROT_X;
    introDisplayGroup.rotation.y = INTRO_DISPLAY_BASE_ROT_Y;
    introDisplayGroup.scale.setScalar(INTRO_DISPLAY_BASE_SCALE);
    introDisplayGroup.visible = false;
    act1Group.add(introDisplayGroup);

    const fallbackTv = buildFallbackTv();
    fallbackTv.visible = false;
    introDisplayGroup.add(fallbackTv);

    const textureLoader = new THREE.TextureLoader();
    const camTexture = textureLoader.load(ACT3_INTRO_STILL_ASSET);
    camTexture.colorSpace = THREE.SRGBColorSpace;
    camTexture.minFilter = THREE.LinearFilter;
    camTexture.magFilter = THREE.LinearFilter;
    camTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const configureModelScreenTexture = <T extends THREE.Texture>(texture: T) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = false;
      texture.center.set(0, 0);
      texture.rotation = 0;
      texture.offset.set(0, 0);
      texture.repeat.set(1, 1);
      texture.needsUpdate = true;
      return texture;
    };

    const introScreenAssets = labProjects
      .map((project) => getProjectPreview(project))
      .filter((asset): asset is string => Boolean(asset))
      .slice(0, 6);
    const introScreenTextures = introScreenAssets.length > 0
      ? introScreenAssets.map((asset) => {
          const texture = textureLoader.load(asset);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          return texture;
        })
      : [camTexture];
    const modelCamTexture = configureModelScreenTexture(camTexture.clone());
    const modelIntroScreenTextures = introScreenTextures.map((texture) =>
      texture === camTexture ? modelCamTexture : configureModelScreenTexture(texture.clone()),
    );
    const introPosterTexture = textureLoader.load(`${base}projects/posters/3d/0408.webp`);
    introPosterTexture.colorSpace = THREE.SRGBColorSpace;
    introPosterTexture.minFilter = THREE.LinearFilter;
    introPosterTexture.magFilter = THREE.LinearFilter;
    introPosterTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const modelIntroPosterTexture = configureModelScreenTexture(introPosterTexture.clone());
    const dirtTexture = textureLoader.load(`${base}projects/dirt.jpg`);
    const crtOverlayTexture = createCrtOverlayTexture();
    dirtTexture.colorSpace = THREE.SRGBColorSpace;
    dirtTexture.minFilter = THREE.LinearFilter;
    dirtTexture.magFilter = THREE.LinearFilter;
    dirtTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const introVideo = document.createElement('video');
    introVideo.src = ACT3_INTRO_VIDEO_ASSET;
    introVideo.loop = true;
    introVideo.muted = true;
    introVideo.playsInline = true;
    introVideo.autoplay = true;
    introVideo.preload = 'metadata';
    introVideo.poster = `${base}projects/posters/3d/0408.webp`;
    introVideo.crossOrigin = 'anonymous';

    const introVideoTexture = new THREE.VideoTexture(introVideo);
    introVideoTexture.colorSpace = THREE.SRGBColorSpace;
    introVideoTexture.minFilter = THREE.LinearFilter;
    introVideoTexture.magFilter = THREE.LinearFilter;
    const modelVideoTexture = new THREE.VideoTexture(introVideo);
    modelVideoTexture.colorSpace = THREE.SRGBColorSpace;
    modelVideoTexture.minFilter = THREE.LinearFilter;
    modelVideoTexture.magFilter = THREE.LinearFilter;
    modelVideoTexture.flipY = false;
    modelVideoTexture.center.set(0, 0);
    modelVideoTexture.rotation = 0;
    modelVideoTexture.offset.set(0, 0);
    modelVideoTexture.repeat.set(1, 1);
    modelVideoTexture.needsUpdate = true;
    const crtScreenCanvas = document.createElement('canvas');
    crtScreenCanvas.width = 512;
    crtScreenCanvas.height = 512;
    const crtScreenCtx = crtScreenCanvas.getContext('2d');
    const crtScreenTexture = new THREE.CanvasTexture(crtScreenCanvas);
    crtScreenTexture.colorSpace = THREE.SRGBColorSpace;
    crtScreenTexture.minFilter = THREE.LinearFilter;
    crtScreenTexture.magFilter = THREE.LinearFilter;
    const modelCrtScreenTexture = configureModelScreenTexture(crtScreenTexture.clone());
    const drawCrtScreenFrame = (source: CanvasImageSource | null, time: number) => {
      if (!crtScreenCtx) return;
      const { width, height } = crtScreenCanvas;
      crtScreenCtx.clearRect(0, 0, width, height);
      crtScreenCtx.fillStyle = '#050608';
      crtScreenCtx.fillRect(0, 0, width, height);
      if (source) {
        try {
          crtScreenCtx.drawImage(source, 0, 0, width, height);
        } catch {
          // Ignore drawImage failures while assets are still loading.
        }
      }
      crtScreenCtx.fillStyle = 'rgba(122, 126, 130, 0.28)';
      crtScreenCtx.fillRect(0, 0, width, height);
      const topShade = crtScreenCtx.createLinearGradient(0, 0, 0, height * 0.34);
      topShade.addColorStop(0, 'rgba(0,0,0,0.32)');
      topShade.addColorStop(0.38, 'rgba(0,0,0,0.12)');
      topShade.addColorStop(1, 'rgba(0,0,0,0)');
      crtScreenCtx.fillStyle = topShade;
      crtScreenCtx.fillRect(0, 0, width, height * 0.34);
      crtScreenCtx.fillStyle = 'rgba(10, 14, 18, 0.08)';
      for (let y = 0; y < height; y += 3) {
        crtScreenCtx.fillRect(0, y, width, 1);
      }
      for (let i = 0; i < 900; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const a = 0.01 + Math.random() * 0.02;
        crtScreenCtx.fillStyle = `rgba(210,220,235,${a})`;
        crtScreenCtx.fillRect(x, y, 1, 1);
      }
      const vignette = crtScreenCtx.createRadialGradient(width / 2, height / 2, width * 0.16, width / 2, height / 2, width * 0.68);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.68, 'rgba(0,0,0,0.06)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
      crtScreenCtx.fillStyle = vignette;
      crtScreenCtx.fillRect(0, 0, width, height);
      crtScreenTexture.needsUpdate = true;
      modelCrtScreenTexture.needsUpdate = true;
    };

    let screenMat: THREE.MeshBasicMaterial;
    let usingVideoFallback = false;
    let disposedVideoRetry = false;
    const getFallbackScreenTexture = (time = 0) =>
      introScreenTextures[Math.floor(time / SCREEN_CYCLE_SECONDS) % introScreenTextures.length] ?? camTexture;
    const getModelFallbackScreenTexture = (time = 0) =>
      modelIntroScreenTextures[Math.floor(time / SCREEN_CYCLE_SECONDS) % modelIntroScreenTextures.length] ?? modelCamTexture;
    const activateScreenFallback = () => {
      usingVideoFallback = true;
      setIsVideoFallbackActive(true);
      console.info('[3D Lab] TV screen fallback active.');
      if (screenMat.map !== crtScreenTexture) {
        screenMat.map = crtScreenTexture;
        screenMat.needsUpdate = true;
      }
    };
    const activateScreenVideo = () => {
      usingVideoFallback = false;
      setIsVideoFallbackActive(false);
      console.info('[3D Lab] TV screen video active.');
      if (screenMat.map !== crtScreenTexture) {
        screenMat.map = crtScreenTexture;
        screenMat.needsUpdate = true;
      }
    };
    const tryPlayIntroVideo = () =>
      introVideo.play()
        .then(() => activateScreenVideo())
        .catch(() => activateScreenFallback());

    const screenRig = new THREE.Group();
    screenRig.visible = false;
    introDisplayGroup.add(screenRig);

    drawCrtScreenFrame(introPosterTexture.image ?? null, 0);
    screenMat = new THREE.MeshBasicMaterial({ map: crtScreenTexture, color: 0x57606b });
    screenMat.toneMapped = false;
    const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), screenMat);
    const screenFrame = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 1 }),
    );
    screenFrame.visible = false;
    screenFrame.position.z = -0.006;
    screenFrame.renderOrder = 1;
    const screenGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xc6efff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    screenGlass.visible = false;
    screenGlass.position.z = 0.012;
    screenGlass.renderOrder = 3;
    const screenDirt = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: dirtTexture,
        color: 0xfff1d6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    screenDirt.visible = false;
    screenDirt.position.z = 0.02;
    screenDirt.renderOrder = 5;
    const portalHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x8fd5ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    portalHalo.visible = false;
    portalHalo.position.z = -0.01;
    portalHalo.renderOrder = 0;
    const crtLines = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: crtOverlayTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    crtLines.visible = false;
    crtLines.position.z = 0.028;
    crtLines.renderOrder = 6;

    // CRT scanline glow on screen
    const crtGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffcf83,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    crtGlow.visible = false;
    crtGlow.position.z = 0.036;
    crtGlow.renderOrder = 7;
    screenRig.add(screenQuad, screenFrame, screenGlass, crtLines, crtGlow, screenDirt, portalHalo);
    const onIntroVideoError = () => activateScreenFallback();
    const onIntroVideoCanPlay = () => {
      if (!usingVideoFallback) return;
      tryPlayIntroVideo();
    };
    const retryIntroVideoAfterGesture = () => {
      if (disposedVideoRetry) return;
      tryPlayIntroVideo();
    };
    introVideo.addEventListener('error', onIntroVideoError);
    introVideo.addEventListener('canplay', onIntroVideoCanPlay);
    window.addEventListener('pointerdown', retryIntroVideoAfterGesture, { passive: true });
    window.addEventListener('keydown', retryIntroVideoAfterGesture);
    tryPlayIntroVideo();

    const applyScreenLayout = (layout: IntroScreenLayout) => {
      screenRig.position.copy(layout.position);
      screenFrame.scale.set(layout.width * 1.015, layout.height * 1.018, 1);
      screenQuad.scale.set(layout.width, layout.height, 1);
      screenGlass.scale.set(layout.width, layout.height, 1);
      crtLines.scale.set(layout.width, layout.height, 1);
      screenDirt.scale.set(layout.width * 1.03, layout.height * 1.03, 1);
      portalHalo.scale.set(layout.width, layout.height, 1);
      crtGlow.scale.set(layout.width, layout.height, 1);
    };

    applyScreenLayout(DEFAULT_SCREEN_LAYOUT);

    const gltfLoader = new GLTFLoader();
    let introModelRoot: THREE.Object3D | null = null;
    let hasModelScreen = false;
    const modelScreenMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial> = [];
    const modelBodyMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> = [];
    const replacedIntroMaterials = new Set<THREE.Material>();
    const replacedPodMaterials = new Set<THREE.Material>();
    const modelScreenTarget = new THREE.Vector3();
    const screenWorldQuaternion = new THREE.Quaternion();
    const screenForward = new THREE.Vector3();
    const screenRight = new THREE.Vector3();
    const screenUp = new THREE.Vector3();
    const syncModelScreenTexture = (texture: THREE.Texture) => {
      modelScreenMaterials.forEach((material) => {
        if (material.map === texture) return;
        material.map = texture;
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.emissiveMap = texture;
        }
        material.needsUpdate = true;
      });
    };
    let modelLoaded = false;
    let videoReady = false;
    let act3TexturesReady = isMobileRef.current;
    const checkAllLoaded = () => {
      if (modelLoaded && videoReady && act3TexturesReady && !disposed) {
        setLoadStage('READY');
        setLoadProgress(100);
        setTimeout(() => {
          if (!disposed) setIsLoading(false);
        }, 600);
      }
    };

    const onVideoCanPlay = () => {
      if (videoReady) return;
      videoReady = true;
      setLoadStage('VIDEO BUFFER OK');
      loadProgressRef.current = Math.max(loadProgressRef.current, 80);
      setLoadProgress(loadProgressRef.current);
      checkAllLoaded();
    };
    introVideo.addEventListener('canplaythrough', onVideoCanPlay);
    // fallback: if video takes too long, don't block forever
    const videoTimeout = setTimeout(() => {
      if (!videoReady) {
        videoReady = true;
        setLoadStage('VIDEO STREAM READY');
        loadProgressRef.current = Math.max(loadProgressRef.current, 80);
        setLoadProgress(loadProgressRef.current);
        checkAllLoaded();
      }
    }, 8000);

    setLoadStage('LOADING 3D MODEL...');
    gltfLoader.load(
      `${base}projects/cube_tv.glb`,
      (gltf) => {
        if (disposed) {
          // dispose loaded model if component already unmounted
          gltf.scene.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
              obj.geometry.dispose();
              const mat = obj.material;
              if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
              else mat.dispose();
            }
          });
          return;
        }

        let meshCount = 0;
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) meshCount += 1;
        });
        if (meshCount === 0) return;

        introModelRoot = gltf.scene;
        // Use Blender coordinates as-is and reset the wrapper transform.
        introDisplayGroup.position.set(0, 0, 0);
        introDisplayGroup.rotation.set(0, 0, 0);
        introDisplayGroup.scale.setScalar(1);

        introModelRoot.scale.setScalar(1);
        introModelRoot.position.set(0, 0, 0);

        // log model bounds for debugging
        const rawBounds = new THREE.Box3().setFromObject(introModelRoot);
        const rawSize = rawBounds.getSize(new THREE.Vector3());
        const rawCenter = rawBounds.getCenter(new THREE.Vector3());
        console.info('[3D Lab] cube_tv.glb size:', rawSize, 'center:', rawCenter, 'min:', rawBounds.min, 'max:', rawBounds.max);

        // log ALL mesh and material names for debugging
        console.info('[3D Lab] === Model contents ===');
        introModelRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            const matNames = mats.map((m: any) => m.name || '(unnamed)').join(', ');
            console.info(`[3D Lab]   Mesh: "${obj.name}" | Materials: [${matNames}]`);
          } else if (obj instanceof THREE.Light) {
            console.info(`[3D Lab]   Light: "${obj.name}" type=${obj.type} intensity=${(obj as any).intensity}`);
          }
        });
        console.info('[3D Lab] === End model contents ===');

        // process materials: detect screen, keep Blender materials for everything else
        // Also capture screen mesh position BEFORE replacing materials
        let screenMeshRef: THREE.Mesh | null = null;
        introModelRoot.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
          const hasScreenMat = sourceMaterials.some((material) => {
            const materialName = (material.name || '').toLowerCase();
            return materialName.includes('screen')
              || materialName.includes('display')
              || materialName.includes('monitor');
          });
          // also check mesh/object name
          const objName = (obj.name || '').toLowerCase();
          const isScreenObj = hasScreenMat
            || objName.includes('screen')
            || objName.includes('display')
            || objName.includes('monitor');

          if (isScreenObj && !screenMeshRef) {
            screenMeshRef = obj;
            const screenBox = new THREE.Box3().setFromObject(obj);
            const screenCenter = screenBox.getCenter(new THREE.Vector3());
            modelScreenTarget.copy(screenCenter);
            console.info('[3D Lab] Screen mesh found:', obj.name, 'at:', screenCenter);
          }

          const nextMaterials = sourceMaterials.map((material) => {
            const materialName = (material.name || '').toLowerCase();
            const isScreenMaterial = materialName.includes('screen')
              || materialName.includes('display')
              || materialName.includes('monitor');
            if (!isScreenMaterial) {
              const bodyMaterial =
                material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
                  ? material.clone()
                  : new THREE.MeshStandardMaterial();
              replacedIntroMaterials.add(material);
              if (bodyMaterial instanceof THREE.MeshStandardMaterial || bodyMaterial instanceof THREE.MeshPhysicalMaterial) {
                bodyMaterial.roughness = clamp(bodyMaterial.roughness, 0.12, 0.94);
                bodyMaterial.metalness = clamp(bodyMaterial.metalness, 0, 0.82);
                bodyMaterial.envMapIntensity = Math.max(bodyMaterial.envMapIntensity, 0.28);
                bodyMaterial.side = THREE.FrontSide;
                modelBodyMaterials.push(bodyMaterial);
              }
              return bodyMaterial;
            }

            const screenMaterial =
              material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
                ? material.clone()
                : new THREE.MeshStandardMaterial();
            replacedIntroMaterials.add(material);
            screenMaterial.map = modelCrtScreenTexture;
            if (screenMaterial instanceof THREE.MeshStandardMaterial || screenMaterial instanceof THREE.MeshPhysicalMaterial) {
              screenMaterial.color.set(0xffffff);
              screenMaterial.emissive.set(0xffffff);
              screenMaterial.emissiveMap = modelCrtScreenTexture;
              screenMaterial.emissiveIntensity = 1.65;
              screenMaterial.metalness = 0;
              screenMaterial.roughness = 0.72;
              screenMaterial.envMapIntensity = 0.35;
              screenMaterial.toneMapped = false;
            } else {
              screenMaterial.toneMapped = false;
            }
            modelScreenMaterials.push(screenMaterial);
            hasModelScreen = true;
            return screenMaterial;
          });
          obj.material = Array.isArray(obj.material) ? nextMaterials : nextMaterials[0];
        });
        replacedIntroMaterials.forEach((material) => material.dispose());

        if (!screenMeshRef) {
          // fallback: use overall model center
          const fittedBounds = new THREE.Box3().setFromObject(introModelRoot);
          const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
          modelScreenTarget.copy(fittedCenter);
          console.info('[3D Lab] No screen mesh found, using model center:', fittedCenter);
        }

        introModelRoot.traverse((obj) => {
          if (obj instanceof THREE.PointLight || obj instanceof THREE.SpotLight) {
            const originalIntensity = obj.intensity;
            obj.intensity = clamp(originalIntensity * 0.00035, 42, 120);
            obj.distance = 56;
            obj.decay = 1.2;
          } else if (obj instanceof THREE.DirectionalLight) {
            obj.intensity = clamp(obj.intensity * 0.00035, 0.65, 1.8);
          } else if (obj instanceof THREE.AmbientLight || obj instanceof THREE.HemisphereLight) {
            obj.intensity = clamp(obj.intensity * 0.00035, 0.12, 0.5);
          }
        });

        introDisplayGroup.add(introModelRoot);
        introDisplayGroup.visible = true;
        fallbackTv.visible = false;
        introDisplayGroup.worldToLocal(modelScreenTarget);
        const fittedBounds = new THREE.Box3().setFromObject(introModelRoot);
        const fittedSize = fittedBounds.getSize(new THREE.Vector3());

        if (hasModelScreen) {
          console.info('[3D Lab] Found TV screen material in combined model.');
          screenQuad.visible = false;
          screenRig.visible = true;
          applyScreenLayout({
            position: modelScreenTarget.clone(),
            width: clamp(fittedSize.x * 0.525, 2.04, 3.02),
            height: clamp(fittedSize.y * 0.395, 1.52, 2.26),
          });
          syncModelScreenTexture(modelCrtScreenTexture);
        } else {
          console.warn('[3D Lab] TV screen material not found in cube_tv.glb.');
          screenQuad.visible = true;
          screenRig.visible = true;
          applyScreenLayout({
            position: modelScreenTarget.clone(),
            width: clamp(fittedSize.x * 0.525, 2.04, 3.02),
            height: clamp(fittedSize.y * 0.395, 1.52, 2.26),
          });
        }
        modelLoaded = true;
        setLoadStage('3D MODEL LOADED');
        loadProgressRef.current = Math.max(loadProgressRef.current, 60);
        setLoadProgress(loadProgressRef.current);
        checkAllLoaded();
      },
      (xhr) => {
        if (disposed) return;
        if (xhr.lengthComputable) {
          const pct = Math.round((xhr.loaded / xhr.total) * 50);
          loadProgressRef.current = Math.max(loadProgressRef.current, pct);
          setLoadProgress(loadProgressRef.current);
          setLoadStage(`LOADING 3D MODEL... ${pct}%`);
        }
      },
      () => {
        if (disposed) return;
        console.warn('[3D Lab] Failed to load cube_tv.glb. Using fallback TV mesh.');
        introDisplayGroup.visible = true;
        fallbackTv.visible = true;
        screenQuad.visible = true;
        screenRig.visible = true;
        modelLoaded = true;
        loadProgressRef.current = Math.max(loadProgressRef.current, 60);
        setLoadProgress(loadProgressRef.current);
        checkAllLoaded();
      },
    );

    const floorShadow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 48),
      new THREE.MeshBasicMaterial({ color: 0x020204, transparent: true, opacity: 0.08, depthWrite: false }),
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.scale.set(1.8, 0.82, 1);
    floorShadow.position.set(0, -0.55, 0.5);
    floorShadow.visible = false;
    act1Group.add(floorShadow);

    const fireflyCanvas = document.createElement('canvas');
    fireflyCanvas.width = 64;
    fireflyCanvas.height = 64;
    const fireflyCtx = fireflyCanvas.getContext('2d');
    if (fireflyCtx) {
      const fireflyGradient = fireflyCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      fireflyGradient.addColorStop(0, 'rgba(255,255,245,1)');
      fireflyGradient.addColorStop(0.22, 'rgba(255,250,210,0.98)');
      fireflyGradient.addColorStop(0.55, 'rgba(210,255,155,0.36)');
      fireflyGradient.addColorStop(1, 'rgba(0,0,0,0)');
      fireflyCtx.fillStyle = fireflyGradient;
      fireflyCtx.fillRect(0, 0, 64, 64);
    }
    const fireflyTexture = new THREE.CanvasTexture(fireflyCanvas);
    fireflyTexture.colorSpace = THREE.SRGBColorSpace;
    fireflyTexture.wrapS = THREE.ClampToEdgeWrapping;
    fireflyTexture.wrapT = THREE.ClampToEdgeWrapping;

    const SPACE_DUST_COUNT = 4200;
    const spaceDustParticles = Array.from({ length: SPACE_DUST_COUNT }, () => ({
      time: Math.random() * 100,
      factor: 5 + Math.random() * 14,
      speed: 0.001 + Math.random() * 0.0012,
      x: -20 + Math.random() * 40,
      y: -10.5 + Math.random() * 21,
      z: -14 + Math.random() * 28,
    }));
    const spaceDustPositions = new Float32Array(SPACE_DUST_COUNT * 3);
    const spaceDustColors = new Float32Array(SPACE_DUST_COUNT * 3);
    const spaceDustGeo = new THREE.BufferGeometry();
    const spaceDustColor = new THREE.Color();

    spaceDustParticles.forEach((particle, index) => {
      spaceDustPositions[index * 3] = particle.x;
      spaceDustPositions[index * 3 + 1] = particle.y;
      spaceDustPositions[index * 3 + 2] = particle.z;
      spaceDustColor.setHSL(0.16 + Math.random() * 0.08, 0.7, 0.74 + Math.random() * 0.08);
      spaceDustColors[index * 3] = spaceDustColor.r;
      spaceDustColors[index * 3 + 1] = spaceDustColor.g;
      spaceDustColors[index * 3 + 2] = spaceDustColor.b;
    });

    spaceDustGeo.setAttribute('position', new THREE.BufferAttribute(spaceDustPositions, 3));
    spaceDustGeo.setAttribute('color', new THREE.BufferAttribute(spaceDustColors, 3));
    const spaceDustMat = new THREE.PointsMaterial({
      map: fireflyTexture,
      size: 0.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      vertexColors: true,
      sizeAttenuation: true,
      alphaTest: 0.02,
    });
    const spaceDust = new THREE.Points(spaceDustGeo, spaceDustMat);
    spaceDust.frustumCulled = false;
    const spaceDustLight = new THREE.PointLight(0xe6ff9c, 4.2, 24, 2);
    spaceDustLight.position.set(0, 0, 0);
    act1Group.add(spaceDustLight, spaceDust);
    const spaceDustPositionAttr = spaceDustGeo.getAttribute('position') as THREE.BufferAttribute;
    const updateSpaceDust = (lightIntensity: number) => {
      spaceDustLight.intensity = lightIntensity;
      spaceDustParticles.forEach((particle, index) => {
        particle.time += particle.speed;
        const t = particle.time;
        spaceDustPositions[index * 3] =
          particle.x + Math.cos((t / 10) * particle.factor) + (Math.sin(t) * particle.factor) / 10;
        spaceDustPositions[index * 3 + 1] =
          particle.y + Math.sin((t / 10) * particle.factor) + (Math.cos(t * 2) * particle.factor) / 10;
        spaceDustPositions[index * 3 + 2] =
          particle.z + Math.cos((t / 10) * particle.factor) + (Math.sin(t * 3) * particle.factor) / 10;
      });
      spaceDustPositionAttr.needsUpdate = true;
    };

    /* === ACT 2 вЂ” Tunnel Particles === */

    const PARTICLE_COUNT = 2000;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 4;
      pPositions[i * 3] = Math.cos(angle) * radius;
      pPositions[i * 3 + 1] = Math.sin(angle) * radius;
      pPositions[i * 3 + 2] = Math.random() * 30;
      pSizes[i] = 0.3 + Math.random() * 0.8;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: tunnelParticleVertex,
      fragmentShader: tunnelParticleFragment,
      uniforms: {
        uColor: { value: new THREE.Color(0x7bc7ff) },
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const tunnelColorCold = new THREE.Color(0x7bc7ff);
    const tunnelColorWarm = new THREE.Color(0xfff2cf);
    const tunnelAnchor = new THREE.Group();
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.frustumCulled = false;
    tunnelAnchor.add(particles);
    act2Group.add(tunnelAnchor);

    const tunnelRings: THREE.Mesh[] = [];
    const tunnelRingGeo = new THREE.TorusGeometry(2.5, 0.06, 12, 48);
    for (let i = 0; i < 10; i++) {
      const ring = new THREE.Mesh(
        tunnelRingGeo,
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x67b8ff : 0xffcf83,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.position.set(0, 0, 2 - i * 2.8);
      tunnelAnchor.add(ring);
      tunnelRings.push(ring);
    }

    /* === ACT 3 вЂ” Top-View Arena === */

    const arenaBaseFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshBasicMaterial({
        color: 0xefe8de,
        depthWrite: false,
      }),
    );
    arenaBaseFloor.rotation.x = -Math.PI / 2;
    arenaBaseFloor.position.y = -0.12;
    arenaBaseFloor.renderOrder = 0;
    act3Group.add(arenaBaseFloor);

    // arena floor
    const arenaFloorGeo = new THREE.PlaneGeometry(120, 120);
    arenaFloorGeo.rotateX(-Math.PI / 2);
    const arenaFloorMat = new THREE.ShaderMaterial({
      vertexShader: neonGridVertex,
      fragmentShader: arenaGridFragment,
      uniforms: {
        uColor: { value: new THREE.Color(0xd7cfc2) },
        uDensity: { value: 22 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const arenaFloorMesh = new THREE.Mesh(arenaFloorGeo, arenaFloorMat);
    arenaFloorMesh.renderOrder = 1;
    act3Group.add(arenaFloorMesh);

    const roadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ACT3_SPAWN_X, 0, ACT3_SPAWN_Z),
      new THREE.Vector3(1.4, 0, -41.5),
      new THREE.Vector3(-2.1, 0, -29.5),
      new THREE.Vector3(2.8, 0, -17.0),
      new THREE.Vector3(-1.8, 0, -4.5),
      new THREE.Vector3(1.6, 0, 8.0),
      new THREE.Vector3(-1.6, 0, 22.0),
      new THREE.Vector3(1.2, 0, 33.0),
      new THREE.Vector3(0.0, 0, ARENA_HALF - 2.0),
    ]);
    const getRoadFrameAt = (t: number) => {
      const point = roadCurve.getPointAt(clamp(t, 0, 1));
      const tangent = roadCurve.getTangentAt(clamp(t, 0, 1)).setY(0).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      return { point, tangent, normal };
    };
    const getDistributedT = (index: number, total: number, min: number, max: number) =>
      total <= 1 ? (min + max) * 0.5 : lerp(min, max, index / (total - 1));
    const getLaneSlotZ = (index: number, total: number, min: number, max: number) =>
      total <= 1 ? (min + max) * 0.5 : lerp(min, max, index / (total - 1));
    const buildLaneSlotPlan = (projectCount: number, assetCount: number) => {
      const total = projectCount + assetCount;
      const allSlots = Array.from({ length: total }, (_, index) => index);
      const projectSlots = Array.from({ length: projectCount }, (_, index) =>
        Math.max(0, Math.min(total - 1, Math.floor(((index + 1) * (total + 1)) / (projectCount + 1)) - 1)),
      );
      const ambientSlots = allSlots.filter((slot) => !projectSlots.includes(slot));
      return { total, projectSlots, ambientSlots };
    };
    const placePanelInLane = (
      points: THREE.Object3D,
      slotIndex: number,
      totalSlots: number,
      sideOffset: number,
      y: number,
      minZ: number,
      maxZ: number,
    ) => {
      const z = getLaneSlotZ(slotIndex, totalSlots, minZ, maxZ);
      const roadSpan = Math.max((ARENA_HALF - 2.0) - ACT3_SPAWN_Z, 0.001);
      const curveT = clamp((z - ACT3_SPAWN_Z) / roadSpan, 0.04, 0.94);
      const { point } = getRoadFrameAt(curveT);
      const slotT = totalSlots <= 1 ? 0.5 : slotIndex / Math.max(totalSlots - 1, 1);
      const outwardDirection = Math.sign(sideOffset) || 1;
      const laneScatter = clamp(
        0.12 + Math.sin(slotT * Math.PI * 2.1 + outwardDirection * 0.35) * 0.12 + (slotIndex % 2 === 0 ? 0.08 : -0.04),
        0.0,
        0.28,
      );
      points.position.set(point.x + sideOffset + outwardDirection * laneScatter, y, z);
      points.rotation.y = ACT3_PANEL_ROTATION_Y;
    };
    const decorTextures: THREE.Texture[] = [];

    const woodPathGroup = new THREE.Group();
    woodPathGroup.position.y = 0.004;
    act3Group.add(woodPathGroup);

    const objLoader = new OBJLoader();
    const woodTexture = textureLoader.load(`${base}wood/Textura_tabla_1.jpg`);
    woodTexture.colorSpace = THREE.SRGBColorSpace;
    woodTexture.minFilter = THREE.LinearMipmapLinearFilter;
    woodTexture.magFilter = THREE.LinearFilter;
    woodTexture.generateMipmaps = true;
    woodTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    decorTextures.push(woodTexture);

    objLoader.load(`${base}wood/${encodeURIComponent('Planks of wood.obj')}`, (woodObject) => {
      if (disposed) return;

      const sourcePlank = woodObject.children.find((child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry,
      );
      if (!sourcePlank) return;

      const plankGeometry = sourcePlank.geometry.clone();
      plankGeometry.computeBoundingBox();
      const plankBounds = plankGeometry.boundingBox;
      if (!plankBounds) return;

      const plankCenter = plankBounds.getCenter(new THREE.Vector3());
      plankGeometry.translate(-plankCenter.x, -plankBounds.min.y, -plankCenter.z);

      const plankMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.02,
      });
      plankMaterial.envMapIntensity = 0;

      const plankCount = 28;
      const plankScale = new THREE.Vector3(0.42, 0.52, 0.42);

      for (let i = 0; i < plankCount; i += 1) {
        const t = i / Math.max(plankCount - 1, 1);
        const { point, tangent, normal } = getRoadFrameAt(lerp(0.02, 0.96, t));
        const plank = new THREE.Mesh(plankGeometry, plankMaterial);
        plank.position.copy(point);
        plank.scale.copy(plankScale);
        plank.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI * 0.5;
        plank.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.012;
        plank.renderOrder = 2;
        woodPathGroup.add(plank);
      }
    });

    // arena lights
    const arenaAmbient = new THREE.AmbientLight(0xfffbf5, 0.46);
    const arenaHemisphere = new THREE.HemisphereLight(0xffffff, 0xd8d0c4, 0.22);
    const arenaKeyLight = new THREE.DirectionalLight(0xfffcf8, 0.58);
    arenaKeyLight.position.set(14, 34, 10);
    const arenaFillLight = new THREE.DirectionalLight(0xd6ecff, 0.16);
    arenaFillLight.position.set(-18, 18, 20);
    const arenaProjectLight = new THREE.PointLight(0x8ecfff, 0.34, 28, 1.6);
    arenaProjectLight.position.set(0, 5.8, 0);
    act3Group.add(
      arenaAmbient,
      arenaHemisphere,
      arenaKeyLight,
      arenaFillLight,
      arenaProjectLight,
    );

    // hover vehicle
    const podGroup = new THREE.Group();
    const podVisualGroup = new THREE.Group();
    const podFallbackGroup = new THREE.Group();
    const podMat = new THREE.MeshStandardMaterial({ color: 0x7e8b9c, roughness: 0.46, metalness: 0.28, transparent: true, opacity: 0.98 });
    const podBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.46, 10), podMat);
    const podDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0xfafcff, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.48, transmission: 0.16, ior: 1.08 }),
    );
    podDome.position.y = 0.2;
    const podNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.64, 6),
      new THREE.MeshStandardMaterial({ color: 0x6fbfe8, roughness: 0.18, metalness: 0.12 }),
    );
    podNose.rotation.z = Math.PI / 2;
    podNose.position.set(0.92, 0.04, 0);
    const podGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xbfe9ff, opacity: 0.44, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    podGlow.position.y = -0.34;
    podGlow.scale.set(4.2, 1.55, 1);
    podGlow.visible = false;
    const podCabinGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xdff6ff,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    podCabinGlow.position.set(0, 0.46, 0);
    podCabinGlow.visible = false;
    const podCabinLight = new THREE.PointLight(0xcff1ff, 1.2, 3.2, 1.7);
    podCabinLight.position.set(0, 0.46, 0);
    podCabinLight.visible = false;
    const podLight = new THREE.PointLight(0x8ed8ff, 6.4, 24, 2);
    podLight.position.set(0, -0.08, 0);
    const podRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.05, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x8ccfff, transparent: true, opacity: 0.3 }),
    );
    podRing.rotation.x = Math.PI / 2;
    podRing.position.y = -0.06;
    podFallbackGroup.add(podBody, podDome, podNose);
    podVisualGroup.add(podFallbackGroup, podCabinGlow, podCabinLight);
    podLight.visible = false;
    podRing.visible = false;
    podGroup.add(podVisualGroup, podGlow, podLight, podRing);
    podVisualGroup.scale.setScalar(0.72);
    podGroup.position.y = 0.34;
    act3Group.add(podGroup);

    const podShadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 48),
      new THREE.MeshBasicMaterial({ color: 0xb8b2a8, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    podShadowDisc.rotation.x = -Math.PI / 2;
    podShadowDisc.scale.set(1.2, 0.82, 1);
    podShadowDisc.position.set(0, 0.03, 0);
    podShadowDisc.visible = false;
    act3Group.add(podShadowDisc);

    const podModelAnchor = new THREE.Group();
    podVisualGroup.add(podModelAnchor);
    let podModelLoaded = false;
    const podGlassMaterials: THREE.MeshPhysicalMaterial[] = [];
    gltfLoader.load(
      `${base}projects/ufo.glb`,
      (gltf) => {
        if (disposed) {
          gltf.scene.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
              obj.geometry.dispose();
              const mat = obj.material;
              if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
              else mat.dispose();
            }
          });
          return;
        }
        const podModelRoot = gltf.scene;
        const rawBounds = new THREE.Box3().setFromObject(podModelRoot);
        const rawSize = rawBounds.getSize(new THREE.Vector3());
        const rawCenter = rawBounds.getCenter(new THREE.Vector3());
        const scale = 2.05 / Math.max(rawSize.x, rawSize.z, 0.001);

        podModelRoot.scale.setScalar(scale);
        podModelRoot.position.set(-rawCenter.x * scale, -rawBounds.min.y * scale + 0.14, -rawCenter.z * scale);
        podModelRoot.rotation.y = Math.PI;
        podModelRoot.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const meshName = (obj.name || '').toLowerCase();
          const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
          const nextMaterials = sourceMaterials.map((material) => {
            replacedPodMaterials.add(material);
            const sourceColor =
              'color' in material && material.color instanceof THREE.Color
                ? material.color.clone()
                : new THREE.Color(0xffffff);
            const materialName = (material.name || '').toLowerCase();
            const isGlassLike =
              meshName.includes('glass')
              || meshName.includes('dome')
              || meshName.includes('canopy')
              || meshName.includes('window')
              || materialName.includes('glass')
              || materialName.includes('dome')
              || materialName.includes('canopy')
              || materialName.includes('window')
              || ('transparent' in material && Boolean(material.transparent))
              || ('opacity' in material && Number(material.opacity ?? 1) < 0.96);
            const nextMaterial = isGlassLike
              ? new THREE.MeshPhysicalMaterial({
                  color: sourceColor.lerp(new THREE.Color(0xe9f8ff), 0.28),
                  map: 'map' in material ? (material.map ?? null) : null,
                  transparent: true,
                  opacity: clamp('opacity' in material ? Number(material.opacity ?? 0.52) : 0.52, 0.34, 0.7),
                  alphaTest: 'alphaTest' in material ? Number(material.alphaTest ?? 0) : 0,
                  side: 'side' in material ? material.side : THREE.FrontSide,
                  roughness: 0.08,
                  metalness: 0.02,
                  transmission: 0.38,
                  thickness: 0.18,
                  ior: 1.12,
                })
              : new THREE.MeshStandardMaterial({
                  color: sourceColor,
                  map: 'map' in material ? (material.map ?? null) : null,
                  transparent: 'transparent' in material ? Boolean(material.transparent) : false,
                  opacity: 'opacity' in material ? Number(material.opacity ?? 1) : 1,
                  alphaTest: 'alphaTest' in material ? Number(material.alphaTest ?? 0) : 0,
                  side: 'side' in material ? material.side : THREE.FrontSide,
                  roughness: 1,
                  metalness: 0,
                });
            nextMaterial.emissive.set(isGlassLike ? 0x7fdcff : 0x000000);
            nextMaterial.emissiveIntensity = isGlassLike ? 0.16 : 0;
            nextMaterial.envMapIntensity = isGlassLike ? 0.45 : 0;
            if (nextMaterial instanceof THREE.MeshPhysicalMaterial && isGlassLike) {
              podGlassMaterials.push(nextMaterial);
            }
            return nextMaterial;
          });
          obj.material = Array.isArray(obj.material) ? nextMaterials : nextMaterials[0];
        });
        replacedPodMaterials.forEach((material) => material.dispose());

        podFallbackGroup.visible = false;
        podModelAnchor.add(podModelRoot);
        podModelLoaded = true;
      },
      undefined,
      () => {
        console.warn('[3D Lab] Failed to load ufo.glb. Keeping fallback hover pod.');
      },
    );

    // project items
    type ProjectPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> & {
      userData: {
        project: SelectedProject;
        triggerRadius: number;
        previewAsset: string;
        textureLoaded: boolean;
      };
    };
    type ProjectViewItem = {
      project: SelectedProject;
      previewAsset: string;
      points: ProjectPoints;
      textureLoaded: boolean;
      interactionStrength: number;
      interactionPoint: THREE.Vector2;
      wasInsideCore: boolean;
      openHalfW: number;
      openHalfH: number;
      outerHalfW: number;
      outerHalfH: number;
    };
    type GalleryPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    type GalleryDisplayItem = {
      src: string;
      overlayItem: LabOverlayItem;
      points: GalleryPoints;
      textureLoaded: boolean;
      interactionStrength: number;
      interactionPoint: THREE.Vector2;
      outerHalfW: number;
      outerHalfH: number;
      triggerRadius: number;
    };
    const projectItems: ProjectViewItem[] = [];
    const projectTextures: THREE.Texture[] = [];
    const galleryItems: GalleryDisplayItem[] = [];
    const galleryTextures: THREE.Texture[] = [];
    let act3TexturesStarted = false;
    const leftRoadProjects = labProjects.filter((project) => project.category === 'other3d');
    const rightRoadProjects = labProjects.filter((project) => project.category === 'hard3d');
    const leftAmbientAssets = ACT3_AMBIENT_GALLERY_ASSETS.filter((_, index) => index % 2 === 0);
    const rightAmbientAssets = ACT3_AMBIENT_GALLERY_ASSETS.filter((_, index) => index % 2 === 1);
    const featuredTileDepth = 6.1;
    const ambientTileDepth = 4.0;
    const ambientBaseWidth = 6.2;
    const ambientBaseDepth = 4.6;
    const projectLaneConfigs = [
      {
        sideOffset: -ACT3_PROJECT_LANE_OFFSET,
        projects: leftRoadProjects,
        assets: leftAmbientAssets,
        featuredAsset: ACT3_FEATURED_PROJECT_ASSETS.other3d,
      },
      {
        sideOffset: ACT3_PROJECT_LANE_OFFSET,
        projects: rightRoadProjects,
        assets: rightAmbientAssets,
        featuredAsset: ACT3_FEATURED_PROJECT_ASSETS.hard3d,
      },
    ] as const;
    const laneMinZ = ACT3_SPAWN_Z + 10;
    const laneMaxZ = ARENA_HALF - 10;

    projectLaneConfigs.forEach((lane) => {
      const laneSlots = buildLaneSlotPlan(lane.projects.length, lane.assets.length);
      lane.projects.forEach((project, index) => {
        const slotIndex = laneSlots.projectSlots[index] ?? 0;
        const previewAsset = getProjectArenaAsset(project) ?? lane.featuredAsset ?? ACT3_INTRO_STILL_ASSET;

        const pointsMat = new THREE.ShaderMaterial({
          vertexShader: projectParticleVertex,
          fragmentShader: projectParticleFragment,
          uniforms: {
            uTexture: { value: camTexture },
            uTime: { value: 0 },
            uInteractionPoint: { value: new THREE.Vector2(999, 999) },
            uInteractionRadius: { value: 2.35 },
            uInteractionStrength: { value: 0 },
            uRecovery: { value: 1 },
            uOpacity: { value: 0.92 },
            uPointScale: { value: 1.3 },
            uColorGain: { value: 0.96 },
            uGlowGain: { value: 0.0 },
          },
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
        });
        pointsMat.toneMapped = false;

        const points = new THREE.Points(
          createProjectParticleGeometry(PROJECT_PANEL_WIDTH, PROJECT_PANEL_HEIGHT, PROJECT_PARTICLE_COLS, PROJECT_PARTICLE_ROWS),
          pointsMat,
        ) as ProjectPoints;
        placePanelInLane(points, slotIndex, laneSlots.total, lane.sideOffset, 0.125, laneMinZ, laneMaxZ);
        points.scale.set(0.82, 1, featuredTileDepth / PROJECT_PANEL_HEIGHT);
        points.renderOrder = 2;
        points.userData = { project, triggerRadius: 10.5, previewAsset, textureLoaded: false };

        act3Group.add(points);
        projectItems.push({
          project,
          previewAsset,
          points,
          textureLoaded: false,
          interactionStrength: 0,
          interactionPoint: new THREE.Vector2(999, 999),
          wasInsideCore: false,
          openHalfW: PROJECT_PANEL_WIDTH * 0.28,
          openHalfH: PROJECT_PANEL_HEIGHT * 0.26,
          outerHalfW: PROJECT_PANEL_WIDTH * 0.5,
          outerHalfH: PROJECT_PANEL_HEIGHT * 0.5,
        });
      });
      lane.assets.forEach((src, index) => {
        const slotIndex = laneSlots.ambientSlots[index] ?? 0;
        const pointsMat = new THREE.ShaderMaterial({
          vertexShader: projectParticleVertex,
          fragmentShader: projectParticleFragment,
          uniforms: {
            uTexture: { value: camTexture },
            uTime: { value: 0 },
            uInteractionPoint: { value: new THREE.Vector2(999, 999) },
            uInteractionRadius: { value: 2.35 },
            uInteractionStrength: { value: 0 },
            uRecovery: { value: 1 },
            uOpacity: { value: 0.88 },
            uPointScale: { value: 1.42 },
            uColorGain: { value: 1.02 },
            uGlowGain: { value: 0.0 },
          },
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false,
        });
        pointsMat.toneMapped = false;

        const points = new THREE.Points(
          createProjectParticleGeometry(ambientBaseWidth, ambientBaseDepth, GALLERY_PARTICLE_COLS, GALLERY_PARTICLE_ROWS),
          pointsMat,
        ) as GalleryPoints;
        placePanelInLane(points, slotIndex, laneSlots.total, lane.sideOffset, 0.118, laneMinZ, laneMaxZ);
        points.scale.set(0.74, 1, ambientTileDepth / ambientBaseDepth);
        points.renderOrder = 2;
        act3Group.add(points);

        galleryItems.push({
          src,
          overlayItem: ACT3_ARENA_OVERLAY_MAP.get(src) ?? {
            title: { en: '3D Gallery Study', ru: '3D-этюд галереи' },
            year: { en: '2025-2026', ru: '2025-2026' },
            focus: { en: '3D visual study', ru: '3D-визуальный этюд' },
            summary: {
              en: 'Selected still from the 3D arena gallery.',
              ru: 'Выбранный кадр из 3D-галереи арены.',
            },
            metric: { en: 'Single still preview', ru: 'Просмотр отдельного кадра' },
            images: [src],
            previewImages: [src],
          },
          points,
          textureLoaded: false,
          interactionStrength: 0,
          interactionPoint: new THREE.Vector2(999, 999),
          outerHalfW: ambientBaseWidth * 0.5,
          outerHalfH: ambientBaseDepth * 0.5,
          triggerRadius: 9.6,
        });
      });
    });

    const ensureAct3TexturesLoaded = () => {
      if (act3TexturesStarted) return;
      act3TexturesStarted = true;
      if (isMobileRef.current) {
        act3TexturesReady = true;
        checkAllLoaded();
        return;
      }

      const totalTextures = projectItems.length + galleryItems.length;
      if (totalTextures === 0) {
        act3TexturesReady = true;
        checkAllLoaded();
        return;
      }

      let settledTextures = 0;
      const markTextureSettled = () => {
        settledTextures += 1;
        const preloadProgress = Math.round((settledTextures / totalTextures) * 16);
        loadProgressRef.current = Math.max(loadProgressRef.current, 80 + preloadProgress);
        setLoadProgress(loadProgressRef.current);
        setLoadStage(`PRELOADING ARENA IMAGES... ${settledTextures}/${totalTextures}`);
        if (settledTextures >= totalTextures) {
          act3TexturesReady = true;
          setLoadStage('ARENA IMAGES READY');
          loadProgressRef.current = Math.max(loadProgressRef.current, 96);
          setLoadProgress(loadProgressRef.current);
          checkAllLoaded();
        }
      };

      setLoadStage(`PRELOADING ARENA IMAGES... 0/${totalTextures}`);
      projectItems.forEach((item) => {
        if (item.textureLoaded) return;
        const tex = textureLoader.load(
          item.previewAsset,
          (loadedTexture) => {
            const scaledSize = applyFloorTileScale(
              item.points,
              PROJECT_PANEL_WIDTH,
              PROJECT_PANEL_HEIGHT,
              featuredTileDepth,
              ACT3_PROJECT_TILE_MIN_WIDTH,
              ACT3_PROJECT_TILE_MAX_WIDTH,
              loadedTexture,
            );
            item.outerHalfW = scaledSize.width * 0.5;
            item.outerHalfH = scaledSize.depth * 0.5;
            item.openHalfW = scaledSize.width * 0.28;
            item.openHalfH = scaledSize.depth * 0.26;
            item.points.userData.textureLoaded = true;
            item.textureLoaded = true;
            markTextureSettled();
          },
          undefined,
          () => {
            console.warn('[3D Lab] Failed to preload project texture:', item.previewAsset);
            item.points.userData.textureLoaded = false;
            item.textureLoaded = false;
            markTextureSettled();
          },
        );
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = true;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        item.points.material.uniforms.uTexture.value = tex;
        item.points.material.needsUpdate = true;
        projectTextures.push(tex);
      });
      galleryItems.forEach((item) => {
        if (item.textureLoaded) return;
        const tex = textureLoader.load(
          item.src,
          (loadedTexture) => {
            const scaledSize = applyFloorTileScale(
              item.points,
              ambientBaseWidth,
              ambientBaseDepth,
              ambientTileDepth,
              ACT3_AMBIENT_TILE_MIN_WIDTH,
              ACT3_AMBIENT_TILE_MAX_WIDTH,
              loadedTexture,
            );
            item.outerHalfW = scaledSize.width * 0.5;
            item.outerHalfH = scaledSize.depth * 0.5;
            item.textureLoaded = true;
            markTextureSettled();
          },
          undefined,
          () => {
            console.warn('[3D Lab] Failed to preload gallery texture:', item.src);
            item.textureLoaded = false;
            markTextureSettled();
          },
        );
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = true;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        item.points.material.uniforms.uTexture.value = tex;
        item.points.material.needsUpdate = true;
        galleryTextures.push(tex);
      });
    };
    ensureAct3TexturesLoaded();

    /* === Animation State (refs, not React state) === */

    const vehicle = { x: 0, z: 0, vx: 0, vz: 0, angle: 0, speed: 0, yawRate: 0 };
    const cameraFollowState = {
      initialized: false,
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      lookX: 0,
      lookY: 0,
      lookZ: 0,
      yaw: 0,
    };
    const projectProbeLocal = new THREE.Vector3();
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const resetVehicleToSpawn = () => {
      vehicle.x = ACT3_SPAWN_X;
      vehicle.z = ACT3_SPAWN_Z;
      vehicle.vx = 0;
      vehicle.vz = 0;
      vehicle.angle = ACT3_SPAWN_ANGLE;
      vehicle.speed = 0;
      vehicle.yawRate = 0;
      cameraFollowState.initialized = false;
      cameraFollowState.yaw = ACT3_SPAWN_ANGLE;
    };
    const resetToIntro = () => {
      keys.clear();
      resetVehicleToSpawn();
      podVisualGroup.rotation.set(0, 0, 0);
      podVisualGroup.position.y = 0;
      setOverlayProject(null);
      setArenaControlsReady(false);
      setArenaIntroProgress(0);
      setFlashOpacity(0);
      setScrollProgress(0);
      scrollContainer.style.overflowY = 'auto';
      lenisRef.current?.start();
      scrollProgressRef.current = 0;
      introRevealRef.current = 0;
      setIntroVisible(false);
      act3RevealState.value = 0;
      transitionState.progress = 0;
      transitionState.white = 0;
      transitionState.reveal = 1;
      setAct('act1_intro');
      rootRef.current?.style.setProperty('--lab-scroll-progress', '0');
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      scrollContainer.scrollTop = 0;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIntroVisible(true);
        });
      });
    };
    resetToIntroRef.current = resetToIntro;

    /* === Resize === */

    const resize = () => {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      const pixelRatio = Math.min(window.devicePixelRatio, isMobileFallbackDevice() ? 1.1 : 2);
      rootRef.current?.style.setProperty('--vh', `${(h * 0.01).toFixed(4)}px`);
      rootRef.current?.style.setProperty('--vw', `${(w * 0.01).toFixed(4)}px`);
      rootRef.current?.style.setProperty('--page-height', SCROLL_PAGE_HEIGHT.toFixed(4));
      rootRef.current?.style.setProperty('--page-width', SCROLL_PAGE_WIDTH.toFixed(4));
      renderer.setPixelRatio(pixelRatio);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composerLegacy.setPixelRatio(pixelRatio);
      composerLegacy.setSize(w, h);
      bloomPassLegacy.setSize(w, h);
      composerAct3.setPixelRatio(pixelRatio);
      composerAct3.setSize(w, h);
      bloomPassAct3.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const applyInitialIntroFrame = () => {
      act1Group.visible = true;
      act2Group.visible = false;
      act3Group.visible = false;
      spaceDust.visible = true;
      spaceDustLight.visible = true;
      scene.environment = envTarget.texture;
      renderer.toneMappingExposure = 1.24;
      bgCurrent.copy(bgDark);
      scene.fog!.color.set(0x130e0c);
      scene.fog!.density = 0.016;
      renderer.setClearColor(bgCurrent, 1);

      const screenTarget = hasModelScreen
        ? introDisplayGroup.localToWorld(modelScreenTarget.clone())
        : introDisplayGroup.localToWorld(screenRig.position.clone());
      introDisplayGroup.getWorldQuaternion(screenWorldQuaternion);
      screenRight.set(1, 0, 0).applyQuaternion(screenWorldQuaternion).normalize();
      screenUp.set(0, 1, 0).applyQuaternion(screenWorldQuaternion).normalize();
      const idleLookTarget = screenTarget.clone()
        .addScaledVector(screenRight, -1.65)
        .addScaledVector(screenUp, -0.04);

      camera.position.set(15.497, 1.9224, 16.001);
      camera.lookAt(idleLookTarget);
      camera.fov = 40;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    applyInitialIntroFrame();

    /* === Scroll Handler === */

    let scrollRaf = 0;
    let flashTimeout = 0;
    const updateScrollState = (scrollValue: number) => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (actRef.current === 'act3_topview') return;
        const maxScroll = Math.max(scrollContent.scrollHeight - scrollContainer.clientHeight, 1);
        const progress = clamp(scrollValue / maxScroll, 0, 1);
        rootRef.current?.style.setProperty('--lab-scroll-progress', progress.toFixed(4));
        scrollProgressRef.current = progress;
        setScrollProgress((prev) => (Math.abs(prev - progress) > 0.004 ? progress : prev));

        // determine act from scroll
        if (progress < SUCTION_START) {
          if (actRef.current !== 'act1_intro') setAct('act1_intro');
        } else if (progress < SUCTION_END) {
          if (actRef.current !== 'act2_suction') setAct('act2_suction');
        }

        if (progress >= SUCTION_START) {
          const suctionT = clamp((progress - SUCTION_START) / (SUCTION_END - SUCTION_START), 0, 1);
          setFlashOpacity(0);

          if (suctionT >= 0.99 && actRef.current !== 'act3_topview') {
            // transition to act3
            keys.clear();
          setOverlayProject(null);
          ensureAct3TexturesLoaded();
          act3RevealState.value = 0;
          setArenaIntroProgress(0);
          resetVehicleToSpawn();
          act3EntryCameraRef.current.copy(camera.position);
          act3EntryLookRef.current.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
          setArenaControlsReady(false);
          setAct('act3_topview');
          setFlashOpacity(0);
          setScrollProgress(1);
            if (isMobileRef.current) {
              scrollContainer.style.overflowY = 'auto';
              lenisRef.current?.start();
            } else {
              scrollContainer.style.overflowY = 'hidden';
              lenisRef.current?.stop();
            }
            // fade out flash after brief hold
            if (flashTimeout) window.clearTimeout(flashTimeout);
            flashTimeout = window.setTimeout(() => { if (!disposed) setFlashOpacity(0); }, 10);
          }
        } else {
          setFlashOpacity(0);
        }
      });
    };
    const lenis = new Lenis({
      wrapper: scrollContainer,
      content: scrollContent,
      smoothWheel: true,
      lerp: 0.09,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.0,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    const onLenisScroll = (event: { scroll: number }) => {
      updateScrollState(event.scroll);
    };
    lenis.on('scroll', onLenisScroll);
    lenis.scrollTo(0, { immediate: true, force: true });

    let lenisRaf = 0;
    const runLenis = (time: number) => {
      if (disposed) return;
      lenis.raf(time);
      lenisRaf = requestAnimationFrame(runLenis);
    };
    lenisRaf = requestAnimationFrame(runLenis);
    updateScrollState(0);

    /* === Keyboard === */

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        actRef.current === 'act3_topview' &&
        !isMobileRef.current &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }
      keys.add(e.code);
      if (e.code === 'Escape' && actRef.current === 'act3_topview') {
        if (overlayRef.current) {
          setOverlayProject(null);
        } else {
          resetToIntro();
        }
      }
      if (
        e.code === 'KeyE' &&
        actRef.current === 'act3_topview' &&
        !isMobileRef.current &&
        !overlayRef.current &&
        nearbyProjectRef.current
      ) {
        setOverlayProject(nearbyProjectRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    /* === Animation Loop === */

    let rafId = 0;

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const currentAct = actRef.current;
      if (previousActRef.current !== currentAct) {
        if (currentAct === 'act2_suction') {
          suctionStartCameraRef.current.copy(camera.position);
        }
        previousActRef.current = currentAct;
      }
      const sp = scrollProgressRef.current;

      // visibility
      act1Group.visible = currentAct === 'act1_intro' || currentAct === 'act2_suction';
      act2Group.visible = false;
      act3Group.visible = currentAct === 'act3_topview' && !isMobileRef.current;
      spaceDust.visible = currentAct === 'act1_intro' || currentAct === 'act2_suction';
      spaceDustLight.visible = currentAct === 'act1_intro' || currentAct === 'act2_suction';
      if (currentAct === 'act1_intro') {
        scene.environment = envTarget.texture;
        renderer.toneMappingExposure = 1.24;
        bgCurrent.copy(bgDark);
        scene.fog!.color.set(0x130e0c);
        scene.fog!.density = 0.016;
      } else if (currentAct === 'act2_suction') {
        scene.environment = envTarget.texture;
        renderer.toneMappingExposure = 1.24;
        bgCurrent.copy(bgDark);
        scene.fog!.color.set(0x130e0c);
        scene.fog!.density = 0.016;
      } else {
        scene.environment = null;
        renderer.toneMappingExposure = 1.0;
        bgCurrent.copy(bgAct3);
        scene.fog!.color.set(0xf3ede4);
        scene.fog!.density = 0.0016;
      }
      const clearAlpha = 1.0;
      renderer.setClearColor(bgCurrent, clearAlpha);
      transitionMat.uniforms.uTime.value = elapsed;
      postFxPassLegacy.uniforms.uTime.value = elapsed;
      postFxPassAct3.uniforms.uTime.value = elapsed;

      const screenTarget = hasModelScreen
        ? introDisplayGroup.localToWorld(modelScreenTarget.clone())
        : introDisplayGroup.localToWorld(screenRig.position.clone());
      introDisplayGroup.getWorldQuaternion(screenWorldQuaternion);
      screenForward.set(0, 0, 1).applyQuaternion(screenWorldQuaternion).normalize();
      screenRight.set(1, 0, 0).applyQuaternion(screenWorldQuaternion).normalize();
      screenUp.set(0, 1, 0).applyQuaternion(screenWorldQuaternion).normalize();
      const idleLookTarget = screenTarget.clone()
        .addScaledVector(screenRight, -1.65)
        .addScaledVector(screenUp, -0.04);
      const screenSourceTexture = usingVideoFallback ? getFallbackScreenTexture(elapsed) : introVideoTexture;
      const screenSource = usingVideoFallback
        ? ((screenSourceTexture.image as CanvasImageSource | undefined) ?? (introPosterTexture.image as CanvasImageSource | undefined) ?? null)
        : (introVideo.readyState >= 2 ? introVideo : ((introPosterTexture.image as CanvasImageSource | undefined) ?? null));
      drawCrtScreenFrame(screenSource, elapsed);
      if (hasModelScreen) {
        syncModelScreenTexture(modelCrtScreenTexture);
      } else if (screenMat.map !== crtScreenTexture) {
        screenMat.map = crtScreenTexture;
        screenMat.needsUpdate = true;
      }

      if (currentAct === 'act1_intro') {
        introRevealRef.current = Math.min(introRevealRef.current + delta / 1.8, 1);
        transitionState.progress = Math.max(transitionState.progress - delta * 2.8, 0);
        transitionState.white = Math.max(transitionState.white - delta * 3.2, 0);
        transitionState.reveal = 1;
        act3RevealState.value = 0;
        portalHalo.visible = false;
        screenGlass.visible = false;
        crtLines.visible = true;
        screenDirt.visible = false;
        crtGlow.visible = true;
        screenRig.visible = true;
        screenQuad.visible = !hasModelScreen;
        screenFrame.visible = false;
        portalHalo.material.opacity = 0;
        screenGlass.material.opacity = 0;
        (crtLines.material as THREE.MeshBasicMaterial).opacity = 0.18;
        (crtLines.material as THREE.MeshBasicMaterial).map.offset.y = (elapsed * 0.035) % 1;
        (screenDirt.material as THREE.MeshBasicMaterial).opacity = 0;
        crtGlow.material.opacity = 0.035;

        // camera idle + scroll push
        const scrollFrac = clamp(sp / ACT1_END, 0, 1);
        const introReveal = introRevealRef.current;
        const introEase = 1 - Math.pow(1 - introReveal, 3);
        bloomPassLegacy.strength = 0.04;
        bloomPassLegacy.radius = 0.16;
        bloomPassLegacy.threshold = 0.9;
        postFxPassLegacy.uniforms.uNoiseStrength.value = 0.0015;
        postFxPassLegacy.uniforms.uVignetteStrength.value = 0.0;
        postFxPassLegacy.uniforms.uAberration.value = 0.0;
        postFxPassLegacy.uniforms.uWarmth.value = 0.0;
        postFxPassLegacy.uniforms.uFogAmount.value = 0.0;
        // camera вЂ” exact Blender "TrueIsoCam" position (converted from Z-up to Y-up)
        // Blender: X=15.497 Y=-16.001 Z=1.9224 в†’ Three.js: X=15.497 Y=1.9224 Z=16.001
        const blenderCamX = 15.497;
        const blenderCamY = 1.9224;
        const blenderCamZ = 16.001;
        const camX = blenderCamX + Math.sin(elapsed * 0.22) * 0.01;
        const camY = blenderCamY + Math.sin(elapsed * 0.36) * 0.008;
        const camZ = blenderCamZ + Math.cos(elapsed * 0.26) * 0.01;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(idleLookTarget);
        camera.fov = lerp(40, lerp(38, 40, scrollFrac), introEase);
        camera.updateProjectionMatrix();

        // subtle idle bob вЂ” model stays at Blender origin
        introDisplayGroup.rotation.x = lerp(-0.02, 0, introEase) + Math.sin(elapsed * 0.28) * 0.004;
        introDisplayGroup.rotation.y = Math.sin(elapsed * 0.32) * 0.008;
        introDisplayGroup.position.x = Math.sin(elapsed * 0.22) * 0.012;
        introDisplayGroup.position.y = lerp(0.1, 0, introEase) + Math.sin(elapsed * 0.55) * 0.008;
        introDisplayGroup.position.z = lerp(0.3, 0, introEase) + Math.cos(elapsed * 0.26) * 0.012;
        introDisplayGroup.scale.setScalar(lerp(0.985, 1, introEase));
        screenRig.scale.setScalar(1);
        introAmbientLight.intensity = lerp(0.1, 0.06, introEase);
        updateSpaceDust(lerp(4.2, 3.6, introEase));
        modelBodyMaterials.forEach((material) => {
          material.emissiveIntensity = lerp(0.18, 0.12, introEase);
        });
      } else if (currentAct === 'act2_suction') {
        introRevealRef.current = 1;
        const suctionT = clamp((sp - SUCTION_START) / (SUCTION_END - SUCTION_START), 0, 1);
        const suctionEase = smoothstep(0, 1, suctionT);
        const alignT = smoothstep(0.0, 0.42, suctionEase);
        const approachT = smoothstep(0.06, 1.0, suctionEase);
        if (suctionT >= 0.35) {
          ensureAct3TexturesLoaded();
        }
        const portalT = smoothstep(0.54, 0.96, suctionEase);
        const impactT = smoothstep(0.82, 1.0, suctionEase);
        const portalPulse = (0.5 + 0.5 * Math.sin(elapsed * (10.0 + portalT * 14.0))) * portalT;
        transitionState.progress = portalT;
        transitionState.white = impactT * 0.88;
        transitionState.reveal = 0;
        bloomPassLegacy.strength = lerp(0.04, 0.26, portalT) + impactT * 0.32;
        bloomPassLegacy.radius = lerp(0.16, 0.5, portalT) + impactT * 0.16;
        bloomPassLegacy.threshold = lerp(0.9, 0.58, portalT);
        postFxPassLegacy.uniforms.uNoiseStrength.value = lerp(0.0015, 0.015, portalT) + impactT * 0.018;
        postFxPassLegacy.uniforms.uVignetteStrength.value = lerp(0.0, 0.34, portalT);
        postFxPassLegacy.uniforms.uAberration.value = lerp(0.0, 0.0019, portalT) + impactT * 0.0016;
        postFxPassLegacy.uniforms.uWarmth.value = lerp(0.0, 0.08, portalT);
        postFxPassLegacy.uniforms.uFogAmount.value = lerp(0.0, 0.06, portalT);
        portalHalo.visible = true;
        screenGlass.visible = true;
        crtLines.visible = true;
        screenDirt.visible = false;
        crtGlow.visible = true;
        screenFrame.visible = false;
        portalHalo.material.opacity = lerp(0.0, 0.34, portalT) + impactT * 0.18;
        screenGlass.material.opacity = lerp(0.0, 0.18, portalT) + impactT * 0.08;
        (crtLines.material as THREE.MeshBasicMaterial).opacity = lerp(0.18, 0.42, portalT) + impactT * 0.12;
        (crtLines.material as THREE.MeshBasicMaterial).map.offset.y = (elapsed * (0.035 + portalT * 0.42 + impactT * 0.55)) % 1;
        (screenDirt.material as THREE.MeshBasicMaterial).opacity = 0;
        crtGlow.material.opacity = lerp(0.035, 0.18, portalT) + impactT * 0.16;
        screenRig.visible = true;
        screenQuad.visible = !hasModelScreen;
        introAmbientLight.intensity = 0.06;
        updateSpaceDust(3.2);
        const portalScale = 1.0 + portalT * 0.18 + portalPulse * 0.1 + impactT * 0.08;
        portalHalo.scale.set(screenQuad.scale.x * portalScale, screenQuad.scale.y * portalScale, 1);
        const glassScale = 1.0 + portalT * 0.025;
        screenGlass.scale.set(screenQuad.scale.x * glassScale, screenQuad.scale.y * glassScale, 1);

        // Simple scroll-driven push into the screen.
        const startPosition = suctionStartCameraRef.current;
        const alignedEntryStart = screenTarget.clone()
          .addScaledVector(screenForward, 8.4)
          .addScaledVector(screenRight, -0.08)
          .addScaledVector(screenUp, 0.05);
        const axisPosition = startPosition.clone().lerp(alignedEntryStart, alignT);
        const entryDistance = lerp(8.4, 0.35, smoothstep(0, 1, approachT));
        const entryPosition = screenTarget.clone()
          .addScaledVector(screenForward, entryDistance)
          .addScaledVector(screenRight, -0.01 * (1 - approachT))
          .addScaledVector(screenUp, 0.01 * (1 - approachT));
        const cameraPosition = axisPosition.lerp(entryPosition, approachT);
        camera.position.copy(cameraPosition);
        const alignedLookTarget = screenTarget.clone()
          .addScaledVector(screenRight, -0.4)
          .addScaledVector(screenUp, -0.02);
        const closeLookTarget = screenTarget.clone()
          .addScaledVector(screenForward, 0.04)
          .addScaledVector(screenRight, -0.004 * (1 - approachT))
          .addScaledVector(screenUp, 0.004 * (1 - approachT));
        const focusTarget = idleLookTarget.clone()
          .lerp(alignedLookTarget, alignT)
          .lerp(closeLookTarget, smoothstep(0.18, 1.0, approachT));
        const impactShake = impactT * impactT * 0.06;
        camera.position.x += Math.sin(elapsed * 42.0) * impactShake;
        camera.position.y += Math.cos(elapsed * 39.0) * impactShake * 0.5;
        camera.position.z += Math.sin(elapsed * 33.0 + 1.7) * impactShake;
        camera.lookAt(focusTarget);
        camera.fov = lerp(40, 50, smoothstep(0, 1, approachT)) + impactT * 3.6;
        camera.updateProjectionMatrix();

        introDisplayGroup.rotation.x = lerp(introDisplayGroup.rotation.x, -0.008, clamp((1.4 + approachT * 1.2) * delta, 0, 1));
        introDisplayGroup.rotation.y = lerp(introDisplayGroup.rotation.y, 0.0, clamp((1.2 + approachT * 1.6) * delta, 0, 1));
        introDisplayGroup.position.x = lerp(introDisplayGroup.position.x, 0.0, clamp(1.8 * delta, 0, 1));
        introDisplayGroup.position.y = lerp(introDisplayGroup.position.y, 0.02, clamp((1.0 + approachT) * delta, 0, 1));
        introDisplayGroup.position.z = lerp(introDisplayGroup.position.z, 0.0, clamp(1.5 * delta, 0, 1));
        introDisplayGroup.scale.setScalar(lerp(introDisplayGroup.scale.x, 1.03 + portalT * 0.02 + impactT * 0.02, clamp((1.2 + approachT) * delta, 0, 1)));
        screenRig.scale.setScalar(lerp(screenRig.scale.x, 1.06 + portalT * 0.03 + portalPulse * 0.02, clamp((1.4 + approachT) * delta, 0, 1)));
        floorShadow.material.opacity = 0;
        tunnelAnchor.visible = false;

      } else if (currentAct === 'act3_topview') {
        introAmbientLight.intensity = 0;
        transitionState.progress = 1;
        transitionState.white = Math.max(transitionState.white - delta * 1.08, 0);
        transitionState.reveal = Math.min(transitionState.reveal + delta * 0.82, 1);
        act3RevealState.value = Math.min(act3RevealState.value + delta * 0.82, 1);
        if (Math.abs(arenaIntroProgressRef.current - act3RevealState.value) > 0.02 || act3RevealState.value >= 0.999) {
          arenaIntroProgressRef.current = act3RevealState.value;
          setArenaIntroProgress(act3RevealState.value);
        }
        const act3ControlReady = act3RevealState.value >= ACT3_CONTROL_UNLOCK;
        if (arenaControlsReadyRef.current !== act3ControlReady) {
          arenaControlsReadyRef.current = act3ControlReady;
          setArenaControlsReady(act3ControlReady);
        }
        bgCurrent.copy(bgAct3);
        scene.fog!.color.set(0xf0e9df);
        scene.fog!.density = 0.0024;
        bloomPassAct3.strength = 0.012;
        bloomPassAct3.radius = 0.08;
        bloomPassAct3.threshold = 0.98;
        postFxPassAct3.uniforms.uNoiseStrength.value = 0.0;
        postFxPassAct3.uniforms.uVignetteStrength.value = 0.0;
        postFxPassAct3.uniforms.uAberration.value = 0.0;
        postFxPassAct3.uniforms.uWarmth.value = 0.0;
        postFxPassAct3.uniforms.uFogAmount.value = 0.0;
        portalHalo.visible = false;
        screenGlass.visible = false;
        screenDirt.visible = false;
        crtLines.visible = false;
        portalHalo.material.opacity = 0;
        screenGlass.material.opacity = 0;

        if (isMobileRef.current) {
          camera.position.set(0, 1.5, 6);
          camera.lookAt(0, 1.3, 0);
          camera.fov = 50;
          camera.updateProjectionMatrix();
          renderer.clear();
          composerAct3.render();
          return;
        }

        // vehicle movement (tank controls) is desktop-only
        if (!isMobileRef.current && act3ControlReady && !overlayRef.current) {
          let inputThrottle = 0;
          if (keys.has('KeyW') || keys.has('ArrowUp')) inputThrottle += 1;
          if (keys.has('KeyS') || keys.has('ArrowDown')) inputThrottle -= 1;

          let inputSteer = 0;
          if (keys.has('KeyA') || keys.has('ArrowLeft')) inputSteer += 1;
          if (keys.has('KeyD') || keys.has('ArrowRight')) inputSteer -= 1;

          const boosting = keys.has('ShiftLeft') || keys.has('ShiftRight');
          const maxForwardSpeed = MAX_SPEED * (boosting ? BOOST_MULT : 1);
          const maxReverseSpeed = maxForwardSpeed * REVERSE_MULT;
          const targetSpeed = inputThrottle >= 0
            ? inputThrottle * maxForwardSpeed
            : inputThrottle * maxReverseSpeed;
          const targetYawRate = inputSteer * MAX_STEER_RATE;

          const speedResponse = inputThrottle !== 0 ? ACCEL * delta : FRICTION * delta;
          vehicle.speed = lerp(vehicle.speed, targetSpeed, clamp(speedResponse, 0, 1));
          if (Math.abs(inputThrottle) < 0.001 && Math.abs(vehicle.speed) < 0.02) vehicle.speed = 0;

          const yawResponse = inputSteer !== 0 ? YAW_RESPONSE * 0.78 * delta : FRICTION * 0.9 * delta;
          vehicle.yawRate = lerp(vehicle.yawRate, targetYawRate, clamp(yawResponse, 0, 1));
          if (Math.abs(inputSteer) < 0.001 && Math.abs(vehicle.yawRate) < 0.01) vehicle.yawRate = 0;

          vehicle.angle += vehicle.yawRate * delta;
          vehicle.angle = Math.atan2(Math.sin(vehicle.angle), Math.cos(vehicle.angle));

          const forwardX = Math.sin(vehicle.angle);
          const forwardZ = Math.cos(vehicle.angle);
          vehicle.vx = forwardX * vehicle.speed;
          vehicle.vz = forwardZ * vehicle.speed;

          vehicle.x += vehicle.vx * delta;
          vehicle.z += vehicle.vz * delta;
          vehicle.x = clamp(vehicle.x, -ARENA_HALF, ARENA_HALF);
          vehicle.z = clamp(vehicle.z, -ARENA_HALF, ARENA_HALF);
        } else {
          vehicle.speed = lerp(vehicle.speed, 0, clamp(FRICTION * 1.15 * delta, 0, 1));
          vehicle.yawRate = lerp(vehicle.yawRate, 0, clamp(FRICTION * delta, 0, 1));
        }

        const revealT = smoothstep(0, 1, act3RevealState.value);
        const portalExitBlend = smoothstep(0.0, 0.3, revealT);
        const topDownBlend = smoothstep(0.18, 0.78, revealT);
        const freeRoamBlend = smoothstep(0.9, 1, act3RevealState.value);
        galleryItems.forEach((item) => {
          item.points.material.uniforms.uTime.value = elapsed;
          item.points.material.uniforms.uOpacity.value = lerp(
            item.points.material.uniforms.uOpacity.value,
            0.9 + revealT * 0.08,
            clamp(4.4 * delta, 0, 1),
          );
        });

        // update vehicle visuals
        podVisualGroup.rotation.set(0, 0, 0);
        podVisualGroup.position.y = 0;
        podGroup.position.set(vehicle.x, 0.34, vehicle.z);
        podGroup.rotation.y = vehicle.angle;
        podShadowDisc.position.set(vehicle.x, 0.03, vehicle.z);
        const shadowMat = podShadowDisc.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = 0;
        const podGlowMat = podGlow.material as THREE.SpriteMaterial;
        podGlowMat.opacity = 0;
        const podCabinGlowMat = podCabinGlow.material as THREE.MeshBasicMaterial;
        const cabinPulse = 0.7 + 0.3 * Math.sin(elapsed * 2.3 + 0.6);
        const cabinGlowBase = lerp(0.18, 0.32, revealT) * cabinPulse;
        podCabinGlowMat.opacity = cabinGlowBase;
        podCabinGlow.scale.setScalar(lerp(0.78, 0.94, cabinPulse));
        podCabinGlow.visible = true;
        podCabinLight.intensity = lerp(0.8, 1.45, revealT) * cabinPulse;
        podCabinLight.distance = lerp(2.3, 3.1, revealT);
        podCabinLight.visible = true;
        podGlassMaterials.forEach((material) => {
          material.emissiveIntensity = lerp(material.emissiveIntensity, 0.14 + cabinPulse * 0.12, clamp(6.4 * delta, 0, 1));
          material.opacity = lerp(material.opacity, 0.42 + cabinPulse * 0.06, clamp(4.6 * delta, 0, 1));
        });
        podLight.intensity = podModelLoaded ? 0 : 0;
        const podRingMat = podRing.material as THREE.MeshBasicMaterial;
        podRingMat.opacity = 0;
        podLight.visible = false;
        podGlow.visible = false;
        podRing.visible = false;
        podShadowDisc.visible = false;

        // Start top-down, then hand over to the free-roam follow camera.
        const camDistance = lerp(15.2, 13.2, revealT);
        const camHeight = lerp(29.0, 22.4, revealT);
        const lookAhead = lerp(2.8, 4.0, revealT);
        const targetCameraYaw = vehicle.angle;
        cameraFollowState.yaw = targetCameraYaw;
        const followX = Math.sin(cameraFollowState.yaw);
        const followZ = Math.cos(cameraFollowState.yaw);
        const targetCamX = vehicle.x - followX * camDistance;
        const targetCamY = camHeight;
        const targetCamZ = vehicle.z - followZ * camDistance;
        const targetLookX = vehicle.x + Math.sin(vehicle.angle) * lookAhead;
        const targetLookY = lerp(0.1, 1.0, revealT);
        const targetLookZ = vehicle.z + Math.cos(vehicle.angle) * lookAhead;

        if (!cameraFollowState.initialized) {
          cameraFollowState.initialized = true;
          cameraFollowState.x = targetCamX;
          cameraFollowState.y = targetCamY;
          cameraFollowState.z = targetCamZ;
          cameraFollowState.lookX = targetLookX;
          cameraFollowState.lookY = targetLookY;
          cameraFollowState.lookZ = targetLookZ;
        } else {
          const posLerp = clamp(CAMERA_POS_RESPONSE * delta, 0, 1);
          const lookLerp = clamp(CAMERA_LOOK_RESPONSE * delta, 0, 1);
          cameraFollowState.x = lerp(cameraFollowState.x, targetCamX, posLerp);
          cameraFollowState.y = lerp(cameraFollowState.y, targetCamY, posLerp);
          cameraFollowState.z = lerp(cameraFollowState.z, targetCamZ, posLerp);
          cameraFollowState.lookX = lerp(cameraFollowState.lookX, targetLookX, lookLerp);
          cameraFollowState.lookY = lerp(cameraFollowState.lookY, targetLookY, lookLerp);
          cameraFollowState.lookZ = lerp(cameraFollowState.lookZ, targetLookZ, lookLerp);
        }

        const portalExitCamX = lerp(act3EntryCameraRef.current.x, vehicle.x, portalExitBlend * 0.4);
        const portalExitCamY = lerp(act3EntryCameraRef.current.y, 12.5, portalExitBlend);
        const portalExitCamZ = lerp(act3EntryCameraRef.current.z, vehicle.z + 8.0, portalExitBlend);
        const portalExitLookX = lerp(act3EntryLookRef.current.x, vehicle.x, portalExitBlend);
        const portalExitLookY = lerp(act3EntryLookRef.current.y, 0.9, portalExitBlend);
        const portalExitLookZ = lerp(act3EntryLookRef.current.z, vehicle.z, portalExitBlend);

        const topDownCamX = vehicle.x;
        const topDownCamY = lerp(52, 36, revealT);
        const topDownCamZ = vehicle.z + 0.001;
        const topDownLookX = vehicle.x;
        const topDownLookY = 0.6;
        const topDownLookZ = vehicle.z;

        const stagedCamX = lerp(portalExitCamX, topDownCamX, topDownBlend);
        const stagedCamY = lerp(portalExitCamY, topDownCamY, topDownBlend);
        const stagedCamZ = lerp(portalExitCamZ, topDownCamZ, topDownBlend);
        const stagedLookX = lerp(portalExitLookX, topDownLookX, topDownBlend);
        const stagedLookY = lerp(portalExitLookY, topDownLookY, topDownBlend);
        const stagedLookZ = lerp(portalExitLookZ, topDownLookZ, topDownBlend);

        camera.position.set(
          lerp(
            stagedCamX,
            cameraFollowState.x,
            freeRoamBlend,
          ),
          lerp(
            stagedCamY,
            cameraFollowState.y,
            freeRoamBlend,
          ),
          lerp(
            stagedCamZ,
            cameraFollowState.z,
            freeRoamBlend,
          ),
        );
        camera.lookAt(
          lerp(
            stagedLookX,
            cameraFollowState.lookX,
            freeRoamBlend,
          ),
          lerp(
            stagedLookY,
            cameraFollowState.lookY,
            freeRoamBlend,
          ),
          lerp(
            stagedLookZ,
            cameraFollowState.lookZ,
            freeRoamBlend,
          ),
        );
        camera.fov = lerp(lerp(42, 26, topDownBlend), 36, freeRoamBlend);
        camera.updateProjectionMatrix();

        let nextNearbyProject: LabOverlayItem | null = null;
        let nearestProjectDistance = Number.POSITIVE_INFINITY;
        let focusedProjectItem: ProjectViewItem | null = null;
        let focusedProjectStrength = 0;
        const projectEffectReach = 3.9;
        const galleryEffectReach = 3.2;
        for (const item of projectItems) {
          const localProbe = item.points.worldToLocal(projectProbeLocal.set(vehicle.x, item.points.position.y, vehicle.z));
          const dx = vehicle.x - item.points.position.x;
          const dz = vehicle.z - item.points.position.z;
          const planarDistance = Math.sqrt(dx * dx + dz * dz);
          const edgeDx = Math.max(Math.abs(localProbe.x) - item.outerHalfW, 0);
          const edgeDz = Math.max(Math.abs(localProbe.z) - item.outerHalfH, 0);
          const edgeDistance = Math.sqrt(edgeDx * edgeDx + edgeDz * edgeDz);
          const withinEffect = edgeDistance < projectEffectReach;
          const normalizedDistance = clamp(edgeDistance / projectEffectReach, 0, 1);
          const targetStrength = Math.pow(1 - normalizedDistance, 1.45);
          item.interactionStrength = lerp(
            item.interactionStrength,
            targetStrength,
            clamp((withinEffect ? 13.5 : 5.6) * delta, 0, 1),
          );
          item.interactionPoint.lerp(
            new THREE.Vector2(
              clamp(localProbe.x, -item.outerHalfW, item.outerHalfW),
              clamp(localProbe.z, -item.outerHalfH, item.outerHalfH),
            ),
            clamp((10 + targetStrength * 18) * delta, 0, 1),
          );

          const material = item.points.material;
          material.uniforms.uTime.value = elapsed;
          material.uniforms.uInteractionPoint.value.copy(item.interactionPoint);
          material.uniforms.uInteractionStrength.value = item.interactionStrength;
          material.uniforms.uRecovery.value = 1 - clamp(item.interactionStrength, 0, 1);
          material.uniforms.uInteractionRadius.value = lerp(material.uniforms.uInteractionRadius.value, 2.15 + item.interactionStrength * 0.95, clamp(8.5 * delta, 0, 1));
          material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, 0.9 + item.interactionStrength * 0.08, clamp(4.2 * delta, 0, 1));
          material.uniforms.uColorGain.value = lerp(material.uniforms.uColorGain.value, 0.98 + item.interactionStrength * 0.16, clamp(4.2 * delta, 0, 1));
          material.uniforms.uGlowGain.value = lerp(material.uniforms.uGlowGain.value, item.interactionStrength * 0.012, clamp(4.2 * delta, 0, 1));
          material.uniforms.uPointScale.value = lerp(material.uniforms.uPointScale.value, 1.3 + item.interactionStrength * 0.22, clamp(4.2 * delta, 0, 1));

          if (item.interactionStrength > focusedProjectStrength) {
            focusedProjectStrength = item.interactionStrength;
            focusedProjectItem = item;
          }

          const insideCore =
            Math.abs(localProbe.x) <= item.openHalfW &&
            Math.abs(localProbe.z) <= item.openHalfH;

          if (planarDistance < item.points.userData.triggerRadius && planarDistance < nearestProjectDistance) {
            nearestProjectDistance = planarDistance;
            nextNearbyProject = item.project;
          }

          item.wasInsideCore = insideCore;
        }

        for (const item of galleryItems) {
          const localProbe = item.points.worldToLocal(projectProbeLocal.set(vehicle.x, item.points.position.y, vehicle.z));
          const dx = vehicle.x - item.points.position.x;
          const dz = vehicle.z - item.points.position.z;
          const planarDistance = Math.sqrt(dx * dx + dz * dz);
          const edgeDx = Math.max(Math.abs(localProbe.x) - item.outerHalfW, 0);
          const edgeDz = Math.max(Math.abs(localProbe.z) - item.outerHalfH, 0);
          const edgeDistance = Math.sqrt(edgeDx * edgeDx + edgeDz * edgeDz);
          const withinEffect = edgeDistance < galleryEffectReach;
          const normalizedDistance = clamp(edgeDistance / galleryEffectReach, 0, 1);
          const targetStrength = Math.pow(1 - normalizedDistance, 1.55);
          item.interactionStrength = lerp(
            item.interactionStrength,
            targetStrength,
            clamp((withinEffect ? 12 : 4.8) * delta, 0, 1),
          );
          item.interactionPoint.lerp(
            new THREE.Vector2(
              clamp(localProbe.x, -item.outerHalfW, item.outerHalfW),
              clamp(localProbe.z, -item.outerHalfH, item.outerHalfH),
            ),
            clamp((9 + targetStrength * 16) * delta, 0, 1),
          );

          const material = item.points.material;
          material.uniforms.uTime.value = elapsed;
          material.uniforms.uInteractionPoint.value.copy(item.interactionPoint);
          material.uniforms.uInteractionStrength.value = item.interactionStrength;
          material.uniforms.uRecovery.value = 1 - clamp(item.interactionStrength, 0, 1);
          material.uniforms.uInteractionRadius.value = lerp(material.uniforms.uInteractionRadius.value, 2.0 + item.interactionStrength * 0.82, clamp(7.8 * delta, 0, 1));
          material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, 0.86 + item.interactionStrength * 0.08, clamp(4 * delta, 0, 1));
          material.uniforms.uColorGain.value = lerp(material.uniforms.uColorGain.value, 1.0 + item.interactionStrength * 0.14, clamp(4 * delta, 0, 1));
          material.uniforms.uGlowGain.value = lerp(material.uniforms.uGlowGain.value, item.interactionStrength * 0.01, clamp(4 * delta, 0, 1));
          material.uniforms.uPointScale.value = lerp(material.uniforms.uPointScale.value, 1.42 + item.interactionStrength * 0.16, clamp(4 * delta, 0, 1));

          if (planarDistance < item.triggerRadius && planarDistance < nearestProjectDistance) {
            nearestProjectDistance = planarDistance;
            nextNearbyProject = item.overlayItem;
          }
        }

        nearbyProjectRef.current = nextNearbyProject;

        const projectLightTargetX = focusedProjectItem ? focusedProjectItem.points.position.x : 0;
        const projectLightTargetZ = focusedProjectItem ? focusedProjectItem.points.position.z : 0;
        arenaProjectLight.position.x = lerp(arenaProjectLight.position.x, projectLightTargetX, clamp(4.8 * delta, 0, 1));
        arenaProjectLight.position.y = lerp(arenaProjectLight.position.y, focusedProjectItem ? 5.2 : 4.4, clamp(4.2 * delta, 0, 1));
        arenaProjectLight.position.z = lerp(arenaProjectLight.position.z, projectLightTargetZ, clamp(4.8 * delta, 0, 1));
        arenaProjectLight.intensity = lerp(
          arenaProjectLight.intensity,
          0.18 + focusedProjectStrength * 0.95,
          clamp(4.4 * delta, 0, 1),
        );
      }

      transitionMat.uniforms.uProgress.value = transitionState.progress;
      transitionMat.uniforms.uWhite.value = transitionState.white;
      transitionMat.uniforms.uReveal.value = transitionState.reveal;

      renderer.clear();
      (currentAct === 'act3_topview' ? composerAct3 : composerLegacy).render();
      if ((transitionState.progress > 0.001 || transitionState.white > 0.001) && transitionState.reveal < 0.999) {
        renderer.clearDepth();
        renderer.render(overlayScene, overlayCamera);
      }
    };

    rafId = requestAnimationFrame(animate);

    /* === Cleanup === */

    return () => {
      disposed = true;
      resetToIntroRef.current = null;
      disposedVideoRetry = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (lenisRaf) cancelAnimationFrame(lenisRaf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (flashTimeout) window.clearTimeout(flashTimeout);

      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      resizeObserver.disconnect();

      clearInterval(earlyTick);
      window.clearTimeout(earlyTickStopTimeout);
      introVideo.removeEventListener('canplaythrough', onVideoCanPlay);
      clearTimeout(videoTimeout);
      introVideo.removeEventListener('error', onIntroVideoError);
      introVideo.removeEventListener('canplay', onIntroVideoCanPlay);
      window.removeEventListener('pointerdown', retryIntroVideoAfterGesture);
      window.removeEventListener('keydown', retryIntroVideoAfterGesture);
      introVideo.pause();
      introVideo.removeAttribute('src');
      introVideo.load();

      // release scene references
      scene.environment = null;
      scene.fog = null;

      // dispose scene
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
        if (obj instanceof THREE.Sprite) {
          obj.material.dispose();
        }
      });

      camTexture.dispose();
      modelCamTexture.dispose();
      introPosterTexture.dispose();
      modelIntroPosterTexture.dispose();
      dirtTexture.dispose();
      crtOverlayTexture.dispose();
      fireflyTexture.dispose();
      introVideoTexture.dispose();
      modelVideoTexture.dispose();
      crtScreenTexture.dispose();
      modelCrtScreenTexture.dispose();
      introScreenTextures.forEach((texture) => {
        if (texture !== camTexture) texture.dispose();
      });
      modelIntroScreenTextures.forEach((texture) => {
        if (texture !== modelCamTexture) texture.dispose();
      });
      projectTextures.forEach((texture) => texture.dispose());
      galleryTextures.forEach((texture) => texture.dispose());
      decorTextures.forEach((texture) => texture.dispose());
      overlayScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      envTarget.dispose();
      bloomPassLegacy.dispose();
      postFxPassLegacy.material.dispose();
      composerLegacy.dispose();
      bloomPassAct3.dispose();
      postFxPassAct3.material.dispose();
      outputPassAct3.dispose();
      composerAct3.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* === Close overlay handler === */

  const closeOverlay = () => {
    setOverlayProject(null);
  };

  /* === Back to intro from act3 === */

  const backToIntro = () => {
    resetToIntroRef.current?.();
  };

  const overlayMedia = overlayProject
    ? overlayProject.images.slice(0, MAX_OVERLAY_MEDIA).map((src, index) => ({
        src,
        poster: overlayProject.previewImages?.[index] ?? null,
      }))
    : [];

  /* === Render === */

  return (
    <div ref={rootRef} className={`lab-story${introVisible || isLoading ? ' is-intro-visible' : ''}${act === 'act3_topview' ? ' is-act3' : ''}`}>
      {/* Retro loading screen */}
      <div className={`lab-loading-screen${isLoading ? '' : ' is-hidden'}`}>
        <div className="lab-loading-scanlines" />
        <div className="lab-loading-content">
          <div className="lab-loading-logo">3D LAB</div>
          <div className="lab-loading-terminal">
            <p className="lab-loading-line">&gt; BOOTING SYSTEM...</p>
            <p className="lab-loading-line">&gt; ESTABLISHING WEBGL CONTEXT...</p>
            <p className="lab-loading-line lab-loading-line--active">&gt; {loadStage}</p>
          </div>
          <div className="lab-loading-bar-wrap">
            <div className="lab-loading-bar" style={{ width: `${loadProgress}%` }} />
          </div>
          <p className="lab-loading-pct">{loadProgress}%</p>
        </div>
        <div className="lab-loading-flicker" />
      </div>

      {/* WebGL canvas */}
      <div className="lab-story-canvas" ref={canvasContainerRef} />

      <div
        id="scroll-container"
        ref={scrollContainerRef}
        className={`lab-scroll-container lenis${act === 'act3_topview' && !isMobile ? ' is-locked' : ''}`}
        tabIndex={-1}
      >
        <div ref={scrollContentRef} className="lab-scroll-content">
          {/* Scroll spacer (drives acts 1 & 2) */}
          {act !== 'act3_topview' && (
            <div className="lab-scroll-spacer lab-scroll-spacer--canvas" />
          )}
          {act === 'act3_topview' && <div className="lab-scroll-spacer lab-scroll-spacer--viewport" />}
        </div>
      </div>

      {/* Flash overlay */}
      <div
        className="lab-flash-overlay"
        style={{ opacity: flashOpacity * 0.58, pointerEvents: 'none', transition: act === 'act3_topview' ? 'opacity 1.15s cubic-bezier(0.18, 0.78, 0.16, 1)' : 'opacity 0.18s linear' }}
      />

      {/* HUD */}
      <div className="lab-hud">
        {/* Header */}
        <div className="lab-hud-header">
          <a className="lab-back-link" href={homeHref}>
            {text.back}
          </a>
          <div className="lang-switch" role="group" aria-label={ui.langSwitcherAria}>
            <button
              type="button"
              className={`lang-btn${lang === 'en' ? ' is-active' : ''}`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-btn${lang === 'ru' ? ' is-active' : ''}`}
              onClick={() => setLang('ru')}
              aria-pressed={lang === 'ru'}
            >
              RU
            </button>
          </div>
        </div>

        {/* Intro / suction overlay */}
        {act !== 'act3_topview' && (
          <div className="lab-intro-overlay">
            <div
              className="lab-intro-titles"
              style={{
                opacity: introTitleOpacity,
                transform: `translate3d(${introTitleOffsetX}px, ${introTitleOffsetY}px, 0) scale(${introTitleScale})`,
                filter: `blur(${introTitleBlur}px)`,
              }}
            >
              <h1 className="lab-glitch-title" data-text={text.title}>{text.title}</h1>
              {text.subtitle ? <p className="lab-subtitle">{text.subtitle}</p> : null}
            </div>
            {act === 'act1_intro' && (
              <p
                className="lab-scroll-hint"
                style={{ opacity: (introVisible ? 1 : 0) * clamp(1 - clamp((scrollProgress - 0.1) / 0.25, 0, 1), 0, 1) }}
              >
                {text.scrollToEnter}
              </p>
            )}
            {isVideoFallbackActive && <p className="lab-video-fallback-hint">{text.noVideo}</p>}
          </div>
        )}

        {/* Act 3: Arena HUD (desktop) */}
        {act === 'act3_topview' && !isMobile && (
          <>
            <div
              className={`lab-entering-label lab-entering-label--arena${arenaIntroProgress >= 0.995 ? ' is-hidden' : ''}`}
              style={{
                opacity: clamp(1 - smoothstep(0.72, 1, arenaIntroProgress), 0, 1),
                transform: `translate(-50%, calc(-50% + ${lerp(0, -18, smoothstep(0, 1, arenaIntroProgress)).toFixed(2)}px)) scale(${lerp(1, 0.96, smoothstep(0, 1, arenaIntroProgress)).toFixed(4)})`,
              }}
              aria-hidden={arenaIntroProgress >= 0.995}
            >
              <p>{text.enteringLab}</p>
              <div className="lab-entering-progress" role="presentation">
                <span
                  className="lab-entering-progress-fill"
                  style={{ transform: `scaleX(${clamp(arenaIntroProgress, 0, 1).toFixed(4)})` }}
                />
              </div>
            </div>
            <div className="lab-arena-hud">
              <p>{arenaControlsReady ? text.arenaHint : text.enteringLab}</p>
              {arenaControlsReady && (
                <div className="lab-controls-row" aria-hidden="true">
                  <span className="lab-control-group">
                    <kbd>W</kbd><kbd>S</kbd>
                    <span className="lab-control-label">{text.controlMove}</span>
                  </span>
                  <span className="lab-control-group">
                    <kbd>A</kbd><kbd>D</kbd>
                    <span className="lab-control-label">{text.controlTurn}</span>
                  </span>
                  <span className="lab-control-group">
                    <kbd>Shift</kbd>
                    <span className="lab-control-label">{text.boostLabel}</span>
                  </span>
                  <span className="lab-control-group">
                    <kbd>E</kbd>
                    <span className="lab-control-label">{text.controlOpen}</span>
                  </span>
                  <span className="lab-control-group">
                    <kbd>Esc</kbd>
                    <span className="lab-control-label">{text.backToIntro}</span>
                  </span>
                </div>
              )}
            </div>
            <button type="button" className="lab-back-btn" onClick={backToIntro}>
              {text.backToIntro}
            </button>
          </>
        )}

        {/* Act 3: Mobile fallback */}
        {act === 'act3_topview' && isMobile && (
          <div className="lab-mobile-projects">
            <button type="button" className="lab-back-btn" onClick={backToIntro}>
              {text.backToIntro}
            </button>
            <h2 className="lab-mobile-title">{text.arenaTitle}</h2>
            <p className="lab-mobile-hint">{text.arenaHintMobile}</p>
            {mobileProjectSections.map((section) => (
              <section key={section.id} className="lab-mobile-section">
                <h3 className="lab-mobile-section-title">{section.title}</h3>
                {section.projects.map((project, i) => {
                  const previewAsset = getProjectPreview(project) ?? project.images[0];
                  return (
                    <button
                      key={`${project.title.en}-${i}`}
                      type="button"
                      className="lab-mobile-card"
                      onClick={() => setOverlayProject(project)}
                    >
                      {previewAsset && (
                        isVideoAsset(previewAsset)
                          ? <video src={previewAsset} poster={project.previewImages?.[0]} muted loop autoPlay playsInline preload="metadata" />
                          : <img src={previewAsset} alt={project.title[lang]} loading="lazy" />
                      )}
                      <div className="lab-mobile-card-copy">
                        <h3>{project.title[lang]}</h3>
                        <p>{project.focus[lang]}</p>
                      </div>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Project overlay */}
      {overlayProject && (
        <div className="lab-project-overlay" role="dialog" aria-modal="true">
          <button type="button" className="lab-overlay-close" onClick={closeOverlay} aria-label={text.overlayClose}>
            &times;
          </button>
          <div className="lab-overlay-inner">
            <h2>{overlayProject.title[lang]}</h2>
            <p className="lab-overlay-meta">{overlayProject.focus[lang]} / {overlayProject.year[lang]}</p>
            <p className="lab-overlay-summary">{overlayProject.summary[lang]}</p>
            {overlayProject.metric[lang] && (
              <p className="lab-overlay-metric">{overlayProject.metric[lang]}</p>
            )}
              <div className="lab-overlay-media">
                {overlayMedia.map((media, i) =>
                  isVideoAsset(media.src) ? (
                  <video key={i} src={media.src} poster={media.poster ?? undefined} playsInline controls preload="metadata" />
                ) : (
                  <img key={i} src={media.src} alt={overlayProject.title[lang]} loading="lazy" />
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





