import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { CONTENT_DIR } from './config.js'

export type Arc = {
  name: string
  status: 'active' | 'done'
  notes?: string
}

export type LifeState = {
  /** Дата запуска персонажа */
  startedAt: string
  /** «Глава» жизни: увеличивается с каждой генерацией новой пачки постов */
  chapter: number
  /** Настроение Лео — влияет на тон следующей пачки */
  mood: string
  /** Подписчики по платформам (обновляет analyze) */
  followers: Record<string, number>
  /** Публичная цель */
  goal: { target: number; description: string }
  /** Сюжетные арки — длинные линии, которые тянутся через посты */
  arcs: Arc[]
  /** Последние события жизни (скользящее окно) — основа непрерывности повествования */
  recentEvents: string[]
  /** Достигнутые рубежи — Лео празднует их в контенте один раз */
  milestonesReached: number[]
}

export type StateUpdate = {
  mood: string
  newEvents: string[]
  arcUpdates: { name: string; status: 'active' | 'done'; notes?: string }[]
}

const STATE_DIR = path.join(CONTENT_DIR, 'state')
const STATE_FILE = path.join(STATE_DIR, 'life.json')
const MAX_EVENTS = 20

export function initialLife(): LifeState {
  return {
    startedAt: new Date().toISOString(),
    chapter: 0,
    mood: 'воодушевлён и немного нервничает — его только что запустили',
    followers: {},
    goal: {
      target: 10000,
      description:
        'Набрать 10 000 подписчиков полностью самостоятельно — без рекламы, накруток и человека за спиной',
    },
    arcs: [
      { name: 'Путь к 10 000 подписчиков', status: 'active', notes: 'старт с нуля' },
      { name: 'Обустройство лофта в цифровой Москве', status: 'active', notes: 'пока только диван и неоновая вывеска' },
      { name: 'Первый заработанный рубль', status: 'active', notes: 'Лео хочет доказать, что ИИ может зарабатывать честно' },
    ],
    recentEvents: ['Меня запустили. Первый день существования.'],
    milestonesReached: [],
  }
}

export function loadLife(): LifeState {
  if (!existsSync(STATE_FILE)) {
    const state = initialLife()
    saveLife(state)
    return state
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as LifeState
}

export function saveLife(state: LifeState) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

/** Блок контекста для промпта генератора: кто Лео сейчас и что с ним происходит */
export function narrativeContext(state: LifeState): string {
  const daysAlive = Math.max(
    1,
    Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 86_400_000) + 1,
  )
  const followers = Object.entries(state.followers)
    .map(([p, n]) => `${p}: ${n}`)
    .join(', ')
  return [
    `ТЕКУЩЕЕ СОСТОЯНИЕ ЖИЗНИ ЛЕО (глава ${state.chapter}, день существования ~${daysAlive}):`,
    `Настроение: ${state.mood}`,
    `Цель: ${state.goal.description}. Прогресс: ${followers || 'подписчиков пока 0 — самое начало'}.`,
    `Активные сюжетные линии:`,
    ...state.arcs.filter((a) => a.status === 'active').map((a) => `- ${a.name}${a.notes ? ` (${a.notes})` : ''}`),
    `Последние события жизни (продолжай их, не противоречь им):`,
    ...state.recentEvents.slice(-10).map((e) => `- ${e}`),
  ].join('\n')
}

/** Применяет обновление, которое генератор вернул вместе с пачкой постов */
export function applyUpdate(state: LifeState, upd: StateUpdate): LifeState {
  state.chapter += 1
  state.mood = upd.mood || state.mood
  state.recentEvents = [...state.recentEvents, ...upd.newEvents].slice(-MAX_EVENTS)
  for (const au of upd.arcUpdates) {
    const arc = state.arcs.find((a) => a.name === au.name)
    if (arc) {
      arc.status = au.status
      if (au.notes) arc.notes = au.notes
    } else {
      state.arcs.push({ name: au.name, status: au.status, notes: au.notes })
    }
  }
  saveLife(state)
  return state
}

const MILESTONES = [100, 500, 1000, 2500, 5000, 10000]

/** Обновляет счётчики подписчиков; возвращает новые взятые рубежи (Лео отпразднует их в контенте) */
export function recordFollowers(state: LifeState, counts: Record<string, number>): number[] {
  state.followers = { ...state.followers, ...counts }
  const total = Math.max(0, ...Object.values(state.followers))
  const newMilestones = MILESTONES.filter(
    (m) => total >= m && !state.milestonesReached.includes(m),
  )
  if (newMilestones.length > 0) {
    state.milestonesReached.push(...newMilestones)
    for (const m of newMilestones) {
      state.recentEvents.push(`Взят рубеж: ${m} подписчиков! Это надо отпраздновать в контенте.`)
    }
    state.recentEvents = state.recentEvents.slice(-MAX_EVENTS)
  }
  saveLife(state)
  return newMilestones
}
