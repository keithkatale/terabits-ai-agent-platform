'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { AnimatePresence, motion, type Transition, type Variants } from 'motion/react'

export interface RotatingTextRef {
  next: () => void
  prev: () => void
  jumpTo: (index: number) => void
  reset: () => void
}

export interface RotatingTextProps {
  texts: string[]
  transition?: Transition
  initial?: object
  animate?: object
  exit?: object
  animatePresenceMode?: 'wait' | 'sync' | 'popLayout'
  animatePresenceInitial?: boolean
  rotationInterval?: number
  staggerDuration?: number
  staggerFrom?: 'first' | 'last' | 'center' | 'random' | number
  loop?: boolean
  auto?: boolean
  splitBy?: 'characters' | 'words' | 'lines' | string
  onNext?: (index: number) => void
  mainClassName?: string
  splitLevelClassName?: string
  elementLevelClassName?: string
  style?: CSSProperties
}

function splitIntoCharacters(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), (s) => s.segment)
  }
  return Array.from(text)
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(
  (
    {
      texts,
      transition = { type: 'spring', damping: 25, stiffness: 300 },
      initial = { y: '100%', opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: '-120%', opacity: 0 },
      animatePresenceMode = 'wait',
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = 'first',
      loop = true,
      auto = true,
      splitBy = 'characters',
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      style,
    },
    ref
  ) => {
    const [currentIndex, setCurrentIndex] = useState(0)

    const next = useCallback(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % texts.length
        if (!loop && nextIndex === 0) return prev
        onNext?.(nextIndex)
        return nextIndex
      })
    }, [loop, onNext, texts.length])

    const prev = useCallback(() => {
      setCurrentIndex((prev) => {
        const prevIndex = (prev - 1 + texts.length) % texts.length
        if (!loop && prevIndex === texts.length - 1) return prev
        return prevIndex
      })
    }, [loop, texts.length])

    const jumpTo = useCallback(
      (index: number) => {
        setCurrentIndex(index % texts.length)
      },
      [texts.length]
    )

    const reset = useCallback(() => {
      setCurrentIndex(0)
    }, [])

    useImperativeHandle(ref, () => ({ next, prev, jumpTo, reset }))

    useEffect(() => {
      if (!auto) return
      const interval = setInterval(next, rotationInterval)
      return () => clearInterval(interval)
    }, [next, auto, rotationInterval])

    const splitText = useCallback(
      (text: string) => {
        if (splitBy === 'characters') return splitIntoCharacters(text)
        if (splitBy === 'words')
          return text.split(' ').map((word, i, arr) => (i < arr.length - 1 ? word + ' ' : word))
        if (splitBy === 'lines') return text.split('\n')
        return text.split(splitBy)
      },
      [splitBy]
    )

    const getStaggerDelay = useCallback(
      (index: number, total: number) => {
        if (staggerFrom === 'first') return index * staggerDuration
        if (staggerFrom === 'last') return (total - 1 - index) * staggerDuration
        if (staggerFrom === 'center') {
          const center = Math.floor(total / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === 'random') {
          const randomIndex = Math.floor(Math.random() * total)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        return Math.abs((staggerFrom as number) - index) * staggerDuration
      },
      [staggerDuration, staggerFrom]
    )

    const elements = useMemo(
      () => splitText(texts[currentIndex]),
      [texts, currentIndex, splitText]
    )

    const getVariants = useCallback(
      (index: number): Variants => ({
        initial: {
          ...(initial as object),
          transition: {
            ...(transition as object),
            delay: getStaggerDelay(index, elements.length),
          },
        },
        animate: {
          ...(animate as object),
          transition: {
            ...(transition as object),
            delay: getStaggerDelay(index, elements.length),
          },
        },
        exit: {
          ...(exit as object),
          transition: {
            ...(transition as object),
            delay: getStaggerDelay(index, elements.length),
          },
        },
      }),
      [initial, animate, exit, transition, getStaggerDelay, elements.length]
    )

    return (
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.span
          key={currentIndex}
          className={`text-rotate ${mainClassName ?? ''}`}
          style={style}
          layout
          aria-label={texts[currentIndex]}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-rotate-sr-only">{texts[currentIndex]}</span>
          {elements.map((wordOrChar, i) => (
            <span
              className={`text-rotate-word ${splitLevelClassName ?? ''}`}
              key={i}
              aria-hidden="true"
            >
              {wordOrChar.split('').map((char, j) => (
                <span key={j} className="text-rotate-lines">
                  <motion.span
                    className={`text-rotate-element ${elementLevelClassName ?? ''}`}
                    variants={getVariants(i)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                </span>
              ))}
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    )
  }
)

RotatingText.displayName = 'RotatingText'

export default RotatingText
