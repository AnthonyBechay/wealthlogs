import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../navigation/AppNavigator';
import { loginUser } from '../../services/apiService';
import { globalStyles, commonColors, spacing, typography } from '../../constants/Styles'; // Import global styles
import Colors from '../../constants/Colors'; // Import color palette

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await loginUser({ username: username.trim(), password: password.trim() });
      if (response && response.token) {
        await login(response.token);
      } else {
        Alert.alert('Login Failed', response?.message || 'Invalid credentials or email not verified.');
      }
    } catch (error) {
      console.error('Login screen error:', error);
      let errorMessage = 'An unexpected error occurred during login.';
      if (error && error.error === 'Invalid credentials') {
        errorMessage = 'Invalid username or password.';
      } else if (error && error.error === 'Email not verified') {
        errorMessage = 'Please verify your email before logging in.';
      } else if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
    >
        <View style={styles.container}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Log in to your WealthLog account</Text>

        <TextInput
            style={globalStyles.input} // Use global style
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="default"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            placeholderTextColor={Colors.light.secondary}
        />
        <TextInput
            ref={passwordInputRef}
            style={globalStyles.input} // Use global style
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            placeholderTextColor={Colors.light.secondary}
        />
        {isLoading ? (
            <ActivityIndicator size="large" color={commonColors.primary} style={globalStyles.loader} />
        ) : (
            <TouchableOpacity style={globalStyles.button} onPress={handleLogin}>
            <Text style={globalStyles.buttonText}>Login</Text>
            </TouchableOpacity>
        )}
        <TouchableOpacity
            style={globalStyles.linkButton}
            onPress={() => !isLoading && navigation.navigate('Register')}
        >
            <Text style={globalStyles.linkButtonText}>Don't have an account? Register</Text>
        </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
};

// Local styles can override or extend global ones if needed
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: { // Overrides globalStyles.container for specific padding/justification
    ...globalStyles.centeredContainer, // Use centered container from global
    paddingHorizontal: spacing.lg, // Use spacing constant
  },
  title: { // Override globalStyles.titleText for specific margin or weight
    ...globalStyles.titleText,
    fontSize: typography.fontSizeTitle + 4, // Example: make it slightly larger
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...globalStyles.subtitleText,
    marginBottom: spacing.xl, // Use spacing constant
  },
  // Input and button styles are taken from globalStyles directly
});

export default LoginScreen;
