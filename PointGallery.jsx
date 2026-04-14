import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import gsap from "gsap"
import { useIsMobile } from "../utils/useIsMobile"

export default function PointGallery({ images = [] }) {
    const wrapRef = useRef(null)
    const tlRef = useRef(null)
    const rafRef = useRef(null)

    const isMobile = useIsMobile()
    const isScrollable = images.length > 3

    const displayedImages = useMemo(() => {
        if (!isScrollable) return images
        return [...images, ...images, ...images]
    }, [images, isScrollable])

    const targetX = useRef(0)
    const currentX = useRef(0)
    const isDown = useRef(false)
    const startX = useRef(0)
    const startOffset = useRef(0)

    useLayoutEffect(() => {
        const el = wrapRef.current
        if (!el) return

        const cards = el.querySelectorAll("[data-card]")
        if (!cards.length) return

        if (tlRef.current) tlRef.current.kill()

        if (!isScrollable) {
            const mid = (cards.length - 1) / 2
            const spacing = isMobile ? 160 : 280

            gsap.set(cards, {
                x: (i) => (i - mid) * spacing,
                y: 20,
                rotation: (i) => (i - mid) * -12,
                autoAlpha: 0,
                transformOrigin: "bottom center",
            })

            tlRef.current = gsap.timeline().to(cards, {
                x: (i) => (i - mid) * spacing,
                y: 0,
                rotation: (i) => (i - mid) * 6,
                autoAlpha: 1,
                duration: 0.35,
                ease: "power2.out",
                stagger: 0.06,
            })

            return
        }

        gsap.set(el, { autoAlpha: 0 })
        gsap.to(el, { autoAlpha: 1, duration: 0.3, ease: "power2.out" })
    }, [displayedImages, isScrollable, isMobile])

    useEffect(() => {
        if (!isScrollable) return

        const el = wrapRef.current
        if (!el) return

        const cards = el.querySelectorAll("[data-card]")
        if (!cards.length) return

        const cardWidth = isMobile ? 180 : 320
        const gap = isMobile ? 16 : 24
        const step = cardWidth + gap
        const total = images.length * step
        const curve = isMobile ? 35 : 70

        const mod = (n, m) => ((n % m) + m) % m

        const render = () => {
            currentX.current += (targetX.current - currentX.current) * 0.04
            cards.forEach((card, i) => {
                const index = i - images.length
                let posX = index * step + currentX.current
                posX = mod(posX + total / 2, total) - total / 2

                const normalized = posX / (total / 2)
                const posY = Math.pow(normalized, 2) * curve
                const rotate = normalized * 10
                const scale = 1 - Math.min(Math.abs(normalized) * 0.12, 0.12)
                const zIndex = 1000 - Math.round(Math.abs(posX))

                card.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotate}deg) scale(${scale})`
                card.style.zIndex = zIndex
                card.style.opacity = `${1 - Math.min(Math.abs(normalized) * 0.35, 0.35)}`
            })

            rafRef.current = requestAnimationFrame(render)
        }

        const onPointerDown = (e) => {
            isDown.current = true
            startX.current = e.clientX
            startOffset.current = targetX.current
            el.classList.add("dragging")
        }

        const onPointerMove = (e) => {
            if (!isDown.current) return
            const deltaX = e.clientX - startX.current
            targetX.current = startOffset.current + deltaX
        }

        const onPointerUp = () => {
            isDown.current = false
            el.classList.remove("dragging")
        }

        const onWheel = (e) => {
            targetX.current -= e.deltaY * 0.8
            targetX.current -= e.deltaX * 0.8
        }

        el.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
        el.addEventListener("wheel", onWheel, { passive: true })

        render()

        return () => {
            cancelAnimationFrame(rafRef.current)
            el.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onPointerMove)
            window.removeEventListener("pointerup", onPointerUp)
            el.removeEventListener("wheel", onWheel)
        }
    }, [images, isScrollable, isMobile])

    if (!images.length) return null

    return (
        <div
            ref={wrapRef}
            className={`point-gallery ${isScrollable ? "is-scrollable" : "is-fan"}`}
        >
            {displayedImages.map((img, i) => {
                const content = (
                    <div data-card className="image-container">
                        <img src={img.src} alt="" draggable={false} />
                    </div>
                )

                return (
                    <div key={img.src + i} className="image-center">
                        {img.href ? (
                            <a href={img.href} target="_blank" rel="noopener noreferrer">
                                {content}
                            </a>
                        ) : (
                            content
                        )}
                    </div>
                )
            })}
        </div>
    )
}