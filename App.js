import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// --- ECRÃ 1: LOGIN ---
function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}><Text style={styles.iconText}>🌳</Text></View>
        <Text style={styles.title}>Desafio 24h Offline</Text>
        <Text style={styles.subtitle}>Desconecte-se do digital e reconecte-se com o real.</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => navigation.navigate('Onboarding')}
          >
            <Text style={styles.primaryButtonText}>Entrar com Email</Text>
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
          onPress={() => isReady && navigation.navigate('Dashboard', { mascot })}
          activeOpacity={isReady ? 0.8 : 1}
        >
          <Text style={styles.primaryButtonText}>Confirmar e Começar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ECRÃ 3: DASHBOARD PRINCIPAL & DESAFIOS ---
function DashboardScreen({ route }) {
  const mascotType = route.params?.mascot || 'plant';
  const mascotIcon = mascotType === 'plant' ? '🌿' : '🦉';
  const mascotName = mascotType === 'plant' ? 'Sua Planta do Foco' : 'Sua Coruja do Foco';

  // Estados dos desafios
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionTimer, setReflectionTimer] = useState(5);

  const challenges = [
    { id: '1', title: 'Fácil (1h)', duration: 3600, level: 'Fácil', desc: '1h longe das redes sociais' },
    { id: '2', title: 'Jantar sem Celular', duration: 7200, level: 'Médio', desc: '2h de refeição em família ou presença' },
    { id: '3', title: '24h Offline Completo', duration: 86400, level: 'Difícil', desc: 'Um dia inteiro de reconexão real' }
  ];

  // Efeito para o temporizador do desafio
  useEffect(() => {
    let interval = null;
    if (activeChallenge && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && activeChallenge) {
      alert('Parabéns! Desafio concluído com sucesso!');
      setActiveChallenge(null);
    }
    return () => clearInterval(interval);
  }, [activeChallenge, timeLeft]);

  // Efeito para a Pausa de Reflexão (5 segundos)
  useEffect(() => {
    let interval = null;
    if (showReflectionModal && reflectionTimer > 0) {
      interval = setInterval(() => {
        setReflectionTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showReflectionModal, reflectionTimer]);

  const startChallenge = (challenge) => {
    setActiveChallenge(challenge);
    setTimeLeft(challenge.duration);
  };

  const initiateCancel = () => {
    setReflectionTimer(5);
    setShowReflectionModal(true);
  };

  const confirmCancel = () => {
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
        <Text style={styles.title}>Seu Dashboard Offline</Text>

        {/* Card do Guardião */}
        <View style={styles.guardianCard}>
          <Text style={styles.guardianIcon}>{mascotIcon}</Text>
          <View>
            <Text style={styles.guardianTitle}>{mascotName}</Text>
            <Text style={styles.guardianStatus}>Status: Saudável / Protegido</Text>
          </View>
        </View>

        {/* Lista/Catálogo de Desafios */}
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

          {/* Sugestões Analógicas */}
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

      {/* MODAL PAUSA DE REFLEXÃO (5 SEGUNDOS) */}
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

// --- CONFIGURAÇÃO DE ROTAS ---
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8F6' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8E0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  iconText: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#2C352E', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7260', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  buttonGroup: { width: '100%', gap: 12 },
  primaryButton: { backgroundColor: '#4A5D4E', paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D7CE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#2C352E', fontSize: 14, fontWeight: '500' },
  footerNote: { fontSize: 12, color: '#8A9285', marginTop: 32, textAlign: 'center' },
  
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
});