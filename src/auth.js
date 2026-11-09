// Autenticação local do Desafio 24h Offline.
//
// - A senha NUNCA é guardada: só um hash PBKDF2-HMAC-SHA256 com sal aleatório.
// - O registro (sal + hash) e a sessão ficam no SecureStore (Keychain no iOS,
//   Keystore no Android). Onde o SecureStore não existe (ex.: web), cai para o
//   AsyncStorage, que continua guardando apenas o hash.
// - Contas criadas pela versão antiga (senha em texto puro no AsyncStorage) são
//   migradas automaticamente e o texto puro é apagado.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Chaves do SecureStore só aceitam letras, números, ".", "-" e "_".
const CREDENTIALS_KEY = 'desafio.credentials';
const SESSION_KEY = 'desafio.session';

// Chaves da versão anterior (senha em texto puro).
const LEGACY_CREDENTIALS_KEY = '@user_credentials';
const LEGACY_SESSION_KEY = '@user_session';

const RECORD_VERSION = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

// O expo-crypto não tem PBKDF2 nativo: cada iteração aqui custa 2 chamadas
// nativas assíncronas (HMAC = 2 hashes). Por isso o valor é modesto. Ele fica
// gravado em cada registro, então pode ser aumentado depois: quem entrar com a
// senha correta tem o hash refeito com o novo valor (ver login()).
const PBKDF2_ITERATIONS = 1000;

// ---------- utilitários de bytes ----------

function utf8Encode(str) {
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return Uint8Array.from(out);
}

function toHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// Compara em tempo constante (não para no primeiro caractere diferente).
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ---------- PBKDF2-HMAC-SHA256 (RFC 2898 / RFC 2104) ----------

const HMAC_BLOCK = 64;

async function sha256(bytes) {
  return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
}

async function hmacPads(key) {
  const k = key.length > HMAC_BLOCK ? await sha256(key) : key;
  const ipad = new Uint8Array(HMAC_BLOCK).fill(0x36);
  const opad = new Uint8Array(HMAC_BLOCK).fill(0x5c);
  for (let i = 0; i < k.length; i++) {
    ipad[i] ^= k[i];
    opad[i] ^= k[i];
  }
  return { ipad, opad };
}

async function hmac(pads, message) {
  const inner = await sha256(concat(pads.ipad, message));
  return sha256(concat(pads.opad, inner));
}

// Exportada para os testes (comparados com o PBKDF2 do Node). Suporta até 32
// bytes de saída (um bloco do SHA-256), que é tudo de que precisamos.
export async function pbkdf2Sha256(password, salt, iterations, keyLength = HASH_BYTES) {
  if (keyLength > 32) throw new Error('pbkdf2Sha256 suporta no máximo 32 bytes');
  const pads = await hmacPads(utf8Encode(password));
  let u = await hmac(pads, concat(salt, Uint8Array.of(0, 0, 0, 1)));
  const t = Uint8Array.from(u);
  for (let i = 1; i < iterations; i++) {
    u = await hmac(pads, u);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return t.slice(0, keyLength);
}

// ---------- armazenamento (SecureStore, com plano B) ----------

async function secureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

async function readItem(key) {
  return (await secureStoreAvailable())
    ? SecureStore.getItemAsync(key)
    : AsyncStorage.getItem(key);
}

async function writeItem(key, value) {
  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function removeItem(key) {
  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// ---------- registro de credenciais ----------

async function createRecord(username, password) {
  const salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const hash = await pbkdf2Sha256(password, salt, PBKDF2_ITERATIONS, HASH_BYTES);
  return {
    v: RECORD_VERSION,
    username,
    salt: toHex(salt),
    hash: toHex(hash),
    iterations: PBKDF2_ITERATIONS,
  };
}

function isValidRecord(r) {
  return (
    !!r &&
    r.v === RECORD_VERSION &&
    typeof r.username === 'string' &&
    typeof r.salt === 'string' &&
    /^[0-9a-f]+$/.test(r.salt) &&
    r.salt.length % 2 === 0 &&
    typeof r.hash === 'string' &&
    /^[0-9a-f]+$/.test(r.hash) &&
    r.hash.length % 2 === 0 &&
    Number.isInteger(r.iterations) &&
    r.iterations > 0
  );
}

async function readRecord() {
  const raw = await readItem(CREDENTIALS_KEY);
  if (!raw) return null;
  const record = safeParse(raw);
  return isValidRecord(record) ? record : null;
}

// ---------- API pública ----------

// Cria (ou substitui) a conta deste aparelho e já abre a sessão.
export async function registerUser(username, password) {
  const record = await createRecord(username, password);
  await writeItem(CREDENTIALS_KEY, JSON.stringify(record));
  await writeItem(SESSION_KEY, JSON.stringify({ username }));
}

// Retorna 'ok' | 'invalid' (usuário ou senha errados) | 'no-account'.
// Em caso de 'ok', a sessão já fica aberta.
export async function login(username, password) {
  const record = await readRecord();
  if (!record) return 'no-account';

  // O hash é calculado mesmo com usuário errado, para o tempo de resposta
  // não revelar qual dos dois campos falhou.
  const hash = toHex(
    await pbkdf2Sha256(password, fromHex(record.salt), record.iterations, record.hash.length / 2)
  );
  const ok = safeEqual(hash, record.hash) && username === record.username;
  if (!ok) return 'invalid';

  if (record.iterations < PBKDF2_ITERATIONS) {
    try {
      const upgraded = await createRecord(record.username, password);
      await writeItem(CREDENTIALS_KEY, JSON.stringify(upgraded));
    } catch (e) {
      // Falha ao atualizar o hash não deve impedir o login.
    }
  }

  await writeItem(SESSION_KEY, JSON.stringify({ username: record.username }));
  return 'ok';
}

export async function getSession() {
  try {
    const raw = await readItem(SESSION_KEY);
    const session = raw ? safeParse(raw) : null;
    return session && typeof session.username === 'string' ? session : null;
  } catch (e) {
    return null;
  }
}

export async function clearSession() {
  await removeItem(SESSION_KEY);
}

// Move a conta da versão anterior (senha em texto puro no AsyncStorage) para o
// formato novo e apaga o texto puro. É seguro chamar várias vezes: se algo
// falhar no meio, o dado antigo só é apagado depois do novo ser gravado.
export async function migrateLegacyAuth() {
  const legacyCredentials = await AsyncStorage.getItem(LEGACY_CREDENTIALS_KEY);
  if (legacyCredentials !== null) {
    const legacy = safeParse(legacyCredentials);
    const usable = legacy && typeof legacy.username === 'string' && typeof legacy.password === 'string';
    // Se já existe uma conta no formato novo, ela vale mais que a antiga.
    if (usable && !(await readItem(CREDENTIALS_KEY))) {
      const record = await createRecord(legacy.username, legacy.password);
      await writeItem(CREDENTIALS_KEY, JSON.stringify(record));
    }
    await AsyncStorage.removeItem(LEGACY_CREDENTIALS_KEY);
  }

  const legacySession = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
  if (legacySession !== null) {
    const session = safeParse(legacySession);
    if (session && typeof session.username === 'string' && !(await readItem(SESSION_KEY))) {
      await writeItem(SESSION_KEY, JSON.stringify({ username: session.username }));
    }
    await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
  }
}
