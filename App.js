import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Modal, Alert, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser, login, getSession, clearSession, migrateLegacyAuth } from './src/auth';
import { saveActiveChallenge, loadActiveChallenge, clearActiveChallenge, secondsLeft } from './src/challenge';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- ECRÃ 1: LOGIN / REGISTO COM UTILIZADOR E SENHA ---
function LoginScreen({ navigation }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Carregar dados salvos ao iniciar (se já existir conta)
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      // Converte contas da versão antiga (senha em texto puro) e apaga o texto puro.
      await migrateLegacyAuth();
      const session = await getSession();
      if (session) {
        navigation.replace('MainTab', { username: session.username });
      }
    } catch (e) {
      console.log('Erro ao ler sessão', e);
    }
  };

  const handleAuth = async () => {
    if (busy) return;
    if (!username.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o nome de utilizador e a senha.');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setBusy(true);
    try {
      if (isRegistering) {
        // Registar utilizador (a senha é guardada só como hash com sal)
        await registerUser(username, password);
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
        navigation.replace('Onboarding');
      } else {
        // Fazer Login
        const result = await login(username, password);
        if (result === 'ok') {
          navigation.replace('MainTab', { username });
        } else if (result === 'invalid') {
          Alert.alert('Erro', 'Nome de utilizador ou senha incorretos.');
        } else {
          Alert.alert('Conta não encontrada', 'Nenhum utilizador registado neste dispositivo. Alterne para "Criar Conta".');
        }
      }
    } catch (e) {
      Alert.alert('Erro', 'Ocorreu um erro ao processar os dados.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}><Text style={styles.iconText}>🌳</Text></View>
        <Text style={styles.title}>Desafio 24h Offline</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? 'Crie a sua conta para começar' : 'Entre com a sua conta'}
        </Text>

        {/* Formulário de Autenticação */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Nome de Utilizador</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: antonioneto"
            placeholderTextColor="#8A9285"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#8A9285"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.primaryButton, busy && { opacity: 0.5 }]}
            onPress={handleAuth}
            disabled={busy}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? 'Aguarde...' : isRegistering ? 'Criar Conta e Entrar' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ marginTop: 12, alignItems: 'center' }} 
            onPress={() => setIsRegistering(!isRegistering)}
          >
            <Text style={{ color: '#4A5D4E', fontSize: 14, fontWeight: '500' }}>
              {isRegistering ? 'Já tem conta? Faça Login' : 'Não tem conta? Criar Conta'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>Sem atalhos para redes sociais. Preservamos a sua atenção.</Text>
      </View>
    </SafeAreaView>
  );
}

// --- ECRÃ 2: ONBOARDING ---
function OnboardingScreen({ navigation }) {
  const [screenTime, setScreenTime] = useState(null);
  const [mascot, setMascot] = useState(null);

  const times = ['< 2h', '2 - 4h', '4 - 6h', '> 6h'];
  const mascots = [
    { id: 'plant', icon: '🌿', name: 'Planta da Calma', desc: 'Cresce enquanto foca' },
    { id: 'animal', icon: '🦉', name: 'Coruja do Foco', desc: 'Desperta quando foca' }
  ];

  const isReady = screenTime && mascot;

  const handleFinishOnboarding = async () => {
    if (isReady) {
      await AsyncStorage.setItem('@user_mascot', mascot);
      navigation.replace('MainTab');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vamos conhecê-lo</Text>
        
        <Text style={styles.sectionLabel}>Quantas horas por dia passa no telemóvel?</Text>
        <View style={styles.optionsRow}>
          {times.map((item) => (
            <TouchableOpacity 
              key={item} 
              onPress={() => setScreenTime(item)}
              style={[styles.optionBadge, screenTime === item && styles.optionBadgeActive]}
            >
              <Text style={[styles.optionText, screenTime === item && styles.optionTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Escolha o seu Guardião</Text>
        <View style={styles.mascotContainer}>
          {mascots.map((m) => (
            <TouchableOpacity 
              key={m.id} 
              onPress={() => setMascot(m.id)}
              style={[styles.mascotCard, mascot === m.id && styles.mascotCardActive]}
            >
              <Text style={styles.mascotIcon}>{m.icon}</Text>
              <Text style={styles.mascotName}>{m.name}</Text>
              <Text style={styles.mascotDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, { marginTop: 40, opacity: isReady ? 1 : 0.5 }]} 
          onPress={handleFinishOnboarding}
          activeOpacity={isReady ? 0.8 : 1}
        >
          <Text style={styles.primaryButtonText}>Confirmar e Começar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ECRÃ 3A: DESAFIOS (TAB 1) ---
function ChallengesTab({ navigation }) {
  const [mascotType, setMascotType] = useState('plant');
  const [username, setUsername] = useState('Utilizador');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionTimer, setReflectionTimer] = useState(5);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const savedMascot = await AsyncStorage.getItem('@user_mascot');
    const session = await getSession();
    if (savedMascot) setMascotType(savedMascot);
    if (session) setUsername(session.username);

    // Retomar um desafio que estava em andamento quando o app foi fechado.
    try {
      const saved = await loadActiveChallenge();
      if (saved) {
        const left = secondsLeft(saved);
        if (left > 0) {
          setActiveChallenge(saved);
          setTimeLeft(left);
        } else {
          // Terminou enquanto o app estava fechado.
          await clearActiveChallenge();
          Alert.alert('Parabéns!', `Desafio "${saved.title}" concluído com sucesso!`);
        }
      }
    } catch (e) {
      console.log('Erro ao carregar desafio', e);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  const mascotIcon = mascotType === 'plant' ? '🌿' : '🦉';
  const mascotName = mascotType === 'plant' ? 'Sua Planta do Foco' : 'Sua Coruja do Foco';

  const challenges = [
    { id: '1', title: 'Fácil (1h)', duration: 3600, level: 'Fácil', desc: '1h longe das redes sociais' },
    { id: '2', title: 'Jantar sem Celular', duration: 7200, level: 'Médio', desc: '2h de refeição em família ou presença' },
    { id: '3', title: '24h Offline Completo', duration: 86400, level: 'Difícil', desc: 'Um dia inteiro de reconexão real' },
    // Só aparece em desenvolvimento (Expo Go), para testar sem esperar 1 hora.
    ...(__DEV__ ? [{ id: 'dev', title: 'Teste rápido (1 min)', duration: 60, level: 'Dev', desc: 'Visível apenas em desenvolvimento' }] : [])
  ];

  const completeChallenge = async (challenge) => {
    setShowReflectionModal(false);
    setActiveChallenge(null);
    try {
      await clearActiveChallenge();
    } catch (e) {
      console.log('Erro ao limpar desafio', e);
    }
    // No iOS, um alerta mostrado enquanto o modal ainda está saindo pode não aparecer.
    setTimeout(() => {
      Alert.alert('Parabéns!', `Desafio "${challenge.title}" concluído com sucesso!`);
    }, 600);
  };

  // O tempo restante vem sempre do relógio (horário de término salvo), então
  // não "para" quando o app vai para segundo plano: ao voltar, recalcula na hora.
  useEffect(() => {
    if (!activeChallenge) return undefined;
    let finished = false;
    const tick = () => {
      if (finished) return;
      const left = secondsLeft(activeChallenge);
      setTimeLeft(left);
      if (left === 0) {
        finished = true;
        completeChallenge(activeChallenge);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [activeChallenge]);

  useEffect(() => {
    let interval = null;
    if (showReflectionModal && reflectionTimer > 0) {
      interval = setInterval(() => setReflectionTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showReflectionModal, reflectionTimer]);

  const startChallenge = async (challenge) => {
    if (activeChallenge) return;
    try {
      const saved = await saveActiveChallenge(challenge);
      setActiveChallenge(saved);
      setTimeLeft(secondsLeft(saved));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível iniciar o desafio. Tente novamente.');
    }
  };

  const initiateCancel = () => {
    setReflectionTimer(5);
    setShowReflectionModal(true);
  };

  const confirmCancel = async () => {
    try {
      await clearActiveChallenge();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível cancelar o desafio. Tente novamente.');
      return;
    }
    setShowReflectionModal(false);
    setActiveChallenge(null);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.title}>Olá, {username} 👋</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#E28B8B', fontWeight: '600', fontSize: 13 }}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guardianCard}>
          <Text style={styles.guardianIcon}>{mascotIcon}</Text>
          <View>
            <Text style={styles.guardianTitle}>{mascotName}</Text>
            <Text style={styles.guardianStatus}>Status: Saudável / Protegido</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Catálogo de Desafios</Text>
        {challenges.map((c) => (
          <View key={c.id} style={styles.challengeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>{c.title}</Text>
              <Text style={styles.challengeDesc}>{c.desc}</Text>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={() => startChallenge(c)}>
              <Text style={styles.startButtonText}>Começar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* MODAL DO DESAFIO ATIVO */}
      <Modal visible={!!activeChallenge} animationType="slide">
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <Text style={styles.title}>{activeChallenge?.title}</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.subtitle}>Mantenha o foco. O seu guardião está crescendo!</Text>

          <View style={styles.analogBox}>
            <Text style={styles.analogTitle}>💡 Sugestão para o mundo real:</Text>
            <Text style={styles.analogText}>• Vá ler um livro físico</Text>
            <Text style={styles.analogText}>• Beba um copo de água com calma</Text>
            <Text style={styles.analogText}>• Faça um alongamento rápido</Text>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={initiateCancel}>
            <Text style={styles.cancelButtonText}>Desistir do Desafio</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* MODAL PAUSA DE REFLEXÃO */}
      <Modal visible={showReflectionModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionTimer}>{reflectionTimer}s</Text>
            <Text style={styles.reflectionTitle}>Você tem certeza?</Text>
            <Text style={styles.reflectionSubtitle}>
              Respire fundo. O que você está buscando no celular agora é realmente urgente?
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.primaryButton, { opacity: reflectionTimer > 0 ? 0.5 : 1 }]} 
                disabled={reflectionTimer > 0}
                onPress={confirmCancel}
              >
                <Text style={styles.primaryButtonText}>
                  {reflectionTimer > 0 ? `Aguarde ${reflectionTimer}s...` : 'Sim, quero desistir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => setShowReflectionModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Voltar ao Desafio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- ECRÃ 3B: DICAS DE SAÚDE (TAB 2) ---
function HealthTab() {
  const tips = [
    { id: '1', icon: '👁️', title: 'A Regra 20-20-20', description: 'A cada 20 minutos olhando para a tela, olhe para algo a 6 metros por 20 segundos.' },
    { id: '2', icon: '🌙', title: 'Luz Azul e Sono', description: 'A luz azul inibe a melatonina. Evite telas 1 hora antes de dormir.' },
    { id: '3', icon: '🧠', title: 'Desintoxicação de Dopamina', description: 'Notificações geram picos rápidos de dopamina. Pausas restauram seu foco.' },
    { id: '4', icon: '🧘', title: 'Postura e Respiração', description: 'Evite a "síndrome do pescoço de texto". Faça pausas para alongar.' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Saúde & Conscientização</Text>
        <Text style={styles.subtitle}>Pequenos conhecimentos para proteger sua mente e corpo.</Text>

        {tips.map((item) => (
          <View key={item.id} style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Text style={styles.healthIcon}>{item.icon}</Text>
              <Text style={styles.healthTitle}>{item.title}</Text>
            </View>
            <Text style={styles.healthDesc}>{item.description}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- NAVEGAÇÃO DE TABS ---
function MainTabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#4A5D4E',
        tabBarInactiveTintColor: '#8A9285',
        tabBarStyle: { backgroundColor: '#FFFFFF', paddingBottom: 6, paddingTop: 6, height: 60 }
      }}
    >
      <Tab.Screen 
        name="Desafios" 
        component={ChallengesTab} 
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text> }}
      />
      <Tab.Screen 
        name="Dicas de Saúde" 
        component={HealthTab} 
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💡</Text> }}
      />
    </Tab.Navigator>
  );
}

// --- ROTAS RAIZ ---
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTab" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8F6' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8E0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconText: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#2C352E', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7260', textAlign: 'center', marginBottom: 24 },
  
  // Form de Login
  formGroup: { width: '100%', gap: 10 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#2C352E', marginTop: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D7CE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#2C352E' },

  primaryButton: { backgroundColor: '#4A5D4E', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D7CE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#2C352E', fontSize: 14, fontWeight: '500' },
  footerNote: { fontSize: 12, color: '#8A9285', marginTop: 28, textAlign: 'center' },
  
  // Onboarding
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#2C352E', marginBottom: 16, marginTop: 16 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBadge: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#D0D7CE', backgroundColor: '#FFFFFF' },
  optionBadgeActive: { backgroundColor: '#4A5D4E', borderColor: '#4A5D4E' },
  optionText: { fontSize: 14, color: '#6B7260', fontWeight: '500' },
  optionTextActive: { color: '#FFFFFF' },
  mascotContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mascotCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D7CE', borderRadius: 16, padding: 16, alignItems: 'center' },
  mascotCardActive: { borderColor: '#4A5D4E', borderWidth: 2, backgroundColor: '#F0F4EF' },
  mascotIcon: { fontSize: 40, marginBottom: 12 },
  mascotName: { fontSize: 14, fontWeight: '600', color: '#2C352E', textAlign: 'center', marginBottom: 4 },
  mascotDesc: { fontSize: 12, color: '#8A9285', textAlign: 'center' },

  // Dashboard & Desafios
  guardianCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8E0', marginBottom: 20, gap: 16 },
  guardianIcon: { fontSize: 36 },
  guardianTitle: { fontSize: 16, fontWeight: '700', color: '#2C352E' },
  guardianStatus: { fontSize: 13, color: '#4A5D4E', marginTop: 2 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8E0', marginBottom: 12 },
  challengeTitle: { fontSize: 15, fontWeight: '600', color: '#2C352E' },
  challengeDesc: { fontSize: 12, color: '#8A9285', marginTop: 4 },
  startButton: { backgroundColor: '#4A5D4E', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  startButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Temporizador
  timerText: { fontSize: 48, fontWeight: '700', color: '#2C352E', marginVertical: 20 },
  analogBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8E0', width: '100%', marginVertical: 24 },
  analogTitle: { fontSize: 14, fontWeight: '600', color: '#2C352E', marginBottom: 8 },
  analogText: { fontSize: 13, color: '#6B7260', marginVertical: 2 },
  cancelButton: { backgroundColor: '#E28B8B', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  cancelButtonText: { color: '#FFFFFF', fontWeight: '600' },

  // Pausa de Reflexão
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  reflectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%' },
  reflectionTimer: { fontSize: 36, fontWeight: '700', color: '#2C352E', marginBottom: 8 },
  reflectionTitle: { fontSize: 18, fontWeight: '700', color: '#2C352E', marginBottom: 8 },
  reflectionSubtitle: { fontSize: 13, color: '#6B7260', textAlign: 'center', lineHeight: 18 },

  // Cartões da Tab de Saúde
  healthCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8E0', marginBottom: 14 },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  healthIcon: { fontSize: 24 },
  healthTitle: { fontSize: 16, fontWeight: '600', color: '#2C352E' },
  healthDesc: { fontSize: 13, color: '#6B7260', lineHeight: 18 }
});