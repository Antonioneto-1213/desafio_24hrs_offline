// Persistência do desafio ativo.
//
// Em vez de contar segundos na memória (que se perde se o app fechar ou for
// para segundo plano), guardamos o HORÁRIO DE TÉRMINO do desafio. O tempo
// restante é sempre calculado a partir do relógio: o desafio continua correndo
// com o app fechado e é retomado (ou dado como concluído) na próxima abertura.

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_CHALLENGE_KEY = '@active_challenge';

function isValidChallenge(c) {
  return (
    !!c &&
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    Number.isFinite(c.duration) &&
    c.duration > 0 &&
    Number.isFinite(c.startedAt) &&
    Number.isFinite(c.endsAt) &&
    c.endsAt > c.startedAt
  );
}

// Começa um desafio: grava início e término e devolve o registro salvo.
export async function saveActiveChallenge(challenge, now = Date.now()) {
  const record = {
    id: challenge.id,
    title: challenge.title,
    duration: challenge.duration, // em segundos
    startedAt: now,
    endsAt: now + challenge.duration * 1000,
  };
  await AsyncStorage.setItem(ACTIVE_CHALLENGE_KEY, JSON.stringify(record));
  return record;
}

// Devolve o desafio salvo ou null. Um registro corrompido é descartado.
export async function loadActiveChallenge() {
  const raw = await AsyncStorage.getItem(ACTIVE_CHALLENGE_KEY);
  if (raw === null) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }
  if (isValidChallenge(parsed)) return parsed;
  await AsyncStorage.removeItem(ACTIVE_CHALLENGE_KEY);
  return null;
}

export async function clearActiveChallenge() {
  await AsyncStorage.removeItem(ACTIVE_CHALLENGE_KEY);
}

// Segundos que faltam (0 = terminou). Nunca passa da duração total: se o
// relógio do aparelho for voltado para trás, o desafio não "estica".
export function secondsLeft(challenge, now = Date.now()) {
  const left = Math.ceil((challenge.endsAt - now) / 1000);
  return Math.max(0, Math.min(challenge.duration, left));
}
