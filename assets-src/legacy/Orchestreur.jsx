// Orchestreur.jsx
import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { useActs } from './ActsProvider'
import { useActsStore } from './store/useActsStore'
import { EffectComposer } from "@react-three/postprocessing"
import { useIsMobile, useIsTouch } from './utils/useIsMobile'

export default function Orchestreur({
  id,
  progress,
  range = { start: 0, end: 1 },
  Camera = null,
  Env = null,
  Lights = null,
  Models = () => null,
  Overlay = null,
  qualityScale = 1,
  overlap = 0.0005,
  edgeFrac = 0.25,
  fog = false,
  backgroundColor = '#000000',
  backgroundAlpha = 1,
  renderDuringPrevTransition = false,
  prewarm = 0.08
}) {
  const { gl, size, viewport } = useThree()
  const w = Math.max(1, Math.floor(size.width * qualityScale))
  const h = Math.max(1, Math.floor(size.height * qualityScale))
  const { width: Vw, height: Vh } = viewport

  const lastProgressRef = useRef(null)
  const lastUiRef = useRef(null)


  const isTouch = useIsTouch()
  const isMobile = useIsMobile()

  prewarm = isTouch && isMobile ? 0.08 : 0.1

  const same4 = (a, b) =>
    a &&
    b &&
    a.phase === b.phase &&
    a.local === b.local &&
    a.phaseProgress === b.phaseProgress &&
    a.holdProgress === b.holdProgress

  edgeFrac = THREE.MathUtils.clamp(edgeFrac, 0, 0.5)

  const pointerRef = useRef({ x: 0, y: 0 })

  useFrame((state) => {
    pointerRef.current.x = state.pointer.x
    pointerRef.current.y = state.pointer.y
  })

  const acts = useActs()
  const setActProgress = useActsStore((s) => s.setActProgress)

  // FBO
  const fbo = useFBO(w, h, {
    depthBuffer: true, stencilBuffer: false,
    samples: 0,
    type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
    magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter,
  })

  useEffect(() => {
    fbo.texture.format = THREE.RGBAFormat
    fbo.texture.colorSpace = THREE.SRGBColorSpace
    fbo.texture.minFilter = THREE.LinearFilter
    fbo.texture.magFilter = THREE.LinearFilter
    fbo.texture.generateMipmaps = false
  }, [fbo])

  // offscreen scene + camera
  const off = useMemo(() => new THREE.Scene(), [])

  //FOG
  useEffect(() => {
    if (!fog) {
      off.fog = null
      return
    }
    if (fog === true) {
      off.fog = new THREE.Fog(0x000000, 5, 40)
    } else {
      // fog peut être un objet: { color, near, far }
      const color = fog.color ?? 0x000000
      const near = fog.near ?? 5
      const far = fog.far ?? 40
      off.fog = new THREE.Fog(color, near, far)
    }
  }, [off, fog])
  //fin fog

  const camRef = useRef(null)
  const fallbackCam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000)
    c.position.set(0, 0, 3)
    return c
  }, [w, h])

  const baseCamPosition = useRef()

  useEffect(() => {
    const c = camRef.current ?? fallbackCam
    c.aspect = w / h
    c.updateProjectionMatrix()
    if (!baseCamPosition.current) {
      baseCamPosition.current = c.position.clone()
    }

  }, [w, h, fallbackCam])

  const start = range.start
  const end = range.end

  const groupRef = useRef()
  const prevRef = useRef()
  const curRef = useRef()
  const nextRef = useRef()

  const prevColorRef = useRef(new THREE.Color())
  const bgColorRef = useRef(new THREE.Color())


  //Prewarm permet de rendre la texture FBO plus tôt dans la transition afiin que les composants Text s'affichent au bon moment (pendnat la transi du coup)
  useFrame(() => {
    const p = progress.current ?? 0

    const prevProg = acts.getProgress(id - 1)
    const preActive = renderDuringPrevTransition && prevProg?.phase === 'transition'

    if (!preActive && (p < start - prewarm || p > end + prewarm)) return

    const cam = camRef.current ?? fallbackCam

    gl.getClearColor(prevColorRef.current)
    bgColorRef.current.set(backgroundColor)
    const prevAlpha = gl.getClearAlpha?.() ?? 1

    gl.setClearColor(bgColorRef.current, backgroundAlpha)
    gl.setRenderTarget(fbo)
    gl.clear(true, true, true)
    gl.render(off, cam)
    gl.setRenderTarget(null)
    gl.setClearColor(prevColorRef.current, prevAlpha)
  })


  useFrame((state, delta) => {
    const p = progress.current ?? 0

    const prevProg = acts.getProgress(id - 1)
    const preActive = renderDuringPrevTransition && prevProg?.phase === 'transition' && prevProg?.transitionKind === 'exit'

    const hasPrev = !!acts.get(id - 1)
    const hasNext = !!acts.get(id + 1)

    const inWindow = (p >= start - overlap && p <= end + overlap) || preActive

    if (groupRef.current) groupRef.current.visible = inWindow

    if (!inWindow) {
      if (lastProgressRef.current?.isVisible !== false) {
        lastProgressRef.current = { isVisible: false }
        acts.setProgress(id, { isVisible: false })
        setActProgress(id, { isVisible: false }) // 👈 synchro Zustand
      }
      return
    }


    let phase, local, phaseProgress, holdProgress, transitionKind

    if (preActive && p < start) {
      phase = 'transition'
      transitionKind = 'enter'
      local = 0
      phaseProgress = prevProg?.phaseProgress ?? 0
      holdProgress = 0
    } else {
      ; ({ phase, local, phaseProgress, holdProgress } = getActProgress(
        p,
        start,
        end,
        edgeFrac,
        { hasPrev, hasNext }
      ))
    }
    const easedPhaseProgress = THREE.MathUtils.smoothstep(phaseProgress, 0, 1)

    let yPrev = +Vh
    let yCur = 0
    let yNext = -Vh

    if (preActive && hasPrev && p < start) {
      yPrev = THREE.MathUtils.lerp(0, +Vh, easedPhaseProgress)
      yCur = THREE.MathUtils.lerp(-Vh, 0, easedPhaseProgress)
    }

    if (phase === 'transition' && hasNext && !(preActive && p < start)) {
      yCur = THREE.MathUtils.lerp(0, +Vh, easedPhaseProgress)
      yNext = THREE.MathUtils.lerp(-Vh, 0, easedPhaseProgress)
    }

    if (curRef.current) curRef.current.position.y = yCur
    if (nextRef.current) nextRef.current.position.y = yNext
    if (prevRef.current) prevRef.current.position.y = yPrev

    const nextProgress = {
      phase,
      transitionKind,
      local,
      phaseProgress,
      holdProgress,
      isVisible: true,
    }

    const nextUi = { phase, local, phaseProgress, holdProgress, isVisible: true }

    if (!same4(lastProgressRef.current, nextProgress)) {
      lastProgressRef.current = nextProgress
      acts.setProgress(id, nextProgress)
    }

    if (!same4(lastUiRef.current, nextUi)) {
      lastUiRef.current = nextUi
      setActProgress(id, nextUi)
    }


    // -----------------------------
    // Caméra 
    // -----------------------------
    const cam = camRef.current ?? fallbackCam
    if (!cam || !baseCamPosition.current) return

  })

  // Enregistre/MAJ texture et range
  useEffect(() => {
    acts.set(id, { texture: fbo.texture, range })
    return () => acts.delete(id)
  }, [acts, id, fbo.texture, range])

  const portal = createPortal(
    <>
      {Camera ? <Camera innerRef={camRef} id={id} off={off} progress={progress} pointerRef={pointerRef} /> : null}
      {Env && <Env id={id} />}
      {Lights && <Lights id={id} />}
      <Models id={id} pointerRef={pointerRef} camRef={camRef} />
    </>,
    off
  )

  // textures voisines (si présentes)
  const next = acts.get(id + 1)?.texture
  const prev = acts.get(id - 1)?.texture

  const prog = useActsStore((s) => s.actsProgress[id])
  const showHtml = prog?.isVisible && prog?.phase === 'hold'


  return (
    <>
      {portal}

      <group ref={groupRef}>
        {prev && (
          <ScreenTexture
            ref={prevRef}
            texture={prev}
            Vw={Vw}
            Vh={Vh}
            renderOrder={997}
          />
        )}

        {next && (
          <ScreenTexture
            ref={nextRef}
            texture={next}
            Vw={Vw}
            Vh={Vh}
            renderOrder={998}
          />
        )}

        <ScreenTexture
          ref={curRef}
          texture={fbo.texture}
          Vw={Vw}
          Vh={Vh}
          renderOrder={999}
        />

        {Overlay && showHtml && (
          <Overlay />

        )}
      </group>

    </>
  )
}

const ScreenTexture = React.forwardRef(function ScreenTexture(
  { texture, y = 0, Vw, Vh, renderOrder = 999 },
  ref
) {
  return (
    <mesh
      ref={ref}
      frustumCulled={false}
      position={[0, y, 0]}
      scale={[Vw, Vh, 1]}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        premultipliedAlpha
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
})

//Gère les différentes parties du progress de chaque acte, phase de "hold", phase de sortie
function getActProgress(p, start, end, edgeFrac, { hasPrev = true, hasNext = true } = {}) {
  const local = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(p, start, end, 0, 1),
    0,
    1
  )

  const exitStartLocal = hasNext ? 0.75 : 1

  // TRANSITION de sortie (vers l'acte suivant)
  if (hasNext && local > exitStartLocal) {
    const phaseProgress = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(local, exitStartLocal, 1, 0, 1),
      0,
      1
    )
    return {
      phase: 'transition',
      transitionKind: 'exit',
      local,
      phaseProgress,
      holdProgress: 1,
    }
  }

  let holdProgress
  if (exitStartLocal <= 1e-6) {
    holdProgress = 1
  } else {
    holdProgress = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(local, 0, exitStartLocal, 0, 1),
      0,
      1
    )
  }

  return {
    phase: 'hold',
    transitionKind: null,
    local,
    phaseProgress: 1,
    holdProgress,
  }
}