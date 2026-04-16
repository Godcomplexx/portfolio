const projectAsset = (file: string) => `${import.meta.env.BASE_URL}projects/${file}`;
const aboutAsset = (file: string) => `${import.meta.env.BASE_URL}about/${file}`;
const projectPreviewAsset = (file: string) => `${import.meta.env.BASE_URL}projects/thumbs/${file}`;
const projectPosterAsset = (file: string) => `${import.meta.env.BASE_URL}projects/posters/${file}`;

export type Lang = 'en' | 'ru';
export type ArchiveCategory = 'core' | 'hard3d' | 'other3d';

type LocalizedText = Record<Lang, string>;
type LocalizedList = Record<Lang, string[]>;

export type HeroMediaItem = {
  className: 'left' | 'main' | 'right';
  src: string;
  kind?: 'image' | 'video';
  poster?: string;
  alt: LocalizedText;
};

export type AboutRow = {
  index: string;
  title: LocalizedText;
  text: LocalizedText;
};

export type Publication = {
  title: LocalizedText;
  venue: LocalizedText;
  note: LocalizedText;
  href: string;
  doi: string;
};

export type EducationItem = {
  year: string;
  degree: LocalizedText;
  institution: LocalizedText;
  program: LocalizedText;
};

export type CourseItem = {
  year: string;
  title: LocalizedText;
};

export type SelectedProject = {
  title: LocalizedText;
  year: LocalizedText;
  focus: LocalizedText;
  summary: LocalizedText;
  metric: LocalizedText;
  category: ArchiveCategory;
  isPremium?: boolean;
  images: string[];
  previewImages?: string[];
  repoHref?: string | null;
};

export type PortfolioUiText = {
  fullName: string;
  nav: {
    info: string;
    work: string;
    archive: string;
    contact: string;
  };
  role: string;
  wordmarkAbout: string;
  scrollHint: string;
  sections: {
    work: string;
    archive: string;
    contact: string;
  };
  blocks: {
    summary: string;
    coreSkills: string;
    educationCourses: string;
    education: string;
    courses: string;
    selectedPublications: string;
  };
  labels: {
    email: string;
    github: string;
    orcid: string;
    portfolio: string;
    doi: string;
  };
  resumeDownload: string;
  archiveRepoAriaLabelPrefix: string;
  synapseOrbitMode: string;
  langSwitcherAria: string;
  samTag: string;
};

const githubProfile = 'https://github.com/Godcomplexx';
const orcidProfile = 'https://orcid.org/0009-0000-6516-8216';

export const portfolioUi: Record<Lang, PortfolioUiText> = {
  en: {
    fullName: 'Daria Melnikova',
    nav: {
      info: 'Info',
      work: 'Work',
      archive: 'Archive',
      contact: 'Contact',
    },
    role: 'R&D Systems Engineer',
    wordmarkAbout: 'About',
    scrollHint: '[scroll to explore]',
    sections: {
      work: 'Work',
      archive: 'Archive',
      contact: 'Contact',
    },
    blocks: {
      summary: 'Summary',
      coreSkills: 'Core Skills',
      educationCourses: 'Education & Courses',
      education: 'Education',
      courses: 'Courses',
      selectedPublications: 'Selected Publications',
    },
    labels: {
      email: 'Email',
      github: 'GitHub',
      orcid: 'ORCID',
      portfolio: 'Portfolio',
      doi: 'DOI',
    },
    resumeDownload: 'Download Resume (.pdf)',
    archiveRepoAriaLabelPrefix: 'Open GitHub repository for',
    synapseOrbitMode: 'CAM · ORBIT MODE',
    langSwitcherAria: 'Language switcher',
    samTag: '[SAM]',
  },
  ru: {
    fullName: 'Дарья Мельникова',
    nav: {
      info: 'Обо мне',
      work: 'Опыт',
      archive: 'Проекты',
      contact: 'Контакты',
    },
    role: 'R&D инженер систем ИИ',
    wordmarkAbout: 'Обо мне',
    scrollHint: '[прокрутите вниз]',
    sections: {
      work: 'Опыт',
      archive: 'Проекты',
      contact: 'Контакты',
    },
    blocks: {
      summary: 'Профиль',
      coreSkills: 'Ключевые навыки',
      educationCourses: 'Образование и курсы',
      education: 'Образование',
      courses: 'Курсы',
      selectedPublications: 'Избранные публикации',
    },
    labels: {
      email: 'Email',
      github: 'GitHub',
      orcid: 'ORCID',
      portfolio: 'Портфолио',
      doi: 'DOI',
    },
    resumeDownload: 'Скачать резюме (.pdf)',
    archiveRepoAriaLabelPrefix: 'Открыть GitHub-репозиторий проекта',
    synapseOrbitMode: 'КАМЕРА · ОРБИТА',
    langSwitcherAria: 'Переключатель языка',
    samTag: '[САМ]',
  },
};

export const portfolioContent = {
  heroIntro: {
    en: 'I build AI systems for neurotechnology and medicine, turning signals, imaging, and devices into usable products.',
    ru: 'Я разрабатываю AI-системы для нейротехнологий и медицины, превращая сигналы, изображения и устройства в рабочие продукты.',
  },
  sceneLabel: {
    en: 'AI / Neurotech / Biomedical Systems',
    ru: 'AI / Нейротех / Биомедицинские системы',
  },
  sceneStatement: {
    en: 'From embedded devices and EEG pipelines to MRI services and clinical tools.',
    ru: 'От встраиваемых устройств и EEG-пайплайнов до MRI-сервисов и клинических инструментов.',
  },
  summaryParagraphs: {
    en: [
      'R&D systems engineer with 3+ years of hands-on experience in practical AI for neurotechnology and biomedical products. I work across the full path from data acquisition and signal processing to inference, interfaces, and deployable system design.',
      'My work spans EEG, EMG, audio, computer vision, medical imaging, embedded hardware, and interactive applications for research and clinical environments.',
    ],
    ru: [
      'R&D инженер систем с 3+ годами практического опыта в прикладном AI для нейротехнологий и биомедицинских продуктов. Закрываю полный цикл: от сбора данных и обработки сигналов до инференса, интерфейсов и проектирования deploy-ready систем.',
      'Работаю с EEG, EMG, аудио, компьютерным зрением, медицинскими изображениями, embedded-устройствами и интерактивными приложениями для исследовательской и клинической среды.',
    ],
  } satisfies LocalizedList,
  coreSkills: {
    en: [
      'PyTorch, TensorFlow, Scikit-learn, XGBoost',
      'EEG / EMG / audio signal processing, MNE, feature engineering',
      'OpenCV, MediaPipe, YOLOv8, medical imaging pipelines',
      'FastAPI, Docker, Celery, RabbitMQ, REST APIs',
      'Orange Pi, GPIO, edge AI deployment, system integration',
      'Unity (C#), React, TypeScript, Blender, CAD prototyping',
    ],
    ru: [
      'PyTorch, TensorFlow, Scikit-learn, XGBoost',
      'Обработка EEG / EMG / аудио, MNE, feature engineering',
      'OpenCV, MediaPipe, YOLOv8, пайплайны медизображений',
      'FastAPI, Docker, Celery, RabbitMQ, REST API',
      'Orange Pi, GPIO, edge AI deployment, системная интеграция',
      'Unity (C#), React, TypeScript, Blender, CAD-прототипирование',
    ],
  } satisfies LocalizedList,
  heroMedia: [
    {
      className: 'left',
      kind: 'video',
      src: projectAsset('doc_2026-04-07_12-51-05.mp4'),
      poster: projectPosterAsset('doc_2026-04-07_12-51-05.webp'),
      alt: {
        en: 'Clinical EEG dashboard video preview.',
        ru: '3D-рендер концепта модуля камеры.',
      },
    },
    {
      className: 'main',
      src: aboutAsset('daria-portrait-2.jpg'),
      alt: {
        en: 'Portrait photograph of Daria Melnikova in profile.',
        ru: 'Портрет Дарьи Мельниковой в профиль.',
      },
    },
    {
      className: 'right',
      kind: 'video',
      src: projectAsset('0001-0250-4.mp4'),
      poster: projectPosterAsset('0001-0250-4.webp'),
      alt: {
        en: '3D rendered model animation preview.',
        ru: 'Портрет Дарьи Мельниковой.',
      },
    },
  ] satisfies HeroMediaItem[],
  aboutRows: [
    {
      index: '[01]',
      title: {
        en: 'Product-minded R&D',
        ru: 'Продуктовый подход в R&D',
      },
      text: {
        en: 'I take ideas from research questions to working systems, combining modeling, interfaces, deployment constraints, and validation into one coherent product path.',
        ru: 'Провожу идеи путь от исследовательской гипотезы до рабочей системы, объединяя моделирование, интерфейсы, ограничения внедрения и валидацию в единый продуктовый процесс.',
      },
    },
    {
      index: '[02]',
      title: {
        en: 'Biomedical AI pipelines',
        ru: 'Биомедицинские AI-пайплайны',
      },
      text: {
        en: 'I build end-to-end pipelines for EEG, audio, vision, and MRI data, with attention to signal quality, reproducible experiments, and clinically useful outputs.',
        ru: 'Строю end-to-end пайплайны для EEG, аудио, компьютерного зрения и MRI с фокусом на качество сигналов, воспроизводимые эксперименты и клинически полезный результат.',
      },
    },
    {
      index: '[03]',
      title: {
        en: 'Embedded and interactive systems',
        ru: 'Embedded и интерактивные системы',
      },
      text: {
        en: 'I work at the boundary of AI and real-world use: edge devices, real-time inference, VR rehabilitation flows, and interfaces that support research and care teams.',
        ru: 'Работаю на стыке AI и реального применения: edge-устройства, real-time инференс, VR-сценарии реабилитации и интерфейсы для исследовательских и медицинских команд.',
      },
    },
  ] satisfies AboutRow[],
  experienceTitle: {
    en: 'Experience (3+ years) - Research Institute, Samara State Medical University (2023 - Present)',
    ru: 'Опыт (3+ года) - НИИ СамГМУ (2023 - настоящее время)',
  },
  experienceHighlights: {
    en: [
      'Designed and implemented end-to-end ML pipelines for EEG, audio, and video data.',
      'Built real-time microservices for biomedical signal processing and inference.',
      'Developed computer vision systems with MediaPipe and YOLOv8.',
      'Created VR rehabilitation scenarios in Unity with Ultraleap hand tracking.',
      'Implemented MRI processing flows from DICOM conversion to segmentation.',
      'Built an embedded AI concussion screening prototype on Orange Pi.',
    ],
    ru: [
      'Спроектировала и реализовала end-to-end ML-пайплайны для EEG, аудио и видео данных.',
      'Разработала real-time микросервисы для обработки биомедицинских сигналов и инференса.',
      'Создала системы компьютерного зрения на базе MediaPipe и YOLOv8.',
      'Разработала VR-сценарии реабилитации в Unity с трекингом рук Ultraleap.',
      'Реализовала MRI-пайплайны от конвертации DICOM до сегментации.',
      'Создала embedded-прототип AI-устройства для скрининга сотрясения на Orange Pi.',
    ],
  } satisfies LocalizedList,
  education: [
    {
      year: '2025',
      degree: {
        en: 'Master',
        ru: 'Магистр',
      },
      institution: {
        en: 'Samara State Medical University (SamGMU)',
        ru: 'Самарский государственный медицинский университет (СамГМУ)',
      },
      program: {
        en: 'PISh, Artificial Intelligence Engineering',
        ru: 'ПИШ, Инженерия искусственного интеллекта',
      },
    },
    {
      year: '2023',
      degree: {
        en: 'Bachelor',
        ru: 'Бакалавр',
      },
      institution: {
        en: 'Samara State Transport University',
        ru: 'Самарский государственный университет путей сообщения',
      },
      program: {
        en: 'Informatics and Computer Engineering',
        ru: 'Информатика и вычислительная техника',
      },
    },
    {
      year: '2023',
      degree: {
        en: 'Additional Education',
        ru: 'Дополнительное образование',
      },
      institution: {
        en: 'Samara State Transport University',
        ru: 'Самарский государственный университет путей сообщения',
      },
      program: {
        en: 'Translator',
        ru: 'Переводчик',
      },
    },
  ] satisfies EducationItem[],
  courses: [
    {
      year: '2025',
      title: {
        en: 'Neuromatch',
        ru: 'Neuromatch',
      },
    },
    {
      year: '2025',
      title: {
        en: 'FastAI',
        ru: 'FastAI',
      },
    },
  ] satisfies CourseItem[],
  publications: [
    {
      title: {
        en: 'Machine Learning Pipeline for Automated Detection of Sleep Apnea Episodes',
        ru: 'Machine Learning Pipeline for Automated Detection of Sleep Apnea Episodes',
      },
      venue: {
        en: 'IEEE CNN 2024',
        ru: 'IEEE CNN 2024',
      },
      note: {
        en: 'Conference paper published on 19 September 2024 with contributors Alexander Zakharov, Daria Melnikova, Anton Shchepetov, Arseny Andreev, Dmitry Dedyk, and Yuliya Komarova.',
        ru: 'Конференционная статья опубликована 19 сентября 2024 года. Соавторы: Alexander Zakharov, Daria Melnikova, Anton Shchepetov, Arseny Andreev, Dmitry Dedyk, Yuliya Komarova.',
      },
      href: 'https://doi.org/10.1109/CNN63506.2024.10705810',
      doi: '10.1109/CNN63506.2024.10705810',
    },
    {
      title: {
        en: 'Deep Learning-Based Analysis of EEG Biomarkers',
        ru: 'Deep Learning-Based Analysis of EEG Biomarkers',
      },
      venue: {
        en: 'Science and Innovations in Medicine, 2024',
        ru: 'Science and Innovations in Medicine, 2024',
      },
      note: {
        en: 'Journal article published on 15 December 2024 with Darya D. Melnikova among the listed contributors.',
        ru: 'Журнальная статья опубликована 15 декабря 2024 года, в числе авторов Darya D. Melnikova.',
      },
      href: 'https://doi.org/10.35693/SIM636947',
      doi: '10.35693/SIM636947',
    },
  ] satisfies Publication[],
  selectedProjects: [
    {
      title: {
        en: 'DashEEG - EEG Primary Analysis Workspace',
        ru: 'DashEEG - рабочее пространство первичного анализа EEG',
      },
      year: {
        en: '2026',
        ru: '2026',
      },
      focus: {
        en: 'EEG / Dash / Plotly / Clinical workflow',
        ru: 'EEG / Dash / Plotly / клинический workflow',
      },
      summary: {
        en: 'Web application for first-pass EEG analysis with visualization, filtering, annotation, and optimized loading for large recordings.',
        ru: 'Веб-приложение для первичного анализа EEG: визуализация, фильтрация, аннотирование и оптимизированная загрузка больших записей.',
      },
      metric: {
        en: 'Large-file EEG loading optimized / Interactive annotation workflow',
        ru: 'Оптимизирована загрузка больших EEG-файлов / Интерактивный процесс аннотирования',
      },
      category: 'core',
      images: [
        projectAsset('dasheeg-pipeline.svg'),
        projectAsset('dasheeg-eeg-channels.svg'),
        projectAsset('dasheeg-psd-alpha.svg'),
      ],
      repoHref: null,
    },
    {
      title: {
        en: 'AlphaFreq - Individual Alpha Frequency Service',
        ru: 'AlphaFreq - сервис индивидуальной альфа-частоты',
      },
      year: {
        en: '2026',
        ru: '2026',
      },
      focus: {
        en: 'EEG / Microservices / FastAPI',
        ru: 'EEG / Микросервисы / FastAPI',
      },
      summary: {
        en: 'Microservice for automated IAPF calculation with streamlined request processing and API delivery for downstream neurofeedback workflows.',
        ru: 'Микросервис для автоматического расчета IAPF с быстрым обработчиком запросов и API для downstream-сценариев нейрофидбэка.',
      },
      metric: {
        en: '<2s average response per EEG record',
        ru: '<2 с среднее время ответа на EEG-запись',
      },
      category: 'core',
      images: [projectAsset('alphafreq-workstation.webp')],
      previewImages: [projectPreviewAsset('alphafreq-workstation.webp')],
      repoHref: null,
    },
    {
      title: {
        en: 'APNEA - Cascaded Audio Detection Pipeline',
        ru: 'APNEA - каскадный пайплайн аудио-детекции',
      },
      year: {
        en: '2026',
        ru: '2026',
      },
      focus: {
        en: 'Audio ML / Classification / REST API',
        ru: 'Audio ML / Классификация / REST API',
      },
      summary: {
        en: 'Cascaded apnea detection pipeline evolved from baseline CNN to PANNs-based V2 with adaptive noise-aware filtering and robust event detection.',
        ru: 'Каскадный пайплайн детекции апноэ: от базового CNN до версии на PANNs с адаптивной фильтрацией шума и устойчивой детекцией событий.',
      },
      metric: {
        en: '>80% accuracy / VAD-music-noise adaptive cascade',
        ru: '>80% accuracy / Адаптивный каскад VAD-music-noise',
      },
      category: 'core',
      images: [projectAsset('apnea.webp'), projectAsset('photo_2026-02-18_12-47-55.webp')],
      previewImages: [projectPreviewAsset('apnea.webp'), projectPreviewAsset('photo_2026-02-18_12-47-55.webp')],
      repoHref: null,
    },
    {
      title: {
        en: 'Hybrid Emotional Response Analysis (Video + EEG)',
        ru: 'Гибридный анализ эмоциональных реакций (Видео + EEG)',
      },
      year: {
        en: '2025',
        ru: '2025',
      },
      focus: {
        en: 'Affective AI / EEG / Computer Vision',
        ru: 'Affective AI / EEG / Компьютерное зрение',
      },
      summary: {
        en: 'Hybrid neurointerface for emotion analysis with synchronized video and EEG pipelines, channel fusion, and batch-ready outputs for BI analytics.',
        ru: 'Гибридный нейроинтерфейс для анализа эмоций с синхронными видео- и EEG-пайплайнами, fusion-логикой и batch-выгрузками для BI-аналитики.',
      },
      metric: {
        en: 'Dense-NN EEG model with F1 > 0.8 / Individual + batch reports',
        ru: 'EEG-модель Dense-NN с F1 > 0.8 / Индивидуальные и batch-отчеты',
      },
      category: 'core',
      images: [
        projectAsset('emotion.webp'),
        projectAsset('photo_2026-02-17_14-36-24-2.webp'),
        projectAsset('photo_2026-02-17_14-36-24.webp'),
      ],
      previewImages: [
        projectPreviewAsset('emotion.webp'),
        projectPreviewAsset('photo_2026-02-17_14-36-24-2.webp'),
        projectPreviewAsset('photo_2026-02-17_14-36-24.webp'),
      ],
      repoHref: null,
    },
    {
      title: {
        en: 'AI-based Concussion Screening Device',
        ru: 'AI-устройство для скрининга сотрясения',
      },
      year: {
        en: '2025-2026',
        ru: '2025-2026',
      },
      focus: {
        en: 'Edge AI / Computer Vision / Hardware',
        ru: 'Edge AI / Компьютерное зрение / Hardware',
      },
      summary: {
        en: 'Portable offline device for rapid concussion screening using pupillary response and eye-movement analysis on an embedded Orange Pi pipeline.',
        ru: 'Портативное офлайн-устройство для быстрого скрининга сотрясения по реакции зрачка и анализу движений глаз на embedded-пайплайне Orange Pi.',
      },
      metric: {
        en: '~60 sec end-to-end / Patent co-author / Working prototype',
        ru: '~60 сек end-to-end / Соавтор патента / Рабочий прототип',
      },
      category: 'core',
      isPremium: true,
      images: [
        projectAsset('concussion-device-render.webp'),
        projectAsset('concussion-eye-capture.webp'),
        projectAsset('concussion-system-scheme.webp'),
      ],
      previewImages: [
        projectPreviewAsset('concussion-device-render.webp'),
        projectPreviewAsset('concussion-eye-capture.webp'),
        projectPreviewAsset('concussion-system-scheme.webp'),
      ],
      repoHref: `${githubProfile}/AI-based-Concussion-Screening-Device`,
    },
    {
      title: {
        en: 'Hybrid EEG Speller (P300 + LLM)',
        ru: 'Гибридный EEG-спеллер (P300 + LLM)',
      },
      year: {
        en: '2026',
        ru: '2026',
      },
      focus: {
        en: 'BCI / P300 / LLM-assisted communication',
        ru: 'BCI / P300 / Коммуникация с поддержкой LLM',
      },
      summary: {
        en: 'Real-time EEG speller that combines P300 detection with inline LLM word prediction to reduce input time for users with severe motor impairment.',
        ru: 'Real-time EEG-спеллер, объединяющий P300-детекцию и предсказание слов через LLM для ускорения ввода пользователями с выраженными моторными ограничениями.',
      },
      metric: {
        en: '+209% typing speed vs baseline / N=6 A/B study',
        ru: '+209% к скорости набора относительно baseline / A/B-исследование N=6',
      },
      category: 'core',
      isPremium: true,
      images: [
        projectAsset('hybrid-grid-visual.webp'),
        projectAsset('hybrid-main-metrics.webp'),
        projectAsset('hybrid-time-efficiency.webp'),
      ],
      previewImages: [
        projectPreviewAsset('hybrid-grid-visual.webp'),
        projectPreviewAsset('hybrid-main-metrics.webp'),
        projectPreviewAsset('hybrid-time-efficiency.webp'),
      ],
      repoHref: `${githubProfile}/Hybrid-EEG-Speller-P300-LLM-`,
    },
    {
      title: {
        en: 'Medical Image Segmentation Service',
        ru: 'Сервис сегментации медицинских изображений',
      },
      year: {
        en: '2025',
        ru: '2025',
      },
      focus: {
        en: 'Medical imaging / Microservices / Async processing',
        ru: 'Медицинские изображения / Микросервисы / Асинхронная обработка',
      },
      summary: {
        en: 'Production-oriented MRI analysis platform with asynchronous processing, FastAPI services, Celery workers, and GPU-backed segmentation.',
        ru: 'Production-ориентированная MRI-платформа с асинхронной обработкой, сервисами FastAPI, Celery-воркерами и GPU-сегментацией.',
      },
      metric: {
        en: '11-container architecture / Improved YOLO precision across all classes',
        ru: 'Архитектура из 11 контейнеров / Повышена точность YOLO по всем классам',
      },
      category: 'core',
      isPremium: true,
      images: [
        projectAsset('doc_2025-08-27_14-26-02.mp4'),
        projectAsset('doc_2026-04-07_12-51-05.mp4'),
      ],
      previewImages: [
        projectPosterAsset('doc_2025-08-27_14-26-02.webp'),
        projectPosterAsset('doc_2026-04-07_12-51-05.webp'),
      ],
      repoHref: `${githubProfile}/Medical-Image-Segmentation`,
    },
    {
      title: {
        en: 'Epileptic Seizure Prediction',
        ru: 'Предикция эпилептических приступов',
      },
      year: {
        en: '2025',
        ru: '2025',
      },
      focus: {
        en: 'EEG / CNN-LSTM / Transfer learning',
        ru: 'EEG / CNN-LSTM / Transfer learning',
      },
      summary: {
        en: 'Personalized seizure prediction pipeline using EEG preprocessing, transfer learning, patient-specific fine-tuning, and real-time alarm logic.',
        ru: 'Персонализированный пайплайн предикции приступов: EEG-препроцессинг, transfer learning, patient-specific fine-tuning и real-time логика тревоги.',
      },
      metric: {
        en: '86.5% sensitivity on unseen test patients / 0.00 FA/24h',
        ru: '86.5% sensitivity на unseen test patients / 0.00 FA/24h',
      },
      category: 'core',
      isPremium: true,
      images: [
        projectAsset('epilepsy-confusion-matrix.webp'),
        projectAsset('generated-image-december-19-2025-147pm.webp'),
      ],
      previewImages: [
        projectPreviewAsset('epilepsy-confusion-matrix.webp'),
        projectPreviewAsset('generated-image-december-19-2025-147pm.webp'),
      ],
      repoHref: `${githubProfile}/epilepsy`,
    },
    {
      title: {
        en: 'EEG-based Consciousness Assessment',
        ru: 'Оценка уровня сознания по EEG',
      },
      year: {
        en: '2024',
        ru: '2024',
      },
      focus: {
        en: 'EEG / Clinical ML / Monitoring',
        ru: 'EEG / Clinical ML / Мониторинг',
      },
      summary: {
        en: 'Clinical EEG pipeline for estimating Glasgow Coma Scale and stratifying patients into actionable consciousness groups for monitoring workflows.',
        ru: 'Клинический EEG-пайплайн для оценки шкалы комы Глазго и стратификации пациентов по группам сознания для мониторинговых workflow.',
      },
      metric: {
        en: '76.2% accuracy / Multi-channel EEG + LOOCV validation',
        ru: '76.2% accuracy / Multi-channel EEG + LOOCV-валидация',
      },
      category: 'core',
      isPremium: true,
      images: [
        projectAsset('eeg-gcs-correlation-heatmap.webp'),
        projectAsset('generated-image-december-19-2025-147pm.webp'),
      ],
      previewImages: [
        projectPreviewAsset('eeg-gcs-correlation-heatmap.webp'),
        projectPreviewAsset('generated-image-december-19-2025-147pm.webp'),
      ],
      repoHref: `${githubProfile}/EEG-based-Consciousness-Assessment-GCS-`,
    },
    {
      title: {
        en: '3D Environment Rendering Studies',
        ru: 'Исследования 3D-рендеринга окружения',
      },
      year: {
        en: '2025',
        ru: '2025',
      },
      focus: {
        en: 'Blender / Lighting / Environment design',
        ru: 'Blender / Свет / Дизайн окружения',
      },
      summary: {
        en: 'A series of atmospheric scene studies focused on mood, cinematic lighting, material response, and spatial composition in stylized interior and floating-environment renders.',
        ru: 'Серия атмосферных сценовых исследований с фокусом на настроение, киношный свет, поведение материалов и пространственную композицию в стилизованных интерьерах и floating-environment рендерах.',
      },
      metric: {
        en: 'Interior + prop scenes / Cinematic lighting / Custom material lookdev',
        ru: 'Интерьеры и prop-сцены / Киношный свет / Кастомный lookdev материалов',
      },
      category: 'other3d',
      images: [
        projectAsset('3d/room/render-room-hallway.webp'),
        projectAsset('3d/vend/render-vending-island.webp'),
        projectAsset('3d/vend/render-vending-closeup.webp'),
      ],
      previewImages: [
        projectPreviewAsset('3d/render-room-hallway.webp'),
        projectPreviewAsset('3d/render-vending-island.webp'),
        projectPreviewAsset('3d/render-vending-closeup.webp'),
      ],
      repoHref: null,
    },
    {
      title: {
        en: '3D Object and Device Visualization',
        ru: '3D-визуализация объектов и устройств',
      },
      year: {
        en: '2025',
        ru: '2025',
      },
      focus: {
        en: 'Blender / Hard-surface / Material studies',
        ru: 'Blender / Hard-surface / Исследование материалов',
      },
      summary: {
        en: 'Explorations in clean object rendering, optical surfaces, translucent materials, and close-up product framing for concept presentation and visual development.',
        ru: 'Исследования чистого объектного рендера, оптических поверхностей, полупрозрачных материалов и крупноплановой product-композиции для презентации концептов.',
      },
      metric: {
        en: 'Camera module studies / Optical materials / Product-style closeups',
        ru: 'Серии с модулем камеры / Оптические материалы / Product-крупные планы',
      },
      category: 'hard3d',
      images: [
        projectAsset('3d/camera/render-camera-module.png'),
        projectAsset('3d/camera/render-camera-closeup.png'),
        projectAsset('3d/cube/render-glass-object.png'),
      ],
      previewImages: [
        projectPreviewAsset('3d/render-camera-module.webp'),
        projectPreviewAsset('3d/render-camera-closeup.webp'),
        projectPreviewAsset('3d/render-glass-object.webp'),
      ],
      repoHref: null,
    },
  ] satisfies SelectedProject[],
  contacts: {
    email: 'daha442242@gmail.com',
    github: githubProfile,
    orcid: orcidProfile,
    site: null,
  },
} as const;


